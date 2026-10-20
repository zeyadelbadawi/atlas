/**
 * Vite plugin: the static marketing site on the dev and preview servers,
 * routed exactly as the Caddyfile routes it on the platform host
 * (`routing.ts`), so `/`, `/pricing`, `/ar`… behave locally as in
 * production and the SPA's `StaticMarketingRedirect` has a page to reach.
 *
 *   vite preview  serves the built files in `dist/marketing/` (run
 *                 `pnpm build` first). Nothing built → the app answers.
 *   vite (dev)    renders the registry live from source on each request
 *                 (`ssrLoadModule`), with the dev client script and
 *                 stylesheet; plans from the committed snapshot unless
 *                 MARKETING_PLANS_URL is set (dev is not a build).
 *
 * Only for the platform host as the dev servers see it (`localhost`, an IP,
 * or the site's own host) and never with the academy preview selector
 * (`?__atlas_academy_preview=`): academy websites are untouched.
 *
 * Imported by `vite.config.ts`: relative imports only, no path aliases.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';
import {
  contentTypeFor,
  isMarketingRootFile,
  resolveMarketingRequest,
  type MarketingRoute,
} from './routing';

const DEV_THEME_SCRIPT_PATH = '/__atlas_marketing/theme.js';
const ACADEMY_PREVIEW_PARAM = '__atlas_academy_preview';
const ENTRY = '/src/marketing/prerender/entry.tsx';

/** Hosts the dev/preview servers treat as the platform host. */
export function isPlatformDevHost(
  hostHeader: string | undefined,
  siteUrl: string
): boolean {
  const host = (hostHeader ?? '').toLowerCase().replace(/:\d+$/, '');
  if (!host) return true;
  if (
    host === 'localhost' ||
    host === '[::1]' ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host)
  )
    return true;
  try {
    const site = new URL(siteUrl).hostname.toLowerCase();
    return host === site || host === `www.${site}`;
  } catch {
    return false;
  }
}

/** Requests worth routing: page-shaped paths and the root files. */
function candidatePath(pathname: string): boolean {
  if (isMarketingRootFile(pathname)) return true;
  if (/^\/(@|src\/|node_modules\/|__|assets\/|theme-assets\/)/.test(pathname))
    return false;
  return !/\.[a-z0-9]+$/i.test(pathname);
}

function parse(
  req: IncomingMessage
): { pathname: string; search: string } | null {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.searchParams.has(ACADEMY_PREVIEW_PARAM)) return null;
    return { pathname: decodeURIComponent(url.pathname), search: url.search };
  } catch {
    return null;
  }
}

function send(
  req: IncomingMessage,
  res: ServerResponse,
  route: MarketingRoute,
  read: (file: string) => string | Buffer | undefined
): void {
  if (route.kind === 'redirect') {
    res.statusCode = 301;
    res.setHeader('Location', route.location);
    res.end();
    return;
  }
  const body = route.file ? read(route.file) : undefined;
  res.statusCode = route.status;
  res.setHeader('Content-Type', contentTypeFor(route.file ?? 'x.txt'));
  res.setHeader('Cache-Control', 'no-cache');
  res.end(req.method === 'HEAD' ? undefined : (body ?? 'Not Found'));
}

type Next = (error?: unknown) => void;

interface DevSiteModule {
  readonly MARKETING_PAGES: readonly unknown[];
  readonly MARKETING_THEME_SCRIPT: string;
  readonly buildMarketingSite: (input: unknown) => {
    files: readonly { path: string; contents: string }[];
  };
  readonly marketingLlmsCopy: (plans: unknown[]) => unknown;
  readonly loadPlans: (
    options: unknown
  ) => Promise<{ plans: unknown[]; source: string }>;
}

export function atlasMarketingStatic(options: {
  root: string;
  siteUrl: string;
}): Plugin {
  const distMarketing = path.join(options.root, 'dist', 'marketing');
  const snapshotFile = path.join(
    options.root,
    'src/marketing/data/plans.snapshot.json'
  );
  let plans: Promise<unknown[]> | undefined;

  const devPlans = (site: DevSiteModule): Promise<unknown[]> => {
    plans ??= process.env.MARKETING_PLANS_URL
      ? site
          .loadPlans({
            url: process.env.MARKETING_PLANS_URL,
            allowSnapshot: true,
            readSnapshot: () =>
              JSON.parse(fs.readFileSync(snapshotFile, 'utf8')),
            fetch: globalThis.fetch,
          })
          .then((loaded) => loaded.plans)
      : Promise.resolve(
          JSON.parse(fs.readFileSync(snapshotFile, 'utf8')) as unknown[]
        );
    return plans;
  };

  return {
    name: 'atlas:marketing-static',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        (req: IncomingMessage, res: ServerResponse, next: Next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') return next();
          const parsed = parse(req);
          if (!parsed || !isPlatformDevHost(req.headers.host, options.siteUrl))
            return next();
          if (
            parsed.pathname !== DEV_THEME_SCRIPT_PATH &&
            !candidatePath(parsed.pathname)
          ) {
            return next();
          }
          void (async () => {
            const site = (await server.ssrLoadModule(
              ENTRY
            )) as unknown as DevSiteModule;
            if (parsed.pathname === DEV_THEME_SCRIPT_PATH) {
              res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
              res.end(site.MARKETING_THEME_SCRIPT);
              return;
            }
            if (site.MARKETING_PAGES.length === 0) return next();
            const devPlanList = await devPlans(site);
            const built = site.buildMarketingSite({
              pages: site.MARKETING_PAGES,
              ctx: {
                plans: devPlanList,
                siteUrl: options.siteUrl,
                buildDate: new Date().toISOString().slice(0, 10),
              },
              assets: {
                stylesheets: ['/src/marketing/styles/marketing.css'],
                moduleScripts: [
                  '/@vite/client',
                  '/src/marketing/client/main.ts',
                ],
                modulePreloads: [],
                themeScript: DEV_THEME_SCRIPT_PATH,
                fontPreloads: { en: [], ar: [] },
              },
              llms: site.marketingLlmsCopy(devPlanList),
            });
            const files = new Map(
              built.files.map((file) => [file.path, file.contents])
            );
            const route = resolveMarketingRequest(
              parsed.pathname,
              parsed.search,
              (file) => files.has(file)
            );
            if (!route) return next();
            send(req, res, route, (file) => files.get(file));
          })().catch((error: unknown) => {
            if (error instanceof Error) server.ssrFixStacktrace(error);
            server.config.logger.error(
              `[marketing] dev render failed for ${parsed.pathname}: ${
                error instanceof Error
                  ? (error.stack ?? error.message)
                  : String(error)
              }`
            );
            next();
          });
        }
      );
    },
    configurePreviewServer(server) {
      server.middlewares.use(
        (req: IncomingMessage, res: ServerResponse, next: Next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') return next();
          const parsed = parse(req);
          if (!parsed || !isPlatformDevHost(req.headers.host, options.siteUrl))
            return next();
          if (!candidatePath(parsed.pathname) && !parsed.pathname.endsWith('/'))
            return next();
          const fileIn = (file: string) => path.join(distMarketing, file);
          const route = resolveMarketingRequest(
            parsed.pathname,
            parsed.search,
            (file) => {
              try {
                return fs.statSync(fileIn(file)).isFile();
              } catch {
                return false;
              }
            }
          );
          if (!route) return next();
          send(req, res, route, (file) => fs.readFileSync(fileIn(file)));
        }
      );
    },
  };
}
