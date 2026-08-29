
/**
 * useCreateAcademy hook.
 *
 * Mutation hook for creating a new academy.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyService } from '../services/AcademyService';
import type { Academy, CreateAcademyPayload } from '@types';

export function useCreateAcademy() {
  const { invalidate } = useInvalidate();
  // The route this hook is used from (`academyCreate`) already requires the
  // `academy.view` permission, which only exists via an organization
  // membership — `organization` is guaranteed set by the time this fires.
  const { organization } = useAuth();

  return useApiMutation<Academy, CreateAcademyPayload, ApiError>({
    mutationFn: (payload) => academyService.createAcademy(organization!.id, payload),
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

