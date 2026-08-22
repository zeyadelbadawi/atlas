/**
 * useCreateWebsitePage hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { CreateWebsitePagePayload, WebsitePage } from '@types';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export interface CreateWebsitePageVariables {
  readonly academyId: string;
  readonly payload: CreateWebsitePagePayload;
}

export function useCreateWebsitePage() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsitePage, CreateWebsitePageVariables, ApiError>({
    mutationFn: ({ academyId, payload }) =>
      websiteConfigurationService.createPage(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.pages(variables.academyId));
    },
  });
}
