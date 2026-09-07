/**
 * Shared `WebsiteLinkRenderer` for every public-runtime page (Prompt 11;
 * extracted in Phase 1, Extended Scope, dependency C, so the new Sign
 * In/Sign Up pages use the exact same real-navigation behavior
 * `PublicWebsitePage` already established, instead of a second, drifting
 * copy: internal targets use react-router's `Link` (client-side, no full
 * reload), external targets use a plain `<a target="_blank">`.
 *
 * Found during Phase 1 (Extended Scope, dependency C) real browser
 * testing: an internal `<Link to="/sign-in">` (or any other in-site link)
 * clicked while previewing a site via `DEV_OVERRIDE_PARAM` dropped that
 * query param on navigation — client-side routing to a bare path carries
 * no hostname, and dev-override is the ONE case where the Academy's
 * identity lives in the query string rather than the real hostname. A
 * real subdomain/custom-domain deployment carries Academy identity in the
 * hostname itself and is entirely unaffected; this only preserves the
 * param when it's already present, so production behavior is unchanged.
 *
 * Found in a later real browser test — a SECOND, more serious drop: this
 * renderer never applied the `/ar` locale prefix at all. Every internal
 * `href` reaching it (`resolveWebsiteCtaHref`/`resolvePagePath`, both
 * deliberately locale-unaware — they're shared with the dashboard's own
 * locale-less preview) is a bare, unprefixed path like `/about`. Since
 * `WebsiteHeader`/`WebsiteFooter`/every CTA-shaped section prefer this
 * renderer over the (locale-correct) `onNavigate` callback whenever it's
 * supplied — which is always, on the real public runtime — EVERY header/
 * footer/CTA click silently dropped the visitor from `/ar/...` back to
 * English. `onNavigate`'s own `withLocale` fix was consequently dead code
 * for any nav item with a resolvable `href`. Fixed at the single
 * chokepoint every one of those consumers already shares: this renderer
 * now takes `locale` and applies it to every non-external `href` itself,
 * via `withPublicWebsiteLocale` (below) — the one place this prefixing
 * happens, so no page/section ever needs its own copy again. Every
 * caller of this hook now passes its own already-known `locale` prop.
 *
 * Callers must pass BARE (unprefixed) internal paths — never pre-apply
 * `withPublicWebsiteLocale` before handing an `href` to this renderer, or
 * the prefix doubles (`/ar/ar/...`).
 */
import { Link, useSearchParams } from 'react-router-dom';
import type { WebsiteLinkRenderer } from '@features/website';
import type { PublicWebsiteLocale } from '@types';
import { DEV_OVERRIDE_PARAM } from './hostname-resolution.utils';

/**
 * The ONE place an internal public-website path gets its `/ar` prefix.
 * A no-op for `en` (the unprefixed default), for absolute/external URLs,
 * and for a path that already carries the prefix (defensive — no real
 * caller should pass one in). Every public-runtime page should use this
 * (or the `linkRenderer`/`buildPublicWebsiteHref` this file also exports)
 * instead of a local `withLocale` closure — see this file's own doc
 * comment for the exact bug class that duplicating this logic caused.
 */
export function withPublicWebsiteLocale(path: string, locale: PublicWebsiteLocale): string {
  if (locale === 'en') return path;
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path; // absolute/external (e.g. `https://…`, `mailto:…`)
  if (path === '/ar' || path.startsWith('/ar/')) return path; // already prefixed
  return path === '/' ? '/ar' : `/ar${path}`;
}

/**
 * Locale- and dev-preview-aware internal-path builder, for the manual
 * `navigate()`/`<Navigate>`/`window.location.assign()` calls every public
 * page still needs alongside `linkRenderer` (redirects, empty-state
 * actions, post-auth navigation) — applies the exact same two rules
 * `usePublicWebsiteLinkRenderer` applies to every `<Link>` it renders, so
 * neither can drift from the other. Takes the current `locale` explicitly
 * (each caller already has it as a prop) rather than reading context,
 * since every one of these call sites runs above `WebsiteChrome`'s own
 * `PublicWebsiteLocaleProvider` in the tree.
 */
export function usePublicWebsiteHrefBuilder(locale: PublicWebsiteLocale): (path: string) => string {
  const [searchParams] = useSearchParams();
  const devSlug = searchParams.get(DEV_OVERRIDE_PARAM);

  return (path: string) => {
    const localized = withPublicWebsiteLocale(path, locale);
    if (!devSlug) return localized;
    const separator = localized.includes('?') ? '&' : '?';
    return `${localized}${separator}${DEV_OVERRIDE_PARAM}=${encodeURIComponent(devSlug)}`;
  };
}

export function usePublicWebsiteLinkRenderer(locale: PublicWebsiteLocale): WebsiteLinkRenderer {
  const buildHref = usePublicWebsiteHrefBuilder(locale);

  return ({ href, external, className, children }) => {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {children}
        </a>
      );
    }

    return (
      <Link to={buildHref(href)} className={className}>
        {children}
      </Link>
    );
  };
}
