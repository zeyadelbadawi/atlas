/**
 * useUpdateAcademyBranding hook.
 *
 * Mutation hook for updating academy branding.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyService } from '../services/AcademyService';
import type { Academy, UpdateAcademyBrandingPayload } from '@types';

export interface UpdateAcademyBrandingVariables {
  readonly id: string;
  readonly payload: UpdateAcademyBrandingPayload;
}

export function useUpdateAcademyBranding() {
  const { invalidate } = useInvalidate();

  return useApiMutation<Academy, UpdateAcademyBrandingVariables, ApiError>({
    mutationFn: ({ id, payload }) =>
      academyService.updateAcademyBranding(id, payload),
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