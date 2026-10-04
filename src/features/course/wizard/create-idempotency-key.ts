/**
 * The client key that makes the wizard's course create idempotent (W6).
 *
 * One key per academy per browser tab session, kept in `sessionStorage`
 * until a create succeeds. A double submit, a refresh mid-request or the
 * http client's own retry after an ambiguous failure (it replays a POST
 * only when the body carries `idempotencyKey`) all reuse the same key, so
 * the server returns the course the first request made instead of making
 * a second draft or reporting the slug as taken.
 *
 * Storage can be unavailable (private mode, blocked site data); the key
 * then lives in memory for this page, which still covers double submits
 * and automatic retries.
 */
const STORAGE_PREFIX = 'atlas:course-wizard:create-key:';
const memoryKeys = new Map<string, string>();

function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getCourseCreateIdempotencyKey(academyId: string): string {
  const storageKey = STORAGE_PREFIX + academyId;
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) return stored;
    const created = memoryKeys.get(storageKey) ?? newKey();
    window.sessionStorage.setItem(storageKey, created);
    memoryKeys.set(storageKey, created);
    return created;
  } catch {
    const existing = memoryKeys.get(storageKey);
    if (existing) return existing;
    const created = newKey();
    memoryKeys.set(storageKey, created);
    return created;
  }
}

/** After a successful create: the next create is a new attempt with a new key. */
export function clearCourseCreateIdempotencyKey(academyId: string): void {
  const storageKey = STORAGE_PREFIX + academyId;
  memoryKeys.delete(storageKey);
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Nothing stored to clear.
  }
}
