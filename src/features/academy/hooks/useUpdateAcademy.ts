/**
 * useUpdateAcademy hook.
 *
 * Mutation hook for updating an existing academy.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyService } from '../services/AcademyService';
import type { Academy, UpdateAcademyPayload } from '@types';

export interface UpdateAcademyVariables {
  readonly id: string;
  readonly payload: UpdateAcademyPayload;
}

export function useUpdateAcademy() {
  const { invalidate } = useInvalidate();

  return useApiMutation<Academy, UpdateAcademyVariables, ApiError>({
    mutationFn: ({ id, payload }) => academyService.updateAcademy(id, payload),
    // The page shows its own contextual success/error toast and maps
    // validation errors onto form fields, so the mutation's generic toast is
    // suppressed to avoid showing the user two messages for one failure.
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(academyKeys.all);
    },
  });
}