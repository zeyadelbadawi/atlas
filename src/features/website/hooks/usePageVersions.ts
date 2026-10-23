/**
 * CMS phase 4 — a page's history: its kept versions, one version in full
 * (for the preview), and restoring one to the draft.
 *
 * A restore writes the DRAFT only (never what is live), so afterwards the
 * page, the page lists (the "unpublished changes" marker), the publish
 * bar's pending count and the history itself (a new `restore_backup`
 * entry) are all refreshed. The restored page is put in the cache at once,
 * so the editor shows it without waiting for the refetch.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  WebsitePage,
  WebsitePageVersion,
  WebsitePageVersionSummary,
} from '@types';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export function useWebsitePageVersions(
  academyId: string,
  pageId: string,
  enabled = true
) {
  return useApiQuery<
    { readonly items: readonly WebsitePageVersionSummary[] },
    ApiError
  >({
    queryKey: websiteKeys.pageVersions(academyId, pageId),
    queryFn: () =>
      websiteConfigurationService.getPageVersions(academyId, pageId),
    enabled: enabled && !!academyId && !!pageId,
  });
}

export function useWebsitePageVersion(
  academyId: string,
  pageId: string,
  versionId: string | undefined
) {
  return useApiQuery<WebsitePageVersion, ApiError>({
    queryKey: websiteKeys.pageVersion(academyId, pageId, versionId ?? ''),
    queryFn: () =>
      websiteConfigurationService.getPageVersion(
        academyId,
        pageId,
        versionId ?? ''
      ),
    // A kept version never changes.
    staleTime: Infinity,
    enabled: !!academyId && !!pageId && !!versionId,
  });
}

export interface RestoreWebsitePageVersionVariables {
  readonly academyId: string;
  readonly pageId: string;
  readonly versionId: string;
  /** The page's current `version` (required by the API). */
  readonly expectedVersion: number;
}

export function useRestoreWebsitePageVersion() {
  const queryClient = useQueryClient();
  const { invalidate } = useInvalidate();

  return useApiMutation<
    WebsitePage,
    RestoreWebsitePageVersionVariables,
    ApiError
  >({
    mutationFn: ({ academyId, pageId, versionId, expectedVersion }) =>
      websiteConfigurationService.restorePageVersion(
        academyId,
        pageId,
        versionId,
        expectedVersion
      ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (restored, { academyId, pageId }) => {
      queryClient.setQueryData(websiteKeys.page(academyId, pageId), restored);
      await Promise.all([
        invalidate(websiteKeys.page(academyId, pageId)),
        invalidate(websiteKeys.pageVersions(academyId, pageId)),
        invalidate(websiteKeys.allPages(academyId)),
        invalidate(websiteKeys.configuration(academyId)),
      ]);
    },
  });
}
