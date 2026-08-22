/**
 * useUpdateWebsitePage hook.
 *
 * The one write path for everything on a page: title/slug/visibility/SEO
 * AND the full section composition (add/remove/hide/edit/duplicate) —
 * see `WebsiteConfigurationService`'s doc comment for why this is a
 * single PATCH rather than granular per-action endpoints.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { UpdateWebsitePagePayload, WebsitePage } from '@types';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export interface UpdateWebsitePageVariables {
  readonly academyId: string;
  readonly pageId: string;
  readonly payload: UpdateWebsitePagePayload;
}

export function useUpdateWebsitePage() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsitePage, UpdateWebsitePageVariables, ApiError>({
    mutationFn: ({ academyId, pageId, payload }) =>
      websiteConfigurationService.updatePage(academyId, pageId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.page(variables.academyId, variables.pageId));
      await invalidate(websiteKeys.pages(variables.academyId));
    },
  });
}
