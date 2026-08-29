/**
 * useAddAcademyInstructor hook.
 *
 * Mutation hook for granting Instructor access to an academy
 * (`AcademyService.addAcademyInstructor`).
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyService } from '../services/AcademyService';
import type { AcademyMember, AddAcademyInstructorPayload } from '@types';

export interface AddAcademyInstructorVariables {
  readonly academyId: string;
  readonly payload: AddAcademyInstructorPayload;
}

export function useAddAcademyInstructor() {
  const { invalidate } = useInvalidate();

  return useApiMutation<AcademyMember, AddAcademyInstructorVariables, ApiError>({
    mutationFn: ({ academyId, payload }) =>
      academyService.addAcademyInstructor(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(academyKeys.all);
    },
  });
}
