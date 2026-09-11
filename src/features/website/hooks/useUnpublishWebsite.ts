/**
 * useUnpublishWebsite hook.
 *
 * The mirror of `usePublishWebsite`, and deliberately identical in shape:
 * never auto-retried, and the resolved `WebsiteConfiguration.status` from
 * the backend is the only thing that moves the UI. The frontend never
 * decides on its own that a site went offline.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { WebsiteConfiguration } from '@types';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export function useUnpublishWebsite() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsiteConfiguration, string, ApiError>({
    mutationFn: (academyId) =>
      websiteConfigurationService.unpublishConfiguration(academyId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, academyId) => {
      await invalidate(websiteKeys.configuration(academyId));
    },
  });
}
