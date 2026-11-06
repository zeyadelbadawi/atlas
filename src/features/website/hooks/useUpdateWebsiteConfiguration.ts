/**
 * useUpdateWebsiteConfiguration hook.
 *
 * Updates the draft only — never what is published. The page shows its
 * own contextual success/error feedback, so the generic mutation toast is
 * suppressed (consistent with every settings-form mutation elsewhere in
 * Atlas).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { INLINE_ERRORS_META, websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  UpdateWebsiteConfigurationPayload,
  WebsiteConfiguration,
} from '@types';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export interface UpdateWebsiteConfigurationVariables {
  readonly academyId: string;
  readonly payload: UpdateWebsiteConfigurationPayload;
}

/** Every in-flight website-settings save (`useIsMutating` / `isMutating`). */
export const UPDATE_WEBSITE_CONFIGURATION_MUTATION_KEY = [
  'website',
  'configuration',
  'update',
] as const;

export interface UseUpdateWebsiteConfigurationOptions {
  /**
   * B2 (UX audit) — the caller shows the failure itself (on the field, or
   * one inline message), so the app-wide reporter stays quiet: a failed
   * SEO save used to raise the tab's own toast AND the reporter's.
   */
  readonly inlineErrors?: boolean;
}

export function useUpdateWebsiteConfiguration({
  inlineErrors = false,
}: UseUpdateWebsiteConfigurationOptions = {}) {
  const { invalidate } = useInvalidate();
  const queryClient = useQueryClient();

  return useApiMutation<
    WebsiteConfiguration,
    UpdateWebsiteConfigurationVariables,
    ApiError
  >({
    mutationKey: UPDATE_WEBSITE_CONFIGURATION_MUTATION_KEY,
    mutationFn: ({ academyId, payload }) =>
      websiteConfigurationService.updateConfiguration(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    ...(inlineErrors ? { meta: { [INLINE_ERRORS_META]: true } } : {}),
    onSuccess: async (data, variables) => {
      // The saved copy is on screen at once, so the next edit is based on
      // it (and its `updatedAt`) rather than on the copy before this save.
      queryClient.setQueryData(
        websiteKeys.configuration(variables.academyId),
        data
      );
      await invalidate(websiteKeys.configuration(variables.academyId));
    },
  });
}
