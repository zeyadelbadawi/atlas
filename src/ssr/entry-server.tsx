/**
 * Server renderer for the public Academy website — the bundle entry of
 * `vite build --ssr src/ssr/entry-server.tsx`
 * (Reports/SSR_ARCHITECTURE_ANALYSIS.md).
 *
 * It renders the SAME application the browser runs (`App`, the same route
 * objects, providers, public website router, theme packs and sections) for
 * one anonymous request, so the browser can hydrate it:
 *   - a memory router at the request's URL;
 *   - a query client of its own, filled by running the page's own hooks:
 *     each render registers the public queries the page needs, those are
 *     fetched from the existing public API, and the page renders again
 *     until nothing is pending (bounded);
 *   - the i18n instance in the URL locale, with the core translations the
 *     browser also has when it hydrates.
 *
 * Nothing here can see a session: no cookie or token is forwarded to the
 * API, and the only request header passed on is the visitor's IP (for the
 * API's per-visitor rate limits). Anything unexpected → `pass`, and the
 * edge serves the unchanged single-page app.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { createMemoryRouter } from 'react-router-dom';
import {
  dehydrate,
  type DehydratedState,
  type Query,
  type QueryClient,
} from '@tanstack/react-query';
import App, { appRoutes } from '@/App';
import { preloadPublicWebsiteRouter } from '@app/routes/public-website-router-loader';
import { ENV } from '@config';
import { preloadLanguages } from '@localization';
import {
  createQueryClient,
  publicWebsiteKeys,
  setServerRequestContextProvider,
  type ServerRequestContext,
} from '@services';
import { hasConsentDecidedCookie, resolvePublicWebsiteContext } from '@utils';
import {
  classifyPublicWebsiteData,
  renderSeoHeadHtml,
  SeoHeadCollectorContext,
  type PublicWebsiteDataState,
  type UseDocumentSeoOptions,
} from '@features/public-website';
import {
  loadAllThemePacks,
  themeStylesheetLinksHtml,
  ThemePackUsageContext,
} from '@features/website';
import type {
  HostnameResolution,
  PublicWebsiteLocale,
  WebsiteConfiguration,
  WebsitePage,
  WebsiteThemeKey,
} from '@types';
import {
  buildSsrDocument,
  serializePayload,
  SSR_PAYLOAD_VERSION,
} from './ssr-document';
import {
  isServerRenderablePath,
  publicWebsiteLocaleForPath,
} from './ssr-paths';

export interface SsrRequest {
  /** Path and query, e.g. `/ar/courses?level=beginner`. */
  readonly url: string;
  /** The request's Host header (port allowed). */
  readonly host: string;
  readonly protocol: 'http' | 'https';
  readonly cookieHeader?: string;
  /** The visitor's IP as the edge saw it (`X-Real-IP`), forwarded to the API. */
  readonly clientIp?: string;
}

export interface SsrCache {
  get(key: string): string | undefined;
  set(key: string, html: string): void;
}

export interface SsrOptions {
  /** The client build's `index.html`. */
  readonly template: string;
  /** Preload tags for every page (may be empty). */
  readonly preloadHtml: string;
  /** Preload tags for pages in one locale only (e.g. that script's fonts). */
  readonly localePreloadHtml?: Partial<Record<PublicWebsiteLocale, string>>;
  /** Where the public API is reachable from the renderer, e.g. `http://backend:3000`. */
  readonly apiOrigin: string;
  /** Per API call. */
  readonly apiTimeoutMs: number;
  /** The largest API response accepted (bytes); a larger one passes the page. */
  readonly maxResponseBytes?: number;
  readonly cache?: SsrCache;
  /** Render passes before giving up (each fetches one wave of queries). */
  readonly maxPasses?: number;
}

export type SsrOutcome = 'ready' | 'unpublished';

export type SsrResult =
  | {
      readonly kind: 'html';
      readonly html: string;
      readonly outcome: SsrOutcome;
      readonly cache: 'hit' | 'miss' | 'bypass';
      readonly cacheKey?: string;
    }
  | { readonly kind: 'pass'; readonly reason: string };

const requestContext = new AsyncLocalStorage<ServerRequestContext>();
setServerRequestContextProvider(() => requestContext.getStore());

const pass = (reason: string): SsrResult => ({ kind: 'pass', reason });

/**
 * Every theme pack, loaded once per process: a page renders its theme
 * directly, never behind a Suspense boundary or a loading state, exactly
 * as the browser hydrates it (it loads the page's themes first). Static
 * code, so sharing it across requests shares no request data.
 */
let themePacksLoaded: Promise<void> | undefined;
function loadThemePacksOnce(): Promise<void> {
  themePacksLoaded ??= loadAllThemePacks().catch((error: unknown) => {
    themePacksLoaded = undefined;
    throw error;
  });
  return themePacksLoaded;
}

/** Host without port, lowercased, no trailing dot. */
function hostnameOf(host: string): string {
  const withoutPort = host.startsWith('[')
    ? host.slice(0, host.indexOf(']') + 1)
    : host.split(':')[0];
  return withoutPort.trim().toLowerCase().replace(/\.$/, '');
}

