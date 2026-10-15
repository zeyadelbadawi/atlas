/**
 * B0-WEB-02 — old links keep working when a site changes its default
 * language.
 *
 * A site serves its DEFAULT language at `/` and every other language under
 * `/<locale>`. A path under the default language's own prefix therefore
 * has no page of its own: on an Arabic-default site `/ar/about` is what
 * `/about` used to be in Arabic, and on an English-default site `/en/about`
 * is what `/about` was in English while the site was Arabic-default. Both
 * answer with a permanent redirect to the unprefixed path (query kept), so
 * switching the default either way — and back — leaves every old link one
 * hop from its page, never in a loop: the target is unprefixed, and an
 * unprefixed path never redirects.
 *
 * Only when no published page answers the path as it is: a custom page
 * whose slug happens to be `en` (`/en`) keeps rendering on an
 * English-default site, exactly as before this rule (new pages can no
 * longer take either slug — `RESERVED_PAGE_SLUGS`).
 */
import type { PublicWebsiteLocale, WebsitePage } from '@types';
import { resolvePathToPage } from './page-resolution.utils';

export function resolveLocalePrefixRedirect(
  pathname: string,
  search: string,
  defaultLocale: PublicWebsiteLocale,
  pages: readonly WebsitePage[]
): string | null {
  const prefix = `/${defaultLocale}`;
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return null;
  if (resolvePathToPage(pathname, pages).page) return null;
  // The rest of the path becomes a `Location`. Leading slashes and
  // backslashes are collapsed to one `/`, so `/en//evil.com/` can never
  // redirect off-site as the protocol-relative `//evil.com/`.
  const rest = pathname.slice(prefix.length).replace(/^[/\\]+/, '');
  return `/${rest}${search}`;
}
