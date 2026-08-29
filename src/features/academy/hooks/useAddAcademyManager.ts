/**
 * useAddAcademyManager hook.
 *
 * Mutation hook for granting an already-registered Atlas user Manager
 * access to an academy (`AcademyService.addAcademyManager`).
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyService } from '../services/AcademyService';
import type { AcademyMember, AddAcademyManagerPayload } from '@types';

export interface AddAcademyManagerVariables {
  readonly academyId: string;
  readonly payload: AddAcademyManagerPayload;
}

export function useAddAcademyManager() {
  const { invalidate } = useInvalidate();

  return useApiMutation<AcademyMember, AddAcademyManagerVariables, ApiError>({
    mutationFn: ({ academyId, payload }) =>
      academyService.addAcademyManager(academyId, payload),
    // The dialog shows its own contextual success/error toast and maps
    // known error kinds to a friendly message, so the mutation's generic
    // toast is suppressed to avoid showing the user two messages for one
    // outcome.
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(academyKeys.all);
    },
  });
}
