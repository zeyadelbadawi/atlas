/**
 * Which requests the public-website server renderer takes, and in which
 * locale (Reports/SSR_ARCHITECTURE_ANALYSIS.md §3, §5).
 *
 * Only anonymous public pages are rendered on the server. Everything a
 * visitor signs in to, and everything that is not a page, is PASSED: the
 * edge then serves the unchanged single-page app, exactly as today.
 */
import type { PublicWebsiteLocale } from '@types';

/**
 * First path segments (after an optional `/ar`) that are never server
 * rendered: authentication, the learner area, certificate verification,
 * the retired learner paths that redirect, and machine-readable routes.
 */
const PASS_SEGMENTS: ReadonlySet<string> = new Set([
  'sign-in',
  'sign-up',
  'forgot-password',
  'reset-password',
  'auth',
  'verify-email',
  'verify',
  'my',
  'my-learning',
  'my-account',
  'robots.txt',
  'sitemap.xml',
]);

/** Query parameters that mark a request as something other than a page view. */
const PASS_QUERY_PARAMS: readonly string[] = ['__atlas_probe'];

/** The public website's locale for a path: `/ar` and `/ar/...` are Arabic. */
export function publicWebsiteLocaleForPath(
  pathname: string
): PublicWebsiteLocale {
  return pathname === '/ar' || pathname.startsWith('/ar/') ? 'ar' : 'en';
}

/** The path without its locale prefix, always starting with `/`. */
export function unprefixedPath(pathname: string): string {
  if (pathname === '/ar') return '/';
  return pathname.startsWith('/ar/') ? pathname.slice(3) : pathname;
}

/**
 * Whether the server renderer may take this request. Anything else passes
 * to the single-page app.
 */
export function isServerRenderablePath(
  pathname: string,
  search: string
): boolean {
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return false;
  // A file (with an extension) is never a page: a missing asset keeps the
  // single-page app's existing behaviour.
  if (/\.[a-z0-9]+$/i.test(pathname)) return false;
  const params = new URLSearchParams(search);
  if (PASS_QUERY_PARAMS.some((name) => params.has(name))) return false;
  const first = unprefixedPath(pathname).split('/')[1] ?? '';
  return !PASS_SEGMENTS.has(first);
}
