/**
 * Which requests the public-website server renderer takes, and in which
 * locale (Reports/SSR_ARCHITECTURE_ANALYSIS.md §3, §5).
 *
 * Only anonymous public pages are rendered on the server. Everything a
 * visitor signs in to, and everything that is not a page, is PASSED: the
 * edge then serves the unchanged single-page app, exactly as today.
 */
import type { PublicWebsiteLocale } from '@types';
import {
  DEFAULT_PUBLIC_WEBSITE_LOCALE,
  PUBLIC_WEBSITE_LOCALES,
  publicWebsiteLocaleForPath as localeForPath,
} from '@features/website';

/**
 * First path segments (after an optional `/ar` or `/en`) that are never server
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

/**
 * The public website's locale for a path, on a site whose default locale is
 * `defaultLocale` (`en` unless the published configuration says `ar`,
 * B0-WEB-02): `/ar` and `/ar/...` are Arabic on an English-default site,
 * `/en` and `/en/...` English on an Arabic-default one, and every other
 * path is in the default. Before the configuration is known this is the
 * English-default answer, which is every site's until its owner says
 * otherwise.
 */
export function publicWebsiteLocaleForPath(
  pathname: string,
  defaultLocale: PublicWebsiteLocale = DEFAULT_PUBLIC_WEBSITE_LOCALE
): PublicWebsiteLocale {
  return localeForPath(pathname, defaultLocale);
}

/**
 * The path without any locale prefix (`/ar/...` or `/en/...`), always
 * starting with `/`. Decides only which requests are pages at all, so it
 * needs no default locale: a non-page under either prefix is never a page.
 */
export function unprefixedPath(pathname: string): string {
  for (const locale of PUBLIC_WEBSITE_LOCALES) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`))
      return pathname.slice(locale.length + 1);
  }
  return pathname;
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
