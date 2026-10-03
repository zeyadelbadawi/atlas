/**
 * useAddAcademyInstructor hook.
 *
 * Mutation hook for granting Instructor access to an academy
 * (`AcademyService.addAcademyInstructor`).
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { academyKeys, dashboardOverviewKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyService } from '../services/AcademyService';
import type {
  AcademyMemberAddResult,
  AddAcademyInstructorPayload,
} from '@types';

export interface AddAcademyInstructorVariables {
  readonly academyId: string;
  readonly payload: AddAcademyInstructorPayload;
}

export function useAddAcademyInstructor() {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    AcademyMemberAddResult,
    AddAcademyInstructorVariables,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      academyService.addAcademyInstructor(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(academyKeys.all);
      // The dashboard's member counts live outside the academy tree.
      await invalidate(dashboardOverviewKeys.overviews());
    },
  });
}
