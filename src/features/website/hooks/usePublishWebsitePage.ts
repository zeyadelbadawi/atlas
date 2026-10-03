/**
 * usePublishWebsitePage hook.
 *
 * Publishes one page without republishing the whole site. Never retried
 * automatically, and nothing is shown as published until the backend's
 * response says so — the same rules as `usePublishWebsite`.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { WebsitePage } from '@types';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export interface PublishWebsitePageVariables {
  readonly academyId: string;
  readonly pageId: string;
  /** Pins the publish to this saved version (see `publishPage`). */
  readonly expectedVersion?: number;
}

export function usePublishWebsitePage() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsitePage, PublishWebsitePageVariables, ApiError>({
    mutationFn: ({ academyId, pageId, expectedVersion }) =>
      websiteConfigurationService.publishPage(
        academyId,
        pageId,
        expectedVersion
      ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { academyId, pageId }) => {
      await invalidate(websiteKeys.page(academyId, pageId));
      await invalidate(websiteKeys.allPages(academyId));
      // The pending-changes count on the publish bar.
      await invalidate(websiteKeys.configuration(academyId));
    },
  });
}
