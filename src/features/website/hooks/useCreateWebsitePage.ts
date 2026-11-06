/**
 * useCreateWebsitePage hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { INLINE_ERRORS_META, websiteKeys } from '@services/query';
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
    // B2 (V09) — the New page dialog shows every failure itself (a taken
    // or reserved address on its field, anything else as one alert): a
    // toast would open under the dialog's overlay, unseen.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.allPages(variables.academyId));
    },
  });
}
