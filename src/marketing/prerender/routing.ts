/**
 * Which response the platform host gives a request, for the static
 * marketing site — the same decision the Caddyfile makes (apex block,
 * `@marketing_*` matchers), written once in TypeScript so the Vite dev and
 * preview servers behave like production and the rules are unit-tested.
 *
 * Imported by `vite.config.ts`: no path aliases, no browser APIs.
 *
 * Evaluated in order (SPEC §E.4):
 *   1. root files (`/robots.txt`, `/sitemap.xml`, `/sitemaps/*`, `/llms.txt`,
 *      `/llms-full.txt`, `/pricing.md`) → the file, or a real 404;
 *   2. a trailing slash on a page URL → one 301 to the slash-less URL
 *      (query kept);
 *   3. a page URL → its prerendered `index.html`;
 *   4. retired URLs (`/blog*`) and any other `/ar/...` → the branded 404
 *      page with status 404;
 *   5. anything else → not ours (the single-page app answers).
 */

/**
 * The five product pages (M1b, B2). Planned in B1 and answered with a
 * genuine 404 then (SPEC §B.1, F-12); published now, so they are ordinary
 * prerendered pages, in the sitemap and linked from the header and footer.
 */
export const MARKETING_PRODUCT_PATHS = [
  '/features/academy-website',
  '/features/payments',
  '/features/content-protection',
  '/features/teams-and-academies',
  '/features/quizzes-and-certificates',
] as const;

/** Paths under the platform host that answer with the branded 404 page. */
export function isMarketingGonePath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  const unprefixed =
    path === '/ar' ? '/' : path.startsWith('/ar/') ? path.slice(3) : path;
  return unprefixed === '/blog' || unprefixed.startsWith('/blog/');
}

/** Root files of the platform host, served from `dist/marketing/`. */
export const MARKETING_ROOT_FILES = [
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
  '/llms-full.txt',
  '/pricing.md',
] as const;
export const MARKETING_SITEMAPS_PREFIX = '/sitemaps/';

export function isMarketingRootFile(pathname: string): boolean {
  return (
    (MARKETING_ROOT_FILES as readonly string[]).includes(pathname) ||
    (pathname.startsWith(MARKETING_SITEMAPS_PREFIX) &&
      pathname.endsWith('.xml'))
  );
}

export const MARKETING_404_FILE = {
  en: '404.html',
  ar: 'ar/404.html',
} as const;

/** The output file a page path is served from (`/` → `index.html`, `/ar/pricing` → `ar/pricing/index.html`). */
export function marketingFileForPath(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed ? `${trimmed}/index.html` : 'index.html';
}

export function contentTypeFor(file: string): string {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.xml')) return 'application/xml; charset=utf-8';
  if (file.endsWith('.md')) return 'text/markdown; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

export type MarketingRoute =
  | { readonly kind: 'file'; readonly file: string; readonly status: 200 }
  | {
      readonly kind: 'redirect';
      readonly location: string;
      readonly status: 301;
    }
  | {
      readonly kind: 'notFound';
      readonly file: string | null;
      readonly status: 404;
    };

/**
 * @param pathname the decoded request path
 * @param search   the query string including `?`, or ''
 * @param exists   whether a file exists under `dist/marketing/` (relative path)
 */
export function resolveMarketingRequest(
  pathname: string,
  search: string,
  exists: (file: string) => boolean
): MarketingRoute | null {
  if (!pathname.startsWith('/') || pathname.split('/').includes('..'))
    return null;

  if (isMarketingRootFile(pathname)) {
    const file = pathname.slice(1);
    return exists(file)
      ? { kind: 'file', file, status: 200 }
      : { kind: 'notFound', file: null, status: 404 };
  }

  if (pathname !== '/' && pathname.endsWith('/')) {
    const stripped = pathname.replace(/\/+$/, '') || '/';
    if (exists(marketingFileForPath(stripped))) {
      return {
        kind: 'redirect',
        location: `${stripped}${search}`,
        status: 301,
      };
    }
  }

  if (!pathname.endsWith('/') || pathname === '/') {
    const file = marketingFileForPath(pathname);
    if (exists(file)) return { kind: 'file', file, status: 200 };
  }

  if (isMarketingGonePath(pathname) && exists(MARKETING_404_FILE.en)) {
    const ar = pathname === '/ar' || pathname.startsWith('/ar/');
    const file =
      ar && exists(MARKETING_404_FILE.ar)
        ? MARKETING_404_FILE.ar
        : MARKETING_404_FILE.en;
    return { kind: 'notFound', file, status: 404 };
  }
  if (pathname.startsWith('/ar/') && exists(MARKETING_404_FILE.ar)) {
    return { kind: 'notFound', file: MARKETING_404_FILE.ar, status: 404 };
  }
  return null;
}
