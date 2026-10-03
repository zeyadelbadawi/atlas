/**
 * The "last academy" preference (W5). It is ONLY the initial redirect target
 * for the bare `/dashboard/academy` address and the seed for the sidebar's
 * academy links on screens outside any academy — never a source of truth
 * for which academy a screen shows (the URL is).
 *
 * Keyed by user AND organization (F6): one browser shared by two accounts,
 * or one account in two organizations, never adopts another's academy. It
 * grants nothing — the id is always re-checked against the academies the
 * server lists for the caller, and every academy route is authorized
 * server-side.
 */
const PREFIX = 'atlas:last-academy';

function storageKey(userId: string, organizationId: string): string {
  return `${PREFIX}:${userId}:${organizationId}`;
}

export interface LastAcademyOwner {
  readonly userId: string | undefined;
  readonly organizationId: string | undefined;
}

export function readLastAcademy({
  userId,
  organizationId,
}: LastAcademyOwner): string | undefined {
  if (typeof window === 'undefined' || !userId || !organizationId) return;
  try {
    return (
      localStorage.getItem(storageKey(userId, organizationId)) ?? undefined
    );
  } catch {
    return undefined;
  }
}

export function writeLastAcademy(
  { userId, organizationId }: LastAcademyOwner,
  academyId: string
): void {
  if (typeof window === 'undefined' || !userId || !organizationId) return;
  try {
    localStorage.setItem(storageKey(userId, organizationId), academyId);
  } catch {
    // Storage unavailable: the preference is a convenience only.
  }
}

/** Forgets the preference, but only if it still names `academyId`. */
export function clearLastAcademy(
  owner: LastAcademyOwner,
  academyId: string
): void {
  if (typeof window === 'undefined' || !owner.userId || !owner.organizationId)
    return;
  try {
    const key = storageKey(owner.userId, owner.organizationId);
    if (localStorage.getItem(key) === academyId) localStorage.removeItem(key);
  } catch {
    // Storage unavailable.
  }
}
