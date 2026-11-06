/**
 * useUpdateWebsitePage hook.
 *
 * The one write path for everything on a page: title/slug/visibility/SEO
 * AND the full section composition (add/remove/hide/edit/duplicate) —
 * see `WebsiteConfigurationService`'s doc comment for why this is a
 * single PATCH rather than granular per-action endpoints.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { INLINE_ERRORS_META, websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { UpdateWebsitePagePayload, WebsitePage } from '@types';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export interface UpdateWebsitePageVariables {
  readonly academyId: string;
  readonly pageId: string;
  readonly payload: UpdateWebsitePagePayload;
}

export interface UseUpdateWebsitePageOptions {
  /** B2 (UX audit) — the caller shows the failure itself; the app-wide reporter stays quiet. */
  readonly inlineErrors?: boolean;
}

export function useUpdateWebsitePage({
  inlineErrors = false,
}: UseUpdateWebsitePageOptions = {}) {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsitePage, UpdateWebsitePageVariables, ApiError>({
    mutationFn: ({ academyId, pageId, payload }) =>
      websiteConfigurationService.updatePage(academyId, pageId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    ...(inlineErrors ? { meta: { [INLINE_ERRORS_META]: true } } : {}),
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.page(variables.academyId, variables.pageId));
      await invalidate(websiteKeys.allPages(variables.academyId));
      // A saved page is a pending change until published: refresh the count.
      await invalidate(websiteKeys.configuration(variables.academyId));
    },
  });
}
