/**
 * B0-ANL-04 (part 2) — where a visitor came from, carried IN MEMORY ONLY.
 *
 * Read once, when the app first loads (`main.tsx`), from the landing URL's
 * `utm_*` parameters and the referring site's HOST NAME (never the full
 * referrer URL), plus which landing template the visit started on. Kept in
 * a module variable: no cookie, no localStorage, no sessionStorage — nothing
 * is written to the browser before any consent, and a reload forgets it.
 * It is sent once, with the organization signup (`/auth/register`) or the
 * marketing contact form (`POST /public/contact`). The pure reading rules
 * (`landing-attribution.core`) are shared with the static marketing site,
 * whose links into the sign-up hand over `utm_*`, `ref` and `lt` (G1).
 *
 * Nothing is captured unless the `signupAttribution` feature flag is on
 * (on since G1, with the server's `FLAG_ATTRIBUTION_CAPTURE_MODE=on`).
 * Values that look like personal data — an email address or a phone
 * number — are dropped here, and again by the server, which is the
 * authority (`sanitizeAttribution` in atlas-backend). An untagged,
 * direct visit captures nothing.
 */
import { isFeatureEnabled } from '@config/feature-flags.config';
import { ENV } from '@config/env.config';
import type { LandingAttribution } from '@types';
import { readLandingAttribution } from './landing-attribution.core';

export type { LandingAttribution };
export {
  LANDING_ATTRIBUTION_VALUE_MAX,
  looksLikePersonalData,
  readLandingAttribution,
} from './landing-attribution.core';

/**
 * G1 — never a referrer: the platform base domain and the marketing site's
 * host, with every subdomain (the dashboard, the help center, academies).
 */
export function platformInternalDomains(): string[] {
  const domains: string[] = [];
  if (ENV.platformBaseDomain) domains.push(ENV.platformBaseDomain);
  for (const origin of [ENV.siteUrl, ENV.appUrl]) {
    if (!origin) continue;
    try {
      domains.push(
        new URL(origin).hostname.replace(/^(?:www|dashboard)\./, '')
      );
    } catch {
      // An unparseable origin adds nothing.
    }
  }
  return domains;
}

let captured: LandingAttribution | null | undefined;

/** Called once at startup. A no-op while the flag is off, outside a browser, or after the first call. */
export function captureLandingAttribution(): void {
  if (captured !== undefined) return;
  if (!isFeatureEnabled('signupAttribution') || typeof window === 'undefined') {
    captured = null;
    return;
  }
  captured = readLandingAttribution(window.location, document.referrer ?? '', {
    internalDomains: platformInternalDomains(),
  });
}

/** What was captured at landing (memory only), or `null`. Always `null` while the flag is off. */
export function getLandingAttribution(): LandingAttribution | null {
  if (!isFeatureEnabled('signupAttribution')) return null;
  return captured ?? null;
}

/** Test seam: forget what was captured. */
export function resetLandingAttributionForTests(): void {
  captured = undefined;
}
