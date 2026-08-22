/**
 * Enrollment domain types.
 *
 * An enrollment is the relationship between a student and a course. It is
 * always scoped to the current authenticated user — there is no shape here
 * that lets one student's UI address another student's enrollment.
 */

/** Enrollment lifecycle status. */
export type EnrollmentStatus =
  | 'available'
  | 'pending'
  | 'enrolled'
  | 'completed'
  | 'unavailable';

/** Enrollment entity. */
export interface Enrollment {
  readonly id: string;
  readonly studentId: string;
  readonly courseId: string;
  /** The academy the enrolled course belongs to — lets learning pages reach
   * the existing academy-scoped Course endpoints without an academy id in
   * the student-facing URL. */
  readonly academyId: string;
  readonly status: EnrollmentStatus;
  readonly enrolledAt?: string;
  readonly completedAt?: string;
}

/** Enrollment creation payload. */
export interface CreateEnrollmentPayload {
  readonly courseId: string;
}