function isEnabled(query: Query): boolean {
  const enabled = (query.options as { enabled?: unknown }).enabled;
  if (typeof enabled === 'function') {
    return (enabled as (q: Query) => boolean)(query) !== false;
  }
  return enabled !== false;
}

function isPublicWebsiteQuery(query: Query): boolean {
  return query.queryKey[0] === publicWebsiteKeys.all[0];
}

function isNotFoundError(error: unknown): boolean {
  const apiError = error as { kind?: unknown; status?: unknown } | null;
  return apiError?.kind === 'notFound' || apiError?.status === 404;
}

/** Renders the tree to a complete HTML string (all Suspense boundaries resolved). */
function renderToHtml(
  element: JSX.Element,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    let failed: unknown;
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => {
      if (failed) reject(failed);
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });
    const { pipe, abort } = renderToPipeableStream(element, {
      onAllReady() {
        clearTimeout(timer);
        pipe(stream);
      },
      onShellError(error) {
        clearTimeout(timer);
        reject(error);
      },
      onError(error) {
        // An error inside a Suspense boundary would otherwise be rendered
        // as that boundary's fallback: never serve that — pass instead.
        failed ??= error;
      },
    });
    const timer = setTimeout(() => {
      abort();
      reject(new Error('render timed out'));
    }, timeoutMs);
  });
}

function queryState<T>(client: QueryClient, key: readonly unknown[]) {
  const query = client.getQueryCache().find({ queryKey: key, exact: true });
  const state = query?.state;
  return {
    isLoading: !state || state.status === 'pending',
    isError: state?.status === 'error',
    error: state?.error ?? null,
    data: state?.data as T | undefined,
  };
}

function classify(
  client: QueryClient,
  lookupKey: string
): PublicWebsiteDataState {
  const hostname = queryState<HostnameResolution | null>(
    client,
    publicWebsiteKeys.hostnameResolution(lookupKey)
  );
  const academyId = hostname.data?.academyId;
  return classifyPublicWebsiteData({
    hostname,
    config: queryState<WebsiteConfiguration>(
      client,
      publicWebsiteKeys.configuration(academyId)
    ),
    pages: queryState<readonly WebsitePage[]>(
      client,
      publicWebsiteKeys.pages(academyId)
    ),
  });
}

/** Only the public queries the page read, successful or "not found". */
function dehydratePublicQueries(client: QueryClient): DehydratedState {
  const state = dehydrate(client, {
    shouldDehydrateQuery: (query) =>
      isPublicWebsiteQuery(query) &&
      (query.state.status === 'success' ||
        (query.state.status === 'error' && isNotFoundError(query.state.error))),
  });
  // An error travels as its plain classification only.
  return {
    ...state,
    queries: state.queries.map((query) =>
      query.state.status === 'error'
        ? {
            ...query,
            state: {
              ...query.state,
              error: {
                kind: 'notFound',
                status: 404,
                messageKey: 'errors:notFound.description',
                retryable: false,
              } as unknown as Error,
            },
          }
        : query
    ),
  };
}

