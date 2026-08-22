/**
 * useUpdateWebsiteConfiguration hook.
 *
 * Updates the draft only — never what is published. The page shows its
 * own contextual success/error feedback, so the generic mutation toast is
 * suppressed (consistent with every settings-form mutation elsewhere in
 * Atlas).
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { UpdateWebsiteConfigurationPayload, WebsiteConfiguration } from '@types';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export interface UpdateWebsiteConfigurationVariables {
  readonly academyId: string;
  readonly payload: UpdateWebsiteConfigurationPayload;
}

export function useUpdateWebsiteConfiguration() {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    WebsiteConfiguration,
    UpdateWebsiteConfigurationVariables,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      websiteConfigurationService.updateConfiguration(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.configuration(variables.academyId));
    },
  });
}
