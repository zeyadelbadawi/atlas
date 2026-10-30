/**
 * B0-ANL-04 / G1 — the pure rules for reading where a visitor came from,
 * shared by the app (`landing-attribution.utils`, which adds the in-memory
 * capture and the feature flag) and the static marketing site's client
 * script (its contact form and its hand-off links into the app's sign-up).
 *
 * No imports with side effects, no browser storage: a landing URL plus a
 * referrer in, a sanitized `LandingAttribution` (or `null`) out.
 *
 *   - `utm_*` values from the URL; values that look like an email address
 *     or a phone number are dropped, the rest capped at 100 characters.
 *   - The referring site's HOST NAME only, never the full referrer URL.
 *     The site's own host, the platform base domain and every subdomain of
 *     either (the dashboard, the help center, academy sites) are internal:
 *     never a referrer.
 *   - `ref` / `lt` in the URL: the marketing site's hand-off into the app's
 *     sign-up carries the external referrer host it saw (`ref`) and the
 *     page the visit landed on (`lt`), since the app cannot see either.
 *   - The landing template: the first path segment (after a locale prefix),
 *     `home` for the root.
 *
 * An untagged, direct visit yields `null`.
 */
import type { LandingAttribution } from '@/types/identity.types';

export type { LandingAttribution };

/** Longest value kept per field — the server caps at the same length. */
export const LANDING_ATTRIBUTION_VALUE_MAX = 100;

export const UTM_PARAMS = [
  ['utm_source', 'utmSource'],
  ['utm_medium', 'utmMedium'],
  ['utm_campaign', 'utmCampaign'],
  ['utm_term', 'utmTerm'],
  ['utm_content', 'utmContent'],
] as const;

/** The hand-off parameters the marketing site adds to links into the app. */
export const HANDOFF_REFERRER_PARAM = 'ref';
export const HANDOFF_TEMPLATE_PARAM = 'lt';

const CONTROL_CHARS =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g;
const EMAIL_LIKE = /@|%40/i;
/** 9+ digits with optional separators: every mobile number, never an 8-digit date. */
const PHONE_LIKE = /\d(?:[\s().\-_/+]*\d){8,}/;
const TEMPLATE_SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const LOCALE_SEGMENT = /^(?:ar|en)$/i;
/** A DNS host name with at least one dot (labels of letters, digits, hyphens). */
const HOST_NAME =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** True when a value looks like an email address or a phone number. */
export function looksLikePersonalData(value: string): boolean {
  return EMAIL_LIKE.test(value) || PHONE_LIKE.test(value);
}

/**
 * Drops every UTF-16 surrogate without its partner (half of an emoji, say).
 * A loop, not a regex: the regex form needs a lookbehind, which Safari
 * before 16.4 cannot parse, and this module ships in the marketing bundle.
 */
function dropLoneSurrogates(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += text.slice(i, i + 2);
        i += 1;
      }
      continue;
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) continue;
    out += text[i];
  }
  return out;
}

/** One attribution value as it is kept, or `undefined` when it is dropped. */
export function cleanAttributionValue(
  value: string | null
): string | undefined {
  if (!value) return undefined;
  const text = value.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
  if (!text || looksLikePersonalData(text)) return undefined;
  // Cut, then drop any half of a surrogate pair the cut (or the input)
  // left behind: Postgres rejects JSON with a lone surrogate.
  return (
    dropLoneSurrogates(text.slice(0, LANDING_ATTRIBUTION_VALUE_MAX)).trim() ||
    undefined
  );
}

function normalizeDomain(value: string | null | undefined): string | undefined {
  const domain = value
    ?.trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, '');
  return domain || undefined;
}

/**
 * Whether `host` is one of the internal domains or a subdomain of one
 * (`dashboard.atlas.example` and `riwaq.atlas.example` are internal when
 * `atlas.example` is).
 */
