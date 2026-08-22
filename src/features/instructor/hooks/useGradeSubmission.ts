/**
 * useGradeSubmission hook.
 *
 * Mutation hook for grading a submission. Scoring/pass-fail rules stay
 * entirely behind the service abstraction — this hook only forwards the
 * score/feedback the instructor enters.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { instructorKeys } from '@services/query';
import type { ApiError } from '@api';
import { instructorService } from '../services/InstructorService';
import type { AssignmentSubmissionReview, GradeSubmissionPayload } from '@types';

export function useGradeSubmission(courseId: string, assignmentId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<
    AssignmentSubmissionReview,
    { readonly submissionId: string; readonly payload: GradeSubmissionPayload },
    ApiError
  >({
    mutationFn: ({ submissionId, payload }) =>
      instructorService.gradeSubmission(
        courseId,
        assignmentId,
        submissionId,
        payload
      ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      // Deliberately omits the variable `query` element so this prefix
      // matches every filtered/paginated variant of the submissions list —
      // `instructorKeys.submissions(...)` would otherwise only match the
      // exact (often absent) query object used at invalidation time.
      await invalidate([
        ...instructorKeys.all,
        'submissions',
        user?.id,
        courseId,
        assignmentId,
      ]);
    },
  });
}
