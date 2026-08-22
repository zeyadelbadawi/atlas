/**
 * useAssignment hook.
 *
 * Fetches a single assignment using TanStack Query.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { assignmentKeys } from '@services/query';
import { assignmentService } from '../services/AssignmentService';
import type { Assignment } from '@types';

export interface UseAssignmentOptions {
  readonly enabled?: boolean;
}

export function useAssignment(
  courseId: string,
  assignmentId: string,
  options?: UseAssignmentOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<Assignment>({
    queryKey: assignmentKeys.detail(user?.id, courseId, assignmentId),
    queryFn: () => assignmentService.getAssignment(courseId, assignmentId),
    enabled: enabled && !!user?.id && !!courseId && !!assignmentId,
  });
}
