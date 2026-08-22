/**
 * Learning progress domain types.
 *
 * Progress is derived by the (abstract) backend, never computed in the
 * frontend — the UI only displays the states below, it never decides why a
 * lesson is locked or when a course counts as complete.
 */

/** A lesson's availability/completion state for the current student. */
export type LessonProgressStatus =
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'completed';

/** One lesson's progress within a course. */
export interface LessonProgress {
  readonly lessonId: string;
  readonly sectionId: string;
  readonly courseId: string;
  readonly status: LessonProgressStatus;
  readonly completedAt?: string;
}

/** One section's aggregated lesson progress. */
export interface SectionProgress {
  readonly sectionId: string;
  readonly totalLessons: number;
  readonly completedLessons: number;
}

/** A course's overall completion state. */
export type CourseCompletionState = 'incomplete' | 'in_progress' | 'completed';

/** Certificate availability state. No generation/storage/verification implied. */
export type CertificateStatus = 'unavailable' | 'eligible';

/** A student's aggregated progress through a course. */
export interface CourseProgress {
  readonly courseId: string;
  readonly totalLessons: number;
  readonly completedLessons: number;
  /** 0–100. */
  readonly percentage: number;
  /** The lesson the student should resume at, if any. */
  readonly currentLessonId?: string;
  readonly sections: readonly SectionProgress[];
  /** Per-lesson status, used to render the curriculum sidebar's lock/complete state. */
  readonly lessons: readonly LessonProgress[];
  readonly completionState: CourseCompletionState;
  readonly certificateStatus: CertificateStatus;
}

/** Marks a lesson complete for the current student. */
export interface CompleteLessonPayload {
  readonly lessonId: string;
}
