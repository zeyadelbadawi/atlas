/**
 * Public website hostname resolution (Prompt 11).
 *
 * Decides, from the visiting browser's own hostname, whether the SPA
 * should render as the normal Atlas application (dashboard/marketing/
 * auth) or as a public Academy website. This is the ONE place that
 * decision is made — `AppRouter` calls it once, at the very top of its
 * render, before choosing which route tree to mount (see
 * `Reports/ARCHITECTURE.md`, Prompt 11, "Domain Resolution").
 *
 * `resolvePublicWebsiteContext` is a pure function (no DOM access) so it
 * is directly testable; `getCurrentPublicWebsiteContext` is the thin
 * wrapper that reads `window.location` and calls it.
 *
 * Safety: this function is a first-pass FILTER only — it decides
 * "should we even attempt to resolve this hostname as an Academy
 * website," never "which Academy." The actual Academy identity always
 * comes from `PublicWebsiteService.resolveHostname` (a real, backend-
 * authoritative lookup) — an unrecognized hostname here still renders a
 * proper "not found" state downstream, it is never trusted as a valid
 * Academy id by itself (see "Multi-Academy Isolation").
 */

export type PublicWebsiteLookupType = 'subdomain' | 'custom-domain' | 'dev-override';

export type PublicWebsiteContext =
  | { readonly mode: 'atlas-app' }
  | {
      readonly mode: 'academy-website';
      readonly lookupType: PublicWebsiteLookupType;
      /** A subdomain label (`'harvard'`) or a full custom hostname, depending on `lookupType`. */
      readonly value: string;
    };

/**
 * The dev-only query param that lets a developer preview the public
 * runtime for a given Academy subdomain without a real domain — see the
 * file's doc comment. Never relevant once a real platform domain routes
 * real traffic. Exported so `getAcademyPublicWebsiteUrl`
 * (`features/website/utils/public-website-link.utils.ts`) can build the
 * exact same link this module resolves, rather than a second, drifting
 * copy of the param name.
 */
export const DEV_OVERRIDE_PARAM = '__atlas_academy_preview';

function isLocalOrIpHost(host: string): boolean {
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '127.0.0.1' || host === '::1' || host === '[::1]') return true;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

export function resolvePublicWebsiteContext(
  hostname: string,
  search: string,
  platformBaseDomain: string | undefined,
  isDevelopment: boolean
): PublicWebsiteContext {
  if (isDevelopment) {
    const devSlug = new URLSearchParams(search).get(DEV_OVERRIDE_PARAM);
    if (devSlug) {
      return { mode: 'academy-website', lookupType: 'dev-override', value: devSlug };
    }
  }

  // No real platform domain configured — the public runtime stays
  // entirely inert. This is the safe default in every environment today.
  if (!platformBaseDomain) return { mode: 'atlas-app' };

  const host = hostname.toLowerCase();
  const base = platformBaseDomain.toLowerCase();

  if (host === base || host === `www.${base}`) return { mode: 'atlas-app' };

  const suffix = `.${base}`;
  if (host.endsWith(suffix)) {
    const label = host.slice(0, -suffix.length);
    // Only a single-label subdomain (`harvard.<base>`) is an Academy
    // subdomain; anything with an extra dot is unrecognized shape and
    // falls back to the normal app rather than being guessed at.
    if (label && !label.includes('.')) {
      return { mode: 'academy-website', lookupType: 'subdomain', value: label };
    }
    return { mode: 'atlas-app' };
  }

  if (isLocalOrIpHost(host)) return { mode: 'atlas-app' };

  // Any other real hostname is a candidate custom domain — resolved
  // authoritatively (or rejected) by `PublicWebsiteService.resolveHostname`.
  return { mode: 'academy-website', lookupType: 'custom-domain', value: host };
}

export function getCurrentPublicWebsiteContext(
  platformBaseDomain: string | undefined,
  isDevelopment: boolean
): PublicWebsiteContext {
  return resolvePublicWebsiteContext(
    window.location.hostname,
    window.location.search,
    platformBaseDomain,
    isDevelopment
  );
}
