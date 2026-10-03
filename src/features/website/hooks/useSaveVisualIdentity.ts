/**
 * useSaveVisualIdentity hook — the one "Save Visual Identity" (Task G).
 *
 * The saved Academy and configuration are put in the cache at once, so
 * the next edit is based on them (and the configuration's `updatedAt`);
 * the Academy reads elsewhere (switcher, sidebar, dashboard) refresh.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { academyKeys, websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  SaveVisualIdentityPayload,
  SaveVisualIdentityResponse,
} from '@types';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export interface SaveVisualIdentityVariables {
  readonly academyId: string;
  readonly payload: SaveVisualIdentityPayload;
}

export function useSaveVisualIdentity() {
  const { invalidate } = useInvalidate();
  const queryClient = useQueryClient();

  return useApiMutation<
    SaveVisualIdentityResponse,
    SaveVisualIdentityVariables,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      websiteConfigurationService.saveVisualIdentity(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (data, { academyId }) => {
      queryClient.setQueryData(
        websiteKeys.configuration(academyId),
        data.configuration
      );
      await invalidate(websiteKeys.configuration(academyId));
      await invalidate(academyKeys.all);
    },
  });
}
