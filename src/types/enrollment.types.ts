/**
 * Enrollment domain types.
 *
 * An enrollment is the relationship between a student and a course. It is
 * always scoped to the current authenticated user — there is no shape here
 * that lets one student's UI address another student's enrollment.
 */
import type { Course } from './course.types';
import type {
  CourseCompletionState,
  CertificateStatus,
} from './progress.types';

/** Enrollment lifecycle status. */
export type EnrollmentStatus =
  'available' | 'pending' | 'enrolled' | 'completed' | 'unavailable';

/** A slim progress summary for list views — see `EnrollmentResponse.progress`'s doc comment on the backend for why this is a totals-only projection, not the full per-lesson `CourseProgress`. */
export interface EnrollmentProgressSummary {
  readonly totalLessons: number;
  readonly completedLessons: number;
  readonly percentage: number;
  readonly currentLessonId?: string;
  readonly completionState: CourseCompletionState;
  readonly certificateStatus: CertificateStatus;
}

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
  /** Only populated by `GET /enrollments` (the "My Learning" list) — see
   * `EnrollmentResponse.course`'s doc comment on the backend for why. */
  readonly course?: Course;
  /** Only populated by `GET /enrollments` (the "My Learning" list) — see `EnrollmentResponse.progress`'s doc comment on the backend. */
  readonly progress?: EnrollmentProgressSummary;
}

/** Enrollment creation payload. */
export interface CreateEnrollmentPayload {
  readonly courseId: string;
}
