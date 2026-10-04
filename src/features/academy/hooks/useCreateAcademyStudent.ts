/**
 * useCreateAcademyStudent hook.
 *
 * Mutation hook for creating a brand-new test/real student account
 * (`AcademyService.createAcademyStudent`).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { INLINE_ERRORS_META, invalidateRoster } from '@services/query';
import type { ApiError } from '@api';
import { academyService } from '../services/AcademyService';
import type {
  AcademyStudentAddResult,
  CreateAcademyStudentPayload,
} from '@types';

export interface CreateAcademyStudentVariables {
  readonly academyId: string;
  readonly payload: CreateAcademyStudentPayload;
}

export function useCreateAcademyStudent() {
  const queryClient = useQueryClient();

  return useApiMutation<
    AcademyStudentAddResult,
    CreateAcademyStudentVariables,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      academyService.createAcademyStudent(academyId, payload),
    // A student account is never listed on the Academy Members page (no
    // academy_members row is created), so the members list is untouched —
    // but the learner IS on the roster and in the academy's counts.
    showSuccessToast: false,
    showErrorToast: false,
    // The form renders every failure itself (fields, a taken name on the
    // name field — W4 — or its own message), so the app-wide error toast
    // stays quiet instead of repeating it.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async (_result, { academyId }) => {
      await invalidateRoster(queryClient, { academyId });
    },
  });
}
