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
import {
  useAcademyBoundMutation,
  useApiMutation,
  useApiQuery,
  useAuth,
} from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
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

/**
 * W5 (F9) — the academy travels in the mutation's VARIABLES and every
 * callback (optimistic write, rollback, refetch) derives its cache key from
 * them, never from the render-time `academyId`: a save made in academy A
 * that settles after a switch to B still writes and rolls back A's entry.
 * Call sites keep `mutate(payload)` (see `useAcademyBoundMutation`).
 */
export function useUpdateAcademyCommunicationSettings(academyId: string) {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const organizationId = organization?.id;
  const keyFor = (id: string) =>
    academyKeys.communicationSettings(organizationId, id);

  const mutation = useApiMutation<
    AcademyCommunicationSettings,
    AcademyScopedVariables<UpdateAcademyCommunicationSettingsPayload>,
    ApiError,
    OptimisticContext
  >({
    mutationFn: ({ academyId: id, payload }) =>
      academyCommunicationSettingsService.update(id, payload),
    onMutate: async ({ academyId: id, payload }) => {
      const queryKey = keyFor(id);
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
    onError: (_error, { academyId: id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(keyFor(id), context.previous);
      }
    },
    onSettled: async (_data, _error, { academyId: id }) => {
      await queryClient.invalidateQueries({ queryKey: keyFor(id) });
    },
    showSuccessToast: false,
    showErrorToast: false,
  });

  return useAcademyBoundMutation(mutation, academyId);
}
