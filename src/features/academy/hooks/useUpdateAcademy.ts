/**
 * useUpdateAcademy hook.
 *
 * Mutation hook for updating an existing academy.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import {
  INLINE_ERRORS_META,
  academyKeys,
  publicWebsiteKeys,
} from '@services/query';
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
    // Both pages render every failure (fields, a taken name on the name
    // field — W4 — or their own toast), so the app-wide error toast stays
    // quiet too; it repeated the name-field message as a second toast.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async (_academy, { id }) => {
      await invalidate(academyKeys.all);
      // The academy name shown by the LMS/public shell comes from the
      // identity read, cached for five minutes unless told otherwise.
      await invalidate(publicWebsiteKeys.identity(id));
    },
  });
}
