/**
 * DL-63 — the platform app lives on `dashboard.<base>` (`VITE_APP_URL`); the
 * marketing site stays on the apex (`VITE_SITE_URL`). These helpers keep the
 * two apart without hard-coding either: with neither configured
 * (development, tests) every link stays relative, exactly as before.
 */

/** The bare hostname of an origin, or `undefined`. */
function hostOf(origin: string | undefined): string | undefined {
  if (!origin) return undefined;
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

/** `true` when `hostname` is the configured dashboard host. */
export function isDashboardHost(
  hostname: string,
  appUrl: string | undefined
): boolean {
  const appHost = hostOf(appUrl);
  return !!appHost && hostname.toLowerCase() === appHost;
}

/**
 * A marketing page (`/`, `/pricing`, `/ar`…) as a link from the app: an
 * absolute apex URL on the dashboard host, the bare path anywhere else
 * (the apex itself while it still serves the app, local development).
 */
export function marketingHref(
  path: string,
  context: {
    readonly hostname: string;
    readonly siteUrl: string | undefined;
    readonly appUrl: string | undefined;
  }
): string {
  if (!context.siteUrl || !isDashboardHost(context.hostname, context.appUrl)) {
    return path;
  }
  return `${context.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * The signed-in HINT cookie the backend sets on the base domain while a
 * dashboard session exists (`atlas_signed_in=1`). Never a credential: the
 * server reads nothing from it. The dashboard clears it too when its
 * session ends (sign-out, a refused refresh, account deletion) so the
 * marketing header stops offering "Open dashboard"; only the platform's own
 * hosts do — an academy session ending never touches it.
 */
export const SIGNED_IN_HINT_COOKIE = 'atlas_signed_in';

/** `true` when a cookie string carries the hint with its one valid value. */
export function hasSignedInHint(cookieString: string): boolean {
  return cookieString
    .split(';')
    .some((part) => part.trim() === `${SIGNED_IN_HINT_COOKIE}=1`);
}

/** The `document.cookie` assignment that expires the hint, or `null` when this host may not touch it. */
export function signedInHintClearCookie(context: {
  readonly hostname: string;
  readonly protocol: string;
  readonly platformBaseDomain: string | undefined;
  readonly appUrl: string | undefined;
}): string | null {
  const base = context.platformBaseDomain?.toLowerCase();
  if (!base || context.protocol !== 'https:') return null;
  const host = context.hostname.toLowerCase();
  if (host !== base && !isDashboardHost(host, context.appUrl)) return null;
  return `${SIGNED_IN_HINT_COOKIE}=; Domain=${base}; Path=/; Max-Age=0; Secure; SameSite=Lax`;
}
