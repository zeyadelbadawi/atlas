/**
 * Learning status → tone mapping.
 *
 * Centralizes how enrollment/lesson/quiz/assignment states map onto the
 * shared `StatusBadge` tones, matching the same pattern already used for
 * Academy and Course status.
 */
import type { StatusTone } from '@components/data-display';
import type {
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
