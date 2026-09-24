/**
 * Academy communication settings hooks (P66).
 *
 * The update is OPTIMISTIC: the card's controls reflect the chosen value
 * the moment it is chosen, and the cache is rolled back to what the
 * server last confirmed if the save is refused — so a Manager whose 403
 * the client did not anticipate sees the real value come back, not a
 * value that was never saved.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery, useAuth } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyCommunicationSettingsService } from '../services/AcademyCommunicationSettingsService';
import type {
  AcademyCommunicationSettings,
  UpdateAcademyCommunicationSettingsPayload,
} from '@types';

export function useAcademyCommunicationSettings(academyId: string) {
  const { organization } = useAuth();

  return useApiQuery<AcademyCommunicationSettings, ApiError>({
    queryKey: academyKeys.communicationSettings(organization?.id, academyId),
    queryFn: () => academyCommunicationSettingsService.get(academyId),
    enabled: !!academyId,
  });
}

interface OptimisticContext {
  readonly previous: AcademyCommunicationSettings | undefined;
}

export function useUpdateAcademyCommunicationSettings(academyId: string) {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const queryKey = academyKeys.communicationSettings(
    organization?.id,
    academyId
  );

  return useApiMutation<
    AcademyCommunicationSettings,
    UpdateAcademyCommunicationSettingsPayload,
    ApiError,
    OptimisticContext
  >({
    mutationFn: (payload) =>
      academyCommunicationSettingsService.update(academyId, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<AcademyCommunicationSettings>(queryKey);
      if (previous) {
        queryClient.setQueryData<AcademyCommunicationSettings>(queryKey, {
          ...previous,
          ...payload,
        });
      }
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
    showSuccessToast: false,
    showErrorToast: false,
  });
}