export function isInternalHost(
  host: string,
  internalDomains: readonly (string | null | undefined)[]
): boolean {
  const candidate = normalizeDomain(host);
  if (!candidate) return false;
  return internalDomains.some((value) => {
    const domain = normalizeDomain(value);
    return (
      !!domain && (candidate === domain || candidate.endsWith(`.${domain}`))
    );
  });
}

/** A bare host name as kept (lower case, no port), or `undefined`. */
function hostNameOf(value: string | null): string | undefined {
  const host = normalizeDomain(value);
  if (!host || host.length > LANDING_ATTRIBUTION_VALUE_MAX) return undefined;
  if (!HOST_NAME.test(host) || looksLikePersonalData(host)) return undefined;
  return host;
}

/** The external referrer's host name, or `undefined` (none, internal, unparseable). */
export function externalReferrerHost(
  referrer: string,
  internalDomains: readonly (string | null | undefined)[]
): string | undefined {
  if (!referrer) return undefined;
  try {
    const host = hostNameOf(new URL(referrer).hostname);
    return host && !isInternalHost(host, internalDomains) ? host : undefined;
  } catch {
    return undefined;
  }
}

/** The landing template of a path: its first segment after an `/ar` or `/en` prefix, `home` for the root. */
export function landingTemplateFor(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] && LOCALE_SEGMENT.test(segments[0])) segments.shift();
  const slug = (segments[0] ?? 'home').toLowerCase();
  return TEMPLATE_SLUG.test(slug) ? slug : undefined;
}

export interface ReadLandingAttributionOptions {
  /**
   * Domains that are never a referrer, with all their subdomains (the
   * platform base domain, the marketing site's host). The page's own host
   * is always internal.
   */
  readonly internalDomains?: readonly (string | null | undefined)[];
}

/** Pure: what a landing URL + referrer yield, or `null` for an untagged, direct visit. */
export function readLandingAttribution(
  location: {
    readonly search: string;
    readonly pathname: string;
    readonly hostname: string;
  },
  referrer: string,
  options: ReadLandingAttributionOptions = {}
): LandingAttribution | null {
  const internal = [location.hostname, ...(options.internalDomains ?? [])];
  const params = new URLSearchParams(location.search);
  const found: Record<string, string> = {};
  for (const [param, key] of UTM_PARAMS) {
    const value = cleanAttributionValue(params.get(param));
    if (value) found[key] = value;
  }
  // The marketing site's hand-off first: in the app, `document.referrer` is
  // the marketing page itself (internal), never where the visit started.
  const handedHost = hostNameOf(params.get(HANDOFF_REFERRER_PARAM));
  const domain =
    handedHost && !isInternalHost(handedHost, internal)
      ? handedHost
      : externalReferrerHost(referrer, internal);
  if (domain) found.referrerDomain = domain;
  if (Object.keys(found).length === 0) return null;
  const handedTemplate = params
    .get(HANDOFF_TEMPLATE_PARAM)
    ?.trim()
    .toLowerCase();
  const template =
    handedTemplate && TEMPLATE_SLUG.test(handedTemplate)
      ? handedTemplate
      : landingTemplateFor(location.pathname);
  if (template) found.landingTemplate = template;
  return found as LandingAttribution;
}

/**
 * The query parameters that carry an attribution into the app's sign-up:
 * its `utm_*` values, `ref=<referrer host>` and `lt=<landing template>`.
 */
export function attributionHandoffParams(
  attribution: LandingAttribution
): [string, string][] {
  const pairs: [string, string][] = [];
  for (const [param, key] of UTM_PARAMS) {
    const value = attribution[key];
    if (value) pairs.push([param, value]);
  }
  if (attribution.referrerDomain)
    pairs.push([HANDOFF_REFERRER_PARAM, attribution.referrerDomain]);
  if (attribution.landingTemplate)
    pairs.push([HANDOFF_TEMPLATE_PARAM, attribution.landingTemplate]);
  return pairs;
}
