/**
 * B0-ANL-04 (part 2) — where a visitor came from, carried IN MEMORY ONLY.
 *
 * Read once, when the app first loads (`main.tsx`), from the landing URL's
 * `utm_*` parameters and the referring site's HOST NAME (never the full
 * referrer URL), plus which landing template the visit started on. Kept in
 * a module variable: no cookie, no localStorage, no sessionStorage — nothing
 * is written to the browser before any consent, and a reload forgets it.
 * It is sent once, with the organization signup (`/auth/register`) or the
 * marketing contact form (`POST /public/contact`).
 *
 * Nothing is captured unless the `signupAttribution` feature flag is on
 * (off until the owner enables it). Values that look like personal data —
 * an email address or a phone number — are dropped here, and again by the
 * server, which is the authority (`sanitizeAttribution` in atlas-backend).
 * An untagged, direct visit captures nothing.
 */
import { isFeatureEnabled } from '@config/feature-flags.config';
import type { LandingAttribution } from '@types';

export type { LandingAttribution };

/** Longest value kept per field — the server caps at the same length. */
export const LANDING_ATTRIBUTION_VALUE_MAX = 100;

const UTM_PARAMS = [
  ['utm_source', 'utmSource'],
  ['utm_medium', 'utmMedium'],
  ['utm_campaign', 'utmCampaign'],
  ['utm_term', 'utmTerm'],
  ['utm_content', 'utmContent'],
] as const;

const CONTROL_CHARS =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g;
const EMAIL_LIKE = /@|%40/i;
/** 9+ digits with optional separators: every mobile number, never an 8-digit date. */
const PHONE_LIKE = /\d(?:[\s().\-_/+]*\d){8,}/;
const TEMPLATE_SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/** True when a value looks like an email address or a phone number. */
export function looksLikePersonalData(value: string): boolean {
  return EMAIL_LIKE.test(value) || PHONE_LIKE.test(value);
}

function clean(value: string | null): string | undefined {
  if (!value) return undefined;
  const text = value.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
  if (!text || looksLikePersonalData(text)) return undefined;
  return text.slice(0, LANDING_ATTRIBUTION_VALUE_MAX).trim() || undefined;
}

function referrerHost(referrer: string, ownHost: string): string | undefined {
  if (!referrer) return undefined;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (!host || host === ownHost.toLowerCase() || looksLikePersonalData(host)) {
      return undefined;
    }
    return host.includes('.') ? host : undefined;
  } catch {
    return undefined;
  }
}

function templateFor(pathname: string): string | undefined {
  const first = pathname.split('/').filter(Boolean)[0];
  const slug = (first ?? 'home').toLowerCase();
  return TEMPLATE_SLUG.test(slug) ? slug : undefined;
}

/** Pure: what a landing URL + referrer yield, or `null` for an untagged, direct visit. */
export function readLandingAttribution(
  location: { readonly search: string; readonly pathname: string; readonly hostname: string },
  referrer: string
): LandingAttribution | null {
  const params = new URLSearchParams(location.search);
  const found: Record<string, string> = {};
  for (const [param, key] of UTM_PARAMS) {
    const value = clean(params.get(param));
    if (value) found[key] = value;
  }
  const domain = referrerHost(referrer, location.hostname);
  if (domain) found.referrerDomain = domain;
  if (Object.keys(found).length === 0) return null;
  const template = templateFor(location.pathname);
  if (template) found.landingTemplate = template;
  return found as LandingAttribution;
}

let captured: LandingAttribution | null | undefined;

/** Called once at startup. A no-op while the flag is off, outside a browser, or after the first call. */
export function captureLandingAttribution(): void {
  if (captured !== undefined) return;
  if (!isFeatureEnabled('signupAttribution') || typeof window === 'undefined') {
    captured = null;
    return;
  }
  captured = readLandingAttribution(window.location, document.referrer ?? '');
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
