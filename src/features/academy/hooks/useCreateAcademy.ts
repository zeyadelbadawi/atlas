
/**
 * useCreateAcademy hook.
 *
 * Mutation hook for creating a new academy.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyService } from '../services/AcademyService';
import type { Academy, CreateAcademyPayload } from '@types';

export function useCreateAcademy() {
  const { invalidate } = useInvalidate();

  return useApiMutation<Academy, CreateAcademyPayload, ApiError>({
    mutationFn: (payload) => academyService.createAcademy(payload),
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

