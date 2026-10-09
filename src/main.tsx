/**
 * Application entry point.
 *
 * Responsible for one thing only: loading runtime configuration and mounting the
 * React tree. Console logging is deliberately absent — the Atlas Constitution
 * forbids console statements in production code, and configuration failures are
 * handled by falling back to compiled defaults rather than by logging.
 */
import { startTransition } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import type { DehydratedState } from '@tanstack/react-query';
import App from './App.tsx';
// Theme stylesheets are not imported here: each theme pack's CSS is its
// own file, linked in front of this entry's stylesheet only where that
// theme renders (`features/website/theme-packs/theme-stylesheets.ts`).
import './features/website/brand-studio/brand-studio.css';
import './index.css';
import { loadRuntimeConfig } from './lib/config.ts';
import { completeLoadedLanguages, preloadLanguages } from '@localization';
import { ENV } from '@config';
import { startPublicWebsitePrefetch } from '@services';
import { getCurrentPublicWebsiteContext, publicWebsiteLookupKey } from '@utils';
import { languagesForFirstRender } from './app/providers/localization/initial-language';
import {
  SSR_PAYLOAD_ELEMENT_ID,
  SSR_PAYLOAD_VERSION,
  type SsrPayload,
} from './ssr/ssr-document';
import { publicWebsiteLocaleForPath } from './ssr/ssr-paths';
import { preloadPublicWebsiteRouter } from './app/routes/public-website-router-loader';
import { isKnownThemeKey, loadThemePack } from '@features/website';
import { reloadOnceForNewVersion } from '@utils/lazy-with-retry.utils';
import {
  academyScope,
  configureOfflineScope,
  installJitteredOnlineManager,
  setUpAppShell,
} from '@services/offline';

/** Id of the mount node declared in `index.html`. */
const ROOT_ELEMENT_ID = 'root';

/*
  Stale-tab recovery — a stylesheet or module that Vite PRELOADS for a route
  failed (a tab left open across a deploy asks for files the new build no
  longer has). Reload once into the current build, at the URL the person
  navigated to; `reloadOnceForNewVersion` guards against a loop and does
  nothing offline. Not prevented when no reload starts: the import then
  fails and the error boundary explains.
*/
// Local-first dashboard — spread the refetch burst that follows a reconnect
// (see `installJitteredOnlineManager`).
installJitteredOnlineManager();

window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewVersion()) event.preventDefault();
});

/**
 * True for prerendered blog pages.
 *
 * Those pages are served as self-contained static HTML for crawlers, so React
 * must not mount over them and replace the indexable markup.
 */
function isPrerenderedStaticPage(): boolean {
  return (
    document
      .querySelector('meta[name="prerender-static-page"]')
      ?.getAttribute('content') === 'blog'
  );
}

/**
 * The data a server-rendered public page was rendered with
 * (Reports/SSR_ARCHITECTURE_ANALYSIS.md §5), or null for every other page
 * — which then mounts exactly as before.
 */
function readSsrPayload(): SsrPayload | null {
  const element = document.getElementById(SSR_PAYLOAD_ELEMENT_ID);
  if (!element?.textContent) return null;
  try {
    const payload = JSON.parse(element.textContent) as SsrPayload;
    return payload.v === SSR_PAYLOAD_VERSION ? payload : null;
  } catch {
    return null;
  }
}

async function initializeApp(): Promise<void> {
  if (isPrerenderedStaticPage()) return;

  try {
    await loadRuntimeConfig();
  } catch {
    // A missing or malformed runtime config must never block startup: the
    // configuration layer already falls back to its compiled defaults.
  }

  // On an Academy website, start its code and its data now, in parallel
  // with the translations, instead of one after another once the app has
  // rendered (Reports/LCP_ROOT_CAUSE.md, fix B). The route's own lazy()
  // import and data hooks pick these up.
  const websiteContext = getCurrentPublicWebsiteContext(
    ENV.platformBaseDomain,
    ENV.isDevelopment
  );
  const isAcademyWebsite = websiteContext.mode === 'academy-website';
  // Local-first — this page's offline store is its surface's own: the
  // dashboard's, or this academy's (never another academy's, even on a
  // shared development host). Set before anything reads the store.
  if (websiteContext.mode === 'academy-website') {
    configureOfflineScope(academyScope(publicWebsiteLookupKey(websiteContext)));
  }
  // The app shell loads without a connection, on the dashboard and on every
  // Academy website — each on its own origin, with its own worker
  // (`app-shell.ts`).
  setUpAppShell({
    surface: isAcademyWebsite ? 'academy' : 'platform',
    isProductionBuild: import.meta.env.PROD,
    enabled: import.meta.env.VITE_OFFLINE_SHELL !== 'off',
  });
  // A server-rendered page brings its data; only then is it hydrated.
  const ssr = isAcademyWebsite ? readSsrPayload() : null;
  // An Academy website renders in its URL locale from the first render
  // (server and browser alike); the dashboard keeps the preference.
  const urlLocale = publicWebsiteLocaleForPath(window.location.pathname);

  const routerChunk = isAcademyWebsite
    ? preloadPublicWebsiteRouter().catch(() => undefined)
    : undefined;
  // The theme pack(s) the server rendered the page with (code and
  // stylesheet), so hydration renders exactly what the server did.
  const themePacks = ssr
    ? Promise.all((ssr.themePacks ?? []).map(loadThemePack)).catch(
        () => undefined
      )
    : undefined;
  if (isAcademyWebsite && !ssr) {
    startPublicWebsitePrefetch(publicWebsiteLookupKey(websiteContext), {
      // Not server-rendered: start the Academy's theme pack as soon as
      // its hostname lookup names it, alongside its data.
      onResolved(resolution) {
        const themeKey = resolution.presentation?.themeKey;
        if (isKnownThemeKey(themeKey))
          loadThemePack(themeKey).catch(() => undefined);
      },
    });
  }

  try {
    // Only the language(s) this page shows are downloaded (P-2); load them
    // before mounting so nothing renders untranslated.
    await preloadLanguages(
      isAcademyWebsite
        ? [urlLocale]
        : languagesForFirstRender(window.location.pathname),
      // An Academy website renders with its core namespaces; the rest
      // follows after the first render (Reports/LCP_ROOT_CAUSE.md, fix D).
      isAcademyWebsite ? 'core' : 'full'
    );
  } catch {
    // A failed chunk load must not block startup; the provider retries
    // when it applies the language.
  }

  const rootElement = document.getElementById(ROOT_ELEMENT_ID);
  if (!rootElement) return;

  if (ssr && rootElement.hasChildNodes()) {
    // The route's code and theme first, so hydration does not wait on them.
    await Promise.all([routerChunk, themePacks]);
    // In a transition, hydration is time-sliced: React 18 otherwise
    // hydrates the whole page in one blocking task. The page is already
    // painted from the server, so nothing waits on it visually.
    startTransition(() => {
      hydrateRoot(
        rootElement,
        <App
          initialLanguage={ssr.locale}
          dehydratedState={ssr.queries as DehydratedState}
          hydrationSnapshot={{
            renderYear: ssr.renderYear,
            consentDecided: ssr.consentDecided,
          }}
        />,
        {
          // React recovers from a mismatch by rendering that part again in
          // the browser. Still correct for the visitor, but a defect: mark
          // it where the SSR tests look, and keep React's own reporting.
          onRecoverableError(error) {
            rootElement.dataset.hydrationRecovered = 'true';
            if (typeof window.reportError === 'function')
              window.reportError(error);
          },
        }
      );
    });
  } else {
    createRoot(rootElement).render(
      <App initialLanguage={isAcademyWebsite ? urlLocale : undefined} />
    );
  }

  // Real-user monitoring (P6): off unless the build sets a sample rate.
  // When on, a small module loads after the first render, and only sampled
  // visits download the measuring library.
  if (ENV.rumSampleRate > 0) {
    const surface = websiteContext.mode;
    void import('./lib/rum/rum').then(({ startRum }) =>
      startRum({
        sampleRate: ENV.rumSampleRate,
        apiBaseUrl: ENV.apiBaseUrl,
        surface,
      })
    );
  }

  if (websiteContext.mode === 'academy-website') {
    // The rest of the translations, once the page has painted.
    const completeTranslations = () => void completeLoadedLanguages();
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(completeTranslations, { timeout: 2000 });
    } else {
      setTimeout(completeTranslations, 1);
    }
  }
}

void initializeApp();
