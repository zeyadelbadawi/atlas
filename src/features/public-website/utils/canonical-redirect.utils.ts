/**
 * Canonical host redirect for the public Academy website (P63).
 *
 * The backend names ONE canonical host per Academy (a connected custom
 * domain, otherwise the Atlas subdomain). Both hosts keep serving — the
 * Atlas subdomain is the safety net if a customer's DNS breaks — but a
 * visitor who lands on the non-canonical one is sent to the canonical one
 * with their path, query and hash intact, and every page sets
 * `<link rel="canonical">` to the canonical host. Two live hosts with
 * identical content and no canonical signal would split search ranking
 * and cookies between them.
 *
 * Pure so it is unit-testable; the caller performs the navigation.
 */
import { AUTH_ROUTES } from '@app/routes/route-paths';

export interface CanonicalRedirectLocation {
  readonly hostname: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
}

function isLocalOrIpHost(host: string): boolean {
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '127.0.0.1' || host === '::1' || host === '[::1]') return true;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/** The absolute URL to move to, or `null` when the visitor is already on the canonical host (or no canonical host is known, or this is local development). */
export function resolveCanonicalRedirect(
  location: CanonicalRedirectLocation,
  canonicalHost: string | undefined,
  isDevelopment: boolean
): string | null {
  if (!canonicalHost || isDevelopment) return null;
  // Google Identity — a returning Google flow must finish on the origin it
  // started from: its binder cookie is host-only, and the handoff in the
  // fragment is refused anywhere else. Moving it would only break it.
  if (location.pathname === AUTH_ROUTES.googleReturn) return null;
  const current = location.hostname.toLowerCase();
  const target = canonicalHost.toLowerCase();
  if (current === target || isLocalOrIpHost(current)) return null;
  return `https://${target}${location.pathname}${location.search}${location.hash}`;
}

/** A bare hostname (letters, digits, hyphens, dots) — anything else is never a redirect target. */
const HOSTNAME_PATTERN = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/**
 * Slug change — the absolute URL an Academy's OLD address moves to (the
 * resolution's `redirectHost`, the Academy's canonical host as the backend
 * computed it), or `null` to stay. Unlike the canonical-host move this is
 * not a preference between two live hosts: the old address only redirects,
 * so it is followed at once (no reachability probe), for signed-in visitors
 * too. Same path, query and hash; same exceptions (local development, the
 * Google return path). Defence in depth: a target that is not a plain
 * hostname is ignored, so this can never become an open redirect.
 */
export function resolveMovedHostRedirect(
  location: CanonicalRedirectLocation,
  redirectHost: string | undefined,
  isDevelopment: boolean
): string | null {
  const target = redirectHost?.toLowerCase();
  if (!target || !HOSTNAME_PATTERN.test(target)) return null;
  return resolveCanonicalRedirect(location, target, isDevelopment);
}

/** Origin for `<link rel="canonical">`: the canonical host when known, else the current origin. */
export function resolveCanonicalOrigin(
  currentOrigin: string,
  canonicalHost: string | undefined
): string {
  return canonicalHost
    ? `https://${canonicalHost.toLowerCase()}`
    : currentOrigin;
}

/**
 * P63g — does the redirect target answer at all? An opaque (`no-cors`)
 * fetch resolves whenever the network layer succeeded — DNS, TLS and an
 * HTTP response — and rejects on any of those failing, which is exactly
 * the "would this visitor land on an error page" question. The response
 * itself is never read. Bounded so a hanging host cannot stall the page.
 */
export async function probeHostAnswers(
  targetUrl: string,
  timeoutMs = 4000,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const origin = new URL(targetUrl).origin;
    await fetchImpl(`${origin}/?__atlas_probe=1`, {
      mode: 'no-cors',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
