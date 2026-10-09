/**
 * useRemoveAcademyMember hook.
 *
 * Mutation hook for removing a staff member from an academy
 * (`AcademyService.removeAcademyMember`, Organization Owner only).
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { academyKeys, dashboardOverviewKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyService } from '../services/AcademyService';

export interface RemoveAcademyMemberVariables {
  readonly academyId: string;
  readonly userId: string;
}

export function useRemoveAcademyMember() {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, RemoveAcademyMemberVariables, ApiError>({
    mutationFn: ({ academyId, userId }) =>
      academyService.removeAcademyMember(academyId, userId),
    // The page shows its own contextual success/error toast.
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(academyKeys.all);
      await invalidate(dashboardOverviewKeys.overviews());
    },
  });
}
