/**
 * Academy build experience — how long the "we are building your academy"
 * screen stays up.
 *
 * Provisioning itself finishes in seconds. Owners who just spent a long
 * time filling in the setup form read an instant result as "a template,
 * not something made for me", so the build screen runs for a random
 * 45–75 seconds per request — or longer, if the real provisioning takes
 * longer. This is presentation only: the academy is created exactly as
 * fast as the server makes it, and nothing here changes what the server
 * stores or decides.
 *
 * One timer per provisioning request, kept in `sessionStorage` so a reload
 * resumes the same countdown instead of starting a new one (or skipping
 * it). Only the request id, a start time and a duration are stored. Storage
 * can be missing or throw (private mode); the timer then lives in memory.
 */

export const ACADEMY_BUILD_MIN_MS = 45_000;
export const ACADEMY_BUILD_MAX_MS = 75_000;
/** A stored timer older than this is ignored: the build it described is long over. */
const STALE_AFTER_MS = 30 * 60_000;
const STORAGE_PREFIX = 'atlas:academyBuild:';

interface BuildTimer {
  readonly startedAt: number;
  readonly durationMs: number;
}

const memory = new Map<string, BuildTimer>();
const finished = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function notify(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

function storageKey(requestId: string): string {
  return `${STORAGE_PREFIX}${requestId}`;
}

function isValid(value: unknown, now: number): value is BuildTimer {
  if (!value || typeof value !== 'object') return false;
  const { startedAt, durationMs } = value as Record<string, unknown>;
  return (
    typeof startedAt === 'number' &&
    typeof durationMs === 'number' &&
    Number.isFinite(startedAt) &&
    durationMs >= ACADEMY_BUILD_MIN_MS &&
    durationMs <= ACADEMY_BUILD_MAX_MS &&
    // Never trust a start in the future or a long-finished build.
    startedAt <= now &&
    now - startedAt < STALE_AFTER_MS
  );
}

function read(requestId: string, now: number): BuildTimer | undefined {
  const cached = memory.get(requestId);
  if (cached && isValid(cached, now)) return cached;
  try {
    const raw = window.sessionStorage.getItem(storageKey(requestId));
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (!isValid(parsed, now)) return undefined;
    memory.set(requestId, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

function randomDuration(): number {
  return Math.round(
    ACADEMY_BUILD_MIN_MS +
      Math.random() * (ACADEMY_BUILD_MAX_MS - ACADEMY_BUILD_MIN_MS)
  );
}

/** The timer for this request, starting one now if there is none. */
export function startAcademyBuild(
  requestId: string,
  now: number = Date.now()
): BuildTimer {
  const existing = read(requestId, now);
  if (existing) return existing;
  const timer: BuildTimer = { startedAt: now, durationMs: randomDuration() };
  memory.set(requestId, timer);
  finished.delete(requestId);
  try {
    window.sessionStorage.setItem(storageKey(requestId), JSON.stringify(timer));
  } catch {
    // Memory only: a reload starts a fresh countdown, nothing breaks.
  }
  notify();
  return timer;
}

/** The existing timer for this request, if this device started one. */
export function readAcademyBuild(
  requestId: string,
  now: number = Date.now()
): BuildTimer | undefined {
  return read(requestId, now);
}

/** Milliseconds of build screen left for this request (0 when none or over). */
export function academyBuildRemainingMs(
  requestId: string,
  now: number = Date.now()
): number {
  if (finished.has(requestId)) return 0;
  const timer = read(requestId, now);
  if (!timer) return 0;
  return Math.max(0, timer.startedAt + timer.durationMs - now);
}

/** Whether the build screen is still showing for this request. */
export function isAcademyBuildShowing(
  requestId: string | undefined,
  now: number = Date.now()
): boolean {
  return !!requestId && academyBuildRemainingMs(requestId, now) > 0;
}

/**
 * Whether this device is still showing the build screen for this request:
 * a timer exists and the screen has not handed back yet. The screen itself
 * decides when it is done (window over AND server ready).
 */
export function isAcademyBuildActive(
  requestId: string | undefined,
  now: number = Date.now()
): boolean {
  return !!requestId && !finished.has(requestId) && !!read(requestId, now);
}

/** The build screen is done (shown in full, or the request failed). */
export function finishAcademyBuild(requestId: string): void {
  if (finished.has(requestId)) return;
  finished.add(requestId);
  memory.delete(requestId);
  try {
    window.sessionStorage.removeItem(storageKey(requestId));
  } catch {
    // Nothing stored.
  }
  notify();
}

export const academyBuildStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  version(): number {
    return version;
  },
};

/** Test helper: forget every timer. */
export function resetAcademyBuildTimersForTests(): void {
  memory.clear();
  finished.clear();
  notify();
}
