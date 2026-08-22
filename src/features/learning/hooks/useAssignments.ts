/**
 * useAssignments hook.
 *
 * Fetches the assignments belonging to a course using TanStack Query.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { assignmentKeys } from '@services/query';
import { assignmentService } from '../services/AssignmentService';
import type { Assignment, PaginatedResult } from '@types';

export interface UseAssignmentsOptions {
  readonly enabled?: boolean;
}

export function useAssignments(
  courseId: string,
  options?: UseAssignmentsOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<Assignment>>({
    queryKey: assignmentKeys.list(user?.id, courseId),
    queryFn: () => assignmentService.getAssignments(courseId),
    enabled: enabled && !!user?.id && !!courseId,
  });
}
