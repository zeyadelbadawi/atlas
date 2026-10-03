/**
 * Staff hooks over the course completion rule (P64 Phase 3, AD-11).
 */
import {
  useApiMutation,
  useApiQuery,
  useInvalidate,
  useAcademyBoundMutation,
} from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import { completionKeys, quizKeys, assignmentKeys } from '@services/query';
import type { ApiError } from '@api';
import { completionService } from '../services/CompletionService';
import type { CourseCompletionRule, UpdateCompletionRulePayload } from '@types';

export interface UseCompletionRuleOptions {
  readonly enabled?: boolean;
}

export function useCompletionRule(
  academyId: string,
  courseId: string,
  options?: UseCompletionRuleOptions
) {
  const { enabled = true } = options ?? {};

  return useApiQuery<CourseCompletionRule, ApiError>({
    queryKey: completionKeys.rule(academyId, courseId),
    queryFn: () => completionService.getCompletionRule(academyId, courseId),
    enabled: enabled && !!academyId && !!courseId,
  });
}

export function useUpdateCompletionRule(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();

  const mutation = useApiMutation<
    CourseCompletionRule,
    AcademyScopedVariables<UpdateCompletionRulePayload>,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      completionService.updateCompletionRule(academyId, courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { academyId }) => {
      await invalidate(completionKeys.rule(academyId, courseId));
      // Required flags live on the quizzes and assignments themselves.
      await invalidate(quizKeys.all);
      await invalidate(assignmentKeys.all);
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
