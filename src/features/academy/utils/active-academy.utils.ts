/**
 * Reconciles the remembered "active academy" against the academies the
 * signed-in account can actually reach in its active organization.
 *
 * WHY THIS EXISTS. `atlas:active-academy` is a per-browser convenience, not
 * a fact about the account: it is written whenever someone picks an academy
 * and restored verbatim on the next page load. Nothing tied it to who was
 * signed in, so after an account switch in the same browser — or after the
 * remembered academy was archived — every academy-scoped sidebar link
 * (Courses, Members, Website, …) was built from an id the current account
 * has no right to. The API refused each request correctly (403 from
 * `AcademyScopeGuard`), and the product showed a Client Owner "You do not
 * have access" on their own dashboard. Verified in production on
 * 22 Sep 2026: a dashboard session was carrying the id of an archived
 * smoke-test academy from a deleted organization.
 *
 * This never grants anything: an academy is only ever chosen from the list
 * the backend already returned for the caller's organization, and every
 * page and API call behind it stays independently authorised.
 */
import type { AcademyStatus } from '@types';

export interface ReconcilableAcademy {
  readonly id: string;
  readonly status: AcademyStatus;
}

export interface ActiveAcademyReconciliation {
  /** The id to hold after reconciliation — `undefined` when none qualifies. */
  readonly academyId: string | undefined;
  /** `true` when the stored id must be replaced or cleared. */
  readonly changed: boolean;
}

function isSelectable(academy: ReconcilableAcademy): boolean {
  return academy.status !== 'archived';
}

/**
 * @param activeAcademyId The id currently remembered (may be stale).
 * @param academies The academies the backend returned for the active
 *   organization, or `undefined` while that list is still loading — in
 *   which case nothing is decided yet and the stored id is left alone.
 */
export function reconcileActiveAcademy(
  activeAcademyId: string | undefined,
  academies: readonly ReconcilableAcademy[] | undefined
): ActiveAcademyReconciliation {
  if (academies === undefined) {
    return { academyId: activeAcademyId, changed: false };
  }

  const current = activeAcademyId
    ? academies.find((academy) => academy.id === activeAcademyId)
    : undefined;
  if (current && isSelectable(current)) {
    return { academyId: activeAcademyId, changed: false };
  }

  // Mirrors `AcademyDashboardPage`, which defaults to the first academy the
  // organization holds — the one place that already self-healed this state.
  const fallback = academies.find(isSelectable)?.id;
  return { academyId: fallback, changed: fallback !== activeAcademyId };
}
