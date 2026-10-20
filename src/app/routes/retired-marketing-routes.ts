/**
 * Where an `/ar/...` address leads INSIDE the app, and which language a
 * platform-host URL names.
 *
 * B1 (DL-50): on a full page load the edge serves the static marketing
 * site, including its Arabic pages (`/ar/contact`, `/ar/terms`…) and a real
 * Arabic 404 for any other `/ar/...` (Caddyfile). The app only sees these
 * addresses through client-side navigation; the static marketing pages are
 * `STATIC_MARKETING_ROUTES` (`StaticMarketingRedirect`), and this module
 * resolves the rest, as before D6's site was replaced: a kept page's
 * Arabic address to its in-app page, anything else to `/ar`.
 *
 * NO LOOP: every target here (`/ar`, `/contact`, `/privacy-policy`,
 * `/terms`) is a real route, and none of them is itself forwarded.
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
 * Where a `/ar/...` path on the platform host goes inside the app: a kept
 * page's Arabic address to that page, anything else (unknown paths) to the
 * Arabic home page (static: `StaticMarketingRedirect` fetches it).
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
 * `/ar` and `/ar/...` (the Arabic marketing pages, and the addresses that
 * forward from them). `main.tsx` renders the first page in it, without
 * saving it as the visitor's preference, so a visitor who follows an
 * Arabic link stays in Arabic on the page they open next. Every other
 * path returns `undefined`: the stored preference decides, so `/` — whose
 * marketing page is always English — does not switch a returning Arabic
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
