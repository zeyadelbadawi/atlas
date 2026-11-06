/**
 * useCreateWebsiteFaqEntry hook.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { INLINE_ERRORS_META, invalidateFaqEntries } from '@services/query';
import type { ApiError } from '@api';
import type { CreateWebsiteFaqEntryPayload, WebsiteFaqEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface CreateWebsiteFaqEntryVariables {
  readonly academyId: string;
  readonly payload: CreateWebsiteFaqEntryPayload;
}

export function useCreateWebsiteFaqEntry() {
  const queryClient = useQueryClient();

  return useApiMutation<
    WebsiteFaqEntry,
    CreateWebsiteFaqEntryVariables,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      websiteContentService.createFaqEntry(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    // B2 (V09) — the FAQ dialog shows every failure itself (on the fields,
    // or one alert with the reason); a toast would sit under its overlay.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async (_data, variables) => {
      await invalidateFaqEntries(queryClient, variables.academyId);
    },
  });
}
