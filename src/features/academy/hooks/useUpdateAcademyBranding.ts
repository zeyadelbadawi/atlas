/**
 * useUpdateAcademyBranding hook.
 *
 * Mutation hook for updating academy branding.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { INLINE_ERRORS_META, invalidateBranding } from '@services/query';
import type { ApiError } from '@api';
import { academyService } from '../services/AcademyService';
import type { Academy, UpdateAcademyBrandingPayload } from '@types';

export interface UpdateAcademyBrandingVariables {
  readonly id: string;
  readonly payload: UpdateAcademyBrandingPayload;
}

export function useUpdateAcademyBranding() {
  const queryClient = useQueryClient();

  return useApiMutation<Academy, UpdateAcademyBrandingVariables, ApiError>({
    mutationFn: ({ id, payload }) =>
      academyService.updateAcademyBranding(id, payload),
    // The page shows its own contextual success/error toast and maps
    // validation errors onto form fields, so the mutation's generic toast is
    // suppressed to avoid showing the user two messages for one failure.
    showSuccessToast: false,
    showErrorToast: false,
    // The form renders every failure itself (fields, a taken name on the
    // name field — W4 — or its own message), so the app-wide error toast
    // stays quiet instead of repeating it.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async (_academy, { id }) => {
      // Not just the academy reads: the LMS/public logo comes from the
      // identity read, cached for five minutes unless told otherwise.
      await invalidateBranding(queryClient, id);
    },
  });
}
