/**
 * B1 (DL-50) — the loop guard behind `StaticMarketingRedirect`.
 *
 * The marketing pages (`/`, `/pricing`, `/ar/...`) are static HTML served by
 * the edge on a full page load; the app only reaches one through an in-app
 * link. It then reloads the document ONCE so the browser fetches the static
 * page. If the server answers with the app again (the static site switched
 * off with `ATLAS_MARKETING_STATIC=off`, a dev server without it, a
 * network-first service-worker fallback while offline), the second visit
 * must not reload again: a reload for the same path within
 * `STATIC_MARKETING_RELOAD_WINDOW_MS` is refused and the caller shows its
 * fallback instead.
 *
 * Kept in `sessionStorage` (per tab, survives the reload). If storage is
 * unavailable, the answer is "do not reload" — never a loop.
 */
export const STATIC_MARKETING_RELOAD_KEY = 'atlas:static-marketing-reload';
export const STATIC_MARKETING_RELOAD_WINDOW_MS = 10_000;

export interface ReloadGuardStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The attempt this document already made (React may mount the route twice). */
let claimedInThisDocument: {
  readonly path: string;
  readonly at: number;
} | null = null;

/** Normalises the path the guard keys on (`/ar/` and `/ar` are one page). */
export function reloadGuardPath(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

/**
 * Whether to reload for the static page at `pathname` now; records the
 * attempt when the answer is yes.
 */
export function claimStaticMarketingReload(
  storage: ReloadGuardStorage | null,
  pathname: string,
  now: number
): boolean {
  const path = reloadGuardPath(pathname);
  if (
    claimedInThisDocument?.path === path &&
    now - claimedInThisDocument.at < STATIC_MARKETING_RELOAD_WINDOW_MS
  ) {
    return true;
  }
  if (!storage) return false;
  try {
    const previous = parseRecord(storage.getItem(STATIC_MARKETING_RELOAD_KEY));
    if (previous) {
      const age =
        typeof previous.at === 'number' ? now - previous.at : Infinity;
      if (
        previous.path === path &&
        age >= 0 &&
        age < STATIC_MARKETING_RELOAD_WINDOW_MS
      ) {
        return false;
      }
    }
    storage.setItem(
      STATIC_MARKETING_RELOAD_KEY,
      JSON.stringify({ path, at: now })
    );
  } catch {
    return false;
  }
  claimedInThisDocument = { path, at: now };
  return true;
}

/** A stored attempt; a corrupt value counts as none (it is overwritten). */
function parseRecord(
  raw: string | null
): { path?: unknown; at?: unknown } | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object'
      ? (value as { path?: unknown; at?: unknown })
      : null;
  } catch {
    return null;
  }
}

/** Test seam: forget this document's attempt. */
export function resetStaticMarketingReloadForTests(): void {
  claimedInThisDocument = null;
}

/** `window.sessionStorage`, or null where the browser refuses it. */
export function sessionStorageOrNull(): ReloadGuardStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
