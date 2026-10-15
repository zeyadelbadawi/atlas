/**
 * Where the retired marketing site's addresses now lead (owner decision
 * D6, 14 Oct 2026), and which language a platform-host URL names.
 *
 * The marketing pages are gone, but their URLs are bookmarked, indexed and
 * linked from old emails and posts, so they keep answering — as client-side
 * forwarding addresses (`Navigate replace`) to the holding page, never a
 * 404. The forwarding table itself (`RETIRED_MARKETING_ROUTES`) lives in
 * `route-paths.ts` with every other path; this module holds the logic
 * around it.
 *
 * NO LOOP: every target here (`/`, `/ar`, `/contact`, `/privacy-policy`,
 * `/terms`) is a real page, and none of them is itself forwarded.
 */
import type { LanguageCode } from '@types';
import { PUBLIC_ROUTES } from './route-paths';

/**
 * Kept platform pages whose `/ar/...` address forwards to the page itself.
 * The platform host has no locale prefix — its language is the visitor's
 * choice — so `/ar/contact` is the contact page, opened in Arabic when it
 * is the first page loaded (`platformUrlLanguage`).
 */
export const ARABIC_KEPT_PAGE_PATHS: readonly string[] = [
  PUBLIC_ROUTES.contact,
  PUBLIC_ROUTES.privacyPolicy,
  PUBLIC_ROUTES.terms,
];

function withoutTrailingSlash(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

/**
 * Where a `/ar/...` path on the platform host goes: a kept page's Arabic
 * address to that page, anything else (the retired pages' Arabic twins,
 * unknown paths) to the Arabic holding page.
 *
 * @example
 * resolveArabicPlatformTarget('/ar/contact') // '/contact'
 * resolveArabicPlatformTarget('/ar/pricing') // '/ar'
 */
export function resolveArabicPlatformTarget(pathname: string): string {
  const path = withoutTrailingSlash(pathname);
  const unprefixed = path.startsWith('/ar/') ? path.slice(3) : '/';
  return ARABIC_KEPT_PAGE_PATHS.includes(unprefixed)
    ? unprefixed
    : PUBLIC_ROUTES.homeAr;
}

/**
 * The language a platform-host URL names, if it names one: Arabic for
 * `/ar` and `/ar/...` (the Arabic holding page, and the addresses that
 * forward from it). `main.tsx` renders the first page in it, without
 * saving it as the visitor's preference, so a visitor who follows an
 * Arabic link stays in Arabic on the page they open next. Every other
 * path returns `undefined`: the stored preference decides, so `/` — whose
 * holding page is always English — does not switch a returning Arabic
 * visitor's app to English.
 */
export function platformUrlLanguage(
  pathname: string
): LanguageCode | undefined {
  const path = withoutTrailingSlash(pathname);
  return path === PUBLIC_ROUTES.homeAr || path.startsWith('/ar/')
    ? 'ar'
    : undefined;
}