export async function renderPublicWebsitePage(
  request: SsrRequest,
  options: SsrOptions
): Promise<SsrResult> {
  const url = new URL(request.url, 'http://ssr.invalid');
  const hostname = hostnameOf(request.host);
  const context = resolvePublicWebsiteContext(
    hostname,
    url.search,
    ENV.platformBaseDomain,
    ENV.isDevelopment
  );
  if (context.mode !== 'academy-website') return pass('not an Academy host');
  if (!isServerRenderablePath(url.pathname, url.search)) {
    return pass('not a public page');
  }

  const lookupKey =
    context.lookupType === 'dev-override' ? context.value : hostname;
  const locale = publicWebsiteLocaleForPath(url.pathname);
  const consentDecided = hasConsentDecidedCookie(request.cookieHeader);
  const renderYear = new Date().getUTCFullYear();

  const origin = `${request.protocol}://${request.host}`;
  // Set when the API refused a response for exceeding the page budget: the
  // page would be over budget too, so it passes before rendering further.
  let responseTooLarge = false;
  const apiContext: ServerRequestContext = {
    apiOrigin: options.apiOrigin,
    timeoutMs: options.apiTimeoutMs,
    maxResponseBytes: options.maxResponseBytes,
    onResponseTooLarge: () => {
      responseTooLarge = true;
    },
    headers: {
      ...(request.clientIp ? { 'X-Real-IP': request.clientIp } : {}),
      'X-Atlas-SSR': '1',
    },
  };

  // The browser hydrates with the core translations of the URL locale
  // (`main.tsx`); the server renders with exactly those.
  await preloadLanguages([locale], 'core');
  // Rendered directly, without a Suspense boundary, exactly as the browser
  // hydrates it (`preloadPublicWebsiteRouter`).
  await preloadPublicWebsiteRouter();
  await loadThemePacksOnce();

  const queryClient = createQueryClient(() => undefined);
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: {
      ...queryClient.getDefaultOptions().queries,
      retry: false,
      // No garbage-collection timers: the app's `gcTime` would keep every
      // request's cache alive (and a timer pending) long after the
      // response. This client lives for one request and is cleared below.
      gcTime: Infinity,
    },
  });
  // "Not found" renders as that error (Coming Soon), exactly as the
  // browser hydrates it (`QueryProvider`), not as a pending retry.
  queryClient.setQueryDefaults(publicWebsiteKeys.all, { retryOnMount: false });
  const seoCollector: { current: UseDocumentSeoOptions | null } = {
    current: null,
  };
  const snapshot = { renderYear, consentDecided };
  // The themes the page renders (each `ThemePackGate` adds its own),
  // collected afresh on every pass: their stylesheets go in the head and
  // their keys to the browser, which loads those packs before hydrating.
  const themePackUsage = new Set<WebsiteThemeKey>();

  const element = (
    <SeoHeadCollectorContext.Provider value={seoCollector}>
      <ThemePackUsageContext.Provider value={themePackUsage}>
        <App
          router={createMemoryRouter(appRoutes, {
            initialEntries: [`${url.pathname}${url.search}`],
          })}
          requestLocation={{ hostname, origin, search: url.search }}
          hydrationSnapshot={snapshot}
          initialLanguage={locale}
          queryClient={queryClient}
        />
      </ThemePackUsageContext.Provider>
    </SeoHeadCollectorContext.Provider>
  );

  const maxPasses = options.maxPasses ?? 6;
  let cacheKey: string | undefined;

  return requestContext.run(apiContext, async () => {
    try {
      return await renderPasses();
    } finally {
      queryClient.clear();
    }
  });

  async function renderPasses(): Promise<SsrResult> {
    for (let passIndex = 0; passIndex < maxPasses; passIndex += 1) {
      let appHtml: string;
      themePackUsage.clear();
      try {
        appHtml = await renderToHtml(element, 5_000);
      } catch (error) {
        return pass(`render failed: ${(error as Error).message}`);
      }

      if (responseTooLarge) return pass('api response over budget');
      const state = classify(queryClient, lookupKey);
      if (state.status === 'not-found' || state.status === 'unavailable') {
        return pass(state.status);
      }

      if (
        !cacheKey &&
        (state.status === 'ready' || state.status === 'unpublished')
      ) {
        const version =
          state.status === 'ready'
            ? String(state.configuration.configVersion)
            : 'unpublished';
        cacheKey = [
          // The full origin, port and protocol included: they reach the
          // page (canonical and social URLs), so one request's Host must
          // never shape the HTML cached for another's.
          origin.toLowerCase(),
          state.academy.academyId,
          version,
          locale,
          url.pathname,
          url.search,
          consentDecided ? 'decided' : 'undecided',
        ].join('|');
        const cached = options.cache?.get(cacheKey);
        if (cached) {
          return {
            kind: 'html',
            html: cached,
            outcome: state.status,
            cache: 'hit',
            cacheKey,
          };
        }
      }

      const pending = queryClient
        .getQueryCache()
        .getAll()
        .filter(
          (query) =>
            isPublicWebsiteQuery(query) &&
            query.state.status === 'pending' &&
            query.state.fetchStatus === 'idle' &&
            isEnabled(query)
        );

      if (pending.length > 0) {
        await Promise.all(
          pending.map((query) => query.fetch().catch(() => undefined))
        );
        continue;
      }

      if (state.status !== 'ready' && state.status !== 'unpublished') {
        return pass(`unexpected state ${state.status}`);
      }
      // A public query that failed (other than "not found") would not be
      // hydrated, so the page would not match in the browser.
      const failedQuery = queryClient
        .getQueryCache()
        .getAll()
        .find(
          (query) =>
            isPublicWebsiteQuery(query) &&
            query.state.status === 'error' &&
            !isNotFoundError(query.state.error)
        );
      if (failedQuery) return pass('a public query failed');

      const html = buildSsrDocument(options.template, {
        locale,
        direction: locale === 'ar' ? 'rtl' : 'ltr',
        headHtml: seoCollector.current
          ? renderSeoHeadHtml(seoCollector.current)
          : '',
        preloadHtml:
          options.preloadHtml + (options.localePreloadHtml?.[locale] ?? ''),
        themeStylesheetHtml: themeStylesheetLinksHtml(themePackUsage),
        appHtml,
        payloadJson: serializePayload({
          v: SSR_PAYLOAD_VERSION,
          locale,
          renderYear,
          consentDecided,
          themePacks: [...themePackUsage],
          queries: dehydratePublicQueries(queryClient),
        }),
      });
      if (cacheKey) options.cache?.set(cacheKey, html);
      return {
        kind: 'html',
        html,
        outcome: state.status,
        cache: cacheKey && options.cache ? 'miss' : 'bypass',
        cacheKey,
      };
    }
    return pass('too many render passes');
  }
}
