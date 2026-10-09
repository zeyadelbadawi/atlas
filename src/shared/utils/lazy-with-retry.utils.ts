/**
 * Stale-tab recovery — route code that is gone after a deploy.
 *
 * ROOT CAUSE this exists for: every route is a lazily loaded chunk with a
 * content hash in its name. A tab opened before a deploy still runs the old
 * build; the first time it navigates to a route it has not loaded yet, it
 * asks for an old chunk the new image no longer has. `import()` rejects,
 * `React.lazy` caches that rejection forever, and the section error
 * boundary shows "This section could not be displayed" — with a "Try again"
 * that can only re-render the same cached failure. A browser refresh fixed
 * it because the fresh `index.html` names the new chunks.
 *
 * The recovery, in order:
 *  1. retry the import a couple of times (a network blip on wake);
 *  2. still failing → it is almost certainly a new version: reload ONCE,
 *     which loads the route the person clicked (the URL already changed);
 *  3. a second failure within the guard window is not a deploy — the error
 *     reaches the boundary, which says so and offers a reload, instead of
 *     reloading in a loop.
 * (Deploys also keep the previous build's chunks for two weeks and answer a
 * missing chunk with a real 404 — see Dockerfile / Caddyfile.)
 */
import { lazy } from 'react';

const RELOAD_GUARD_KEY = 'atlas:chunk-reload-at';
/** A second chunk failure this soon after a reload is not a new deploy. */
const RELOAD_GUARD_MS = 30_000;
const RETRY_DELAYS_MS = [400, 1500];

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk [\w-]+ failed/i,
  /Loading CSS chunk/i,
  /Unable to preload CSS/i,
  /'text\/html' is not a valid JavaScript MIME type/i,
  /Expected a JavaScript(-or-Wasm)? module script/i,
];

/** Whether `error` is a failed load of a code chunk (not a bug in the code). */
export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: unknown }).name;
  if (name === 'ChunkLoadError') return true;
  const message =
    typeof error === 'string'
      ? error
      : String((error as { message?: unknown }).message ?? '');
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function readGuard(): number {
  try {
    return Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

/**
 * Reloads the page to pick up a new build — at most once per guard window.
 * Returns whether a reload was started. Storage being unavailable means no
 * guard can be kept, so no automatic reload happens (no loop is possible).
 */
export function reloadOnceForNewVersion(now: number = Date.now()): boolean {
  if (typeof window === 'undefined') return false;
  // Offline, a reload would only land on the browser's own offline page;
  // the error boundary waits for the connection and reloads then.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  if (now - readGuard() < RELOAD_GUARD_MS) return false;
  try {
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Imports with retries, then reloads once for a new version (see above). */
export async function importWithRetry<TModule>(
  factory: () => Promise<TModule>,
  delays: readonly number[] = RETRY_DELAYS_MS
): Promise<TModule> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await factory();
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;
      lastError = error;
      if (attempt < delays.length) await delay(delays[attempt]);
    }
  }
  if (reloadOnceForNewVersion()) {
    // The page is reloading into the new build; never settle, so nothing
    // renders an error in the meantime.
    return new Promise<TModule>(() => undefined);
  }
  throw lastError;
}

/** `React.lazy` with chunk-failure recovery — a drop-in replacement. */
export const lazyWithRetry: typeof lazy = (factory) =>
  lazy(() => importWithRetry(factory));
