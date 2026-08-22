/**
 * useDeleteWebsitePage hook.
 *
 * Custom pages only — the backend rejects deleting a core page; the UI
 * never offers the action for one.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export interface DeleteWebsitePageVariables {
  readonly academyId: string;
  readonly pageId: string;
}

export function useDeleteWebsitePage() {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, DeleteWebsitePageVariables, ApiError>({
    mutationFn: ({ academyId, pageId }) =>
      websiteConfigurationService.deletePage(academyId, pageId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.pages(variables.academyId));
    },
  });
}
