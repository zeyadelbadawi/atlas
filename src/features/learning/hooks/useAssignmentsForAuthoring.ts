/**
 * useAssignmentsForAuthoring hook.
 *
 * Phase 4 — fetches every assignment belonging to a course (draft +
 * published) for an authoring user (course instructor or Owner/Manager).
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { assignmentKeys } from '@services/query';
import { assignmentService } from '../services/AssignmentService';
import type { Assignment, PaginatedResult } from '@types';

export interface UseAssignmentsForAuthoringOptions {
  readonly enabled?: boolean;
}

export function useAssignmentsForAuthoring(
  courseId: string,
  options?: UseAssignmentsForAuthoringOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<Assignment>>({
    queryKey: assignmentKeys.authoringList(user?.id, courseId),
    queryFn: () => assignmentService.getAssignmentsForAuthoring(courseId),
    enabled: enabled && !!user?.id && !!courseId,
  });
}
