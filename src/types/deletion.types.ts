/**
 * The deletion plan contract.
 *
 * Mirrors `atlas-backend/src/identity/services/deletion-plan.service.ts`
 * field for field. The backend deliberately returns translation KEYS and
 * counts, never sentences, so the wording a person reads immediately
 * before an irreversible act lives in the locale files under review rather
 * than in an API response.
 *
 * Shared rather than scoped to `features/platform`, because the same plan
 * drives two surfaces: the account holder's own confirmation and the
 * Platform Owner's administrative one. Two copies of this type would be
 * two chances for one of them to describe a deletion inaccurately.
 */

/**
 * What happens to a group of records. Atlas cannot hard-delete most of
 * what a person touches, so "deleted" is five different behaviours and the
 * plan names which one applies rather than implying a single one.
 */
export type DeletionTreatment =
  /** The bytes or rows genuinely cease to exist. */
  | 'destroy'
  /** The row survives; the person in it does not. */
  | 'deidentify'
  /** Kept intact, pointing at an anonymised subject. */
  | 'retain'
  /** Kept only as a marker, so history stays legible and nothing 404s. */
  | 'tombstone'
  /** Access is withdrawn immediately; the record of it may remain. */
  | 'revoke';

/** The role the plan is framed around — whichever consequence is largest. */
export type DeletionSubjectRole =
  | 'platform_owner'
  | 'client_owner'
  | 'manager'
  | 'instructor'
  | 'student'
  | 'member';

export interface DeletionPlanLine {
  /** Stable identifier and i18n key suffix — `deletion:plan.<key>`. */
  readonly key: string;
  readonly treatment: DeletionTreatment;
  readonly count: number;
  /** A few concrete names, already capped by the server. */
  readonly examples?: readonly string[];
}

export interface DeletionPlan {
  readonly userId: string;
  readonly subjectRole: DeletionSubjectRole;
  /** False when this account may not be deleted at all. */
  readonly deletable: boolean;
  /** A translation key, present only when `deletable` is false. */
  readonly refusalKey?: string;
  /** True when the account is already deleted; the plan is then empty. */
  readonly alreadyDeleted: boolean;
  readonly lines: readonly DeletionPlanLine[];
}

/** What the deletion itself reports back. */
export interface DeleteUserResult {
  readonly deleted: boolean;
  readonly academiesArchived: number;
}
