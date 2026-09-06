/**
 * useAssignmentForAuthoring hook.
 *
 * Phase 4 — fetches a single assignment (any status) for an authoring user.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { assignmentKeys } from '@services/query';
import { assignmentService } from '../services/AssignmentService';
import type { Assignment } from '@types';

export interface UseAssignmentForAuthoringOptions {
  readonly enabled?: boolean;
}

export function useAssignmentForAuthoring(
  courseId: string,
  assignmentId: string | undefined,
  options?: UseAssignmentForAuthoringOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<Assignment>({
    queryKey: assignmentKeys.authoringDetail(
      user?.id,
      courseId,
      assignmentId ?? ''
    ),
    queryFn: () =>
      assignmentService.getAssignmentForAuthoring(
        courseId,
        assignmentId as string
      ),
    enabled: enabled && !!user?.id && !!courseId && !!assignmentId,
  });
}
