/**
 * useInstructorSubmissions hook.
 *
 * Fetches every student's submissions for a course assignment, for an
 * authorized instructor.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { instructorKeys } from '@services/query';
import { instructorService } from '../services/InstructorService';
import type {
  AssignmentSubmissionReview,
  CollectionQuery,
  PaginatedResult,
} from '@types';

export interface UseInstructorSubmissionsOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useInstructorSubmissions(
  courseId: string,
  assignmentId: string,
  options?: UseInstructorSubmissionsOptions
) {
  const { query, enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<AssignmentSubmissionReview>>({
    queryKey: instructorKeys.submissions(user?.id, courseId, assignmentId, query),
    queryFn: () =>
      instructorService.getAssignmentSubmissions(courseId, assignmentId, query),
    enabled: enabled && !!user?.id && !!courseId && !!assignmentId,
  });
}
