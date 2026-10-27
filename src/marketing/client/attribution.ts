/**
 * G1 — where this marketing page view came from, read IN MEMORY ONLY (no
 * cookie, no storage), with the same rules as the app
 * (`shared/utils/landing-attribution.core`):
 *
 *   - the contact form sends it as `attribution`;
 *   - when the URL carried `utm_*` or the referrer is an external site, the
 *     links on this page into the app's sign-up get those `utm_*` plus
 *     `ref=<referrer host>` and `lt=<landing template>` appended, so the
 *     sign-up (on the dashboard host, which cannot see either) records the
 *     real source. Only `href` attributes change: no layout change, no
 *     inline script, nothing stored.
 *
 * The site's own host, the app's host and the platform base domain with
 * every subdomain are internal (never a referrer). Gated, like the app, by
 * the `signupAttribution` flag.
 */
import { isFeatureEnabled } from '@/config/feature-flags.config';
import {
  attributionHandoffParams,
  readLandingAttribution,
  type LandingAttribution,
} from '@/shared/utils/landing-attribution.core';

/** The base domain(s) of the site: its host and the app's, without `www.` / `dashboard.`. */
export function siteInternalDomains(pageHost: string, appOrigin: string): string[] {
  const domains = new Set<string>();
  const add = (host: string) => {
    const base = host.trim().toLowerCase().replace(/^(?:www|dashboard)\./, '');
    if (base) domains.add(base);
  };
  add(pageHost);
  if (appOrigin) {
    try {
      add(new URL(appOrigin).hostname);
    } catch {
      // A malformed app origin adds nothing.
    }
  }
  return [...domains];
}

/** This page view's attribution, or `null` (untagged direct visit, or the flag is off). */
export function readPageAttribution(
  location: { readonly search: string; readonly pathname: string; readonly hostname: string },
  referrer: string,
  appOrigin: string,
): LandingAttribution | null {
  if (!isFeatureEnabled('signupAttribution')) return null;
  return readLandingAttribution(location, referrer, {
    internalDomains: siteInternalDomains(location.hostname, appOrigin),
  });
}

const SIGN_UP_PATH = /^\/auth\/(?:register|sign-up)(?:\/|$)/;

/** Whether a link goes to the app's sign-up (on the app origin, or this origin when the app shares it). */
export function isAppSignUpHref(href: string, appOrigin: string, pageOrigin: string): boolean {
  try {
    const url = new URL(href, pageOrigin);
    return url.origin === (appOrigin || pageOrigin) && SIGN_UP_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

/** The link with the attribution's hand-off parameters added (existing ones are kept as they are). */
export function withHandoffParams(href: string, attribution: LandingAttribution, pageOrigin: string): string {
  const url = new URL(href, pageOrigin);
  for (const [name, value] of attributionHandoffParams(attribution)) {
    if (!url.searchParams.has(name)) url.searchParams.set(name, value);
  }
  // A relative link stays relative.
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')
    ? url.toString()
    : `${url.pathname}${url.search}${url.hash}`;
}

/** Rewrites this page's links into the app's sign-up; returns how many changed. */
export function initSignupHandoff(
  doc: Document,
  appOrigin: string,
  attribution: LandingAttribution | null,
  pageOrigin: string = doc.location?.origin ?? '',
): number {
  if (!attribution || !pageOrigin) return 0;
  let changed = 0;
  doc.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    if (!isAppSignUpHref(href, appOrigin, pageOrigin)) return;
    const next = withHandoffParams(href, attribution, pageOrigin);
    if (next !== href) {
      link.setAttribute('href', next);
      changed += 1;
    }
  });
  return changed;
}
