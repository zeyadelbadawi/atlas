/**
 * useUpdateWebsiteConfiguration hook.
 *
 * Updates the draft only — never what is published. The page shows its
 * own contextual success/error feedback, so the generic mutation toast is
 * suppressed (consistent with every settings-form mutation elsewhere in
 * Atlas).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  UpdateWebsiteConfigurationPayload,
  WebsiteConfiguration,
} from '@types';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export interface UpdateWebsiteConfigurationVariables {
  readonly academyId: string;
  readonly payload: UpdateWebsiteConfigurationPayload;
}

export function useUpdateWebsiteConfiguration() {
  const { invalidate } = useInvalidate();
  const queryClient = useQueryClient();

  return useApiMutation<
    WebsiteConfiguration,
    UpdateWebsiteConfigurationVariables,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      websiteConfigurationService.updateConfiguration(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (data, variables) => {
      // The saved copy is on screen at once, so the next edit is based on
      // it (and its `updatedAt`) rather than on the copy before this save.
      queryClient.setQueryData(
        websiteKeys.configuration(variables.academyId),
        data
      );
      await invalidate(websiteKeys.configuration(variables.academyId));
    },
  });
}
