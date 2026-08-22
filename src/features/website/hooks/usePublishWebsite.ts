/**
 * usePublishWebsite hook.
 *
 * Never auto-retried — this IS the explicit, user-triggered publish
 * action. Never marks the website "Published" until the backend response
 * confirms it (the mutation's resolved `WebsiteConfiguration.status` is
 * the only source of truth `WebsitePublishBar` reads).
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { WebsiteConfiguration } from '@types';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export function usePublishWebsite() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsiteConfiguration, string, ApiError>({
    mutationFn: (academyId) => websiteConfigurationService.publishConfiguration(academyId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, academyId) => {
      await invalidate(websiteKeys.configuration(academyId));
    },
  });
}
