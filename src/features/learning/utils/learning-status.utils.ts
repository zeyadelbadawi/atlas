/**
 * Learning status → tone mapping.
 *
 * Centralizes how enrollment/lesson/quiz/assignment states map onto the
 * shared `StatusBadge` tones, matching the same pattern already used for
 * Academy and Course status.
 */
import type { StatusTone } from '@components/data-display';
import type {
  Enrollment,
  EnrollmentStatus,
  LessonProgressStatus,
  CourseCompletionState,
  QuizAttemptStatus,
  AssignmentSubmissionStatus,
} from '@types';

export function getEnrollmentStatusTone(status: EnrollmentStatus): StatusTone {
  switch (status) {
    case 'enrolled':
      return 'info';
    case 'completed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'unavailable':
      return 'destructive';
    case 'available':
    default:
      return 'neutral';
  }
}

export function getLessonStatusTone(status: LessonProgressStatus): StatusTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'locked':
      return 'neutral';
    case 'available':
    default:
      return 'neutral';
  }
}

export function getCourseCompletionTone(
  state: CourseCompletionState
): StatusTone {
  switch (state) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'incomplete':
    default:
      return 'neutral';
  }
}

export function getQuizAttemptStatusTone(
  status: QuizAttemptStatus
): StatusTone {
  switch (status) {
    case 'passed':
      return 'success';
    case 'failed':
      return 'destructive';
    case 'submitted':
      return 'info';
    case 'in_progress':
      return 'warning';
    case 'not_started':
    default:
      return 'neutral';
  }
}

export function getSubmissionStatusTone(
  status: AssignmentSubmissionStatus
): StatusTone {
  switch (status) {
    case 'submitted':
      return 'success';
    case 'failed':
      return 'destructive';
    case 'submitting':
      return 'warning';
    case 'draft':
    default:
      return 'neutral';
  }
}

/**
 * P64 Phase 1 — whether a learner's own enrollment card must stop
 * offering an action, because the backend will refuse the content.
 *
 * `isActive` is the backend's answer (`isEnrollmentActive`: an accepted
 * status, not revoked, not past `expiresAt`) and is the only input that
 * decides it — `status` alone is not enough, since an expired enrollment
 * still reads `enrolled`. A completed course is deliberately exempt: the
 * learner keeps reaching their result and certificate after the access
 * window closes.
 *
 * This is presentation only. The refusal that protects the content is the
 * server's; this just stops the interface from contradicting it.
 */
export function isEnrollmentAccessEnded(
  enrollment: Pick<Enrollment, 'status' | 'isActive'>,
): boolean {
  return enrollment.isActive === false && enrollment.status !== 'completed';
}
