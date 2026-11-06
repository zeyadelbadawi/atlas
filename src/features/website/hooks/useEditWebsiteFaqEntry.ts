/**
 * useEditWebsiteFaqEntry — the FAQ dialog's save of an entry's question
 * and answer.
 *
 * The same PATCH as `useUpdateWebsiteFaqEntry`, for the dialog that shows
 * every failure itself (B2, UX audit V09): violations on their fields,
 * anything else as one alert with the real reason. It is marked
 * `inlineErrors`, so the app-wide reporter doesn't add a toast that would
 * open under the dialog's overlay. The list's visibility switch keeps
 * `useUpdateWebsiteFaqEntry` and its toast.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { INLINE_ERRORS_META, invalidateFaqEntries } from '@services/query';
import type { ApiError } from '@api';
import type { WebsiteFaqEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';
import type { UpdateWebsiteFaqEntryVariables } from './useUpdateWebsiteFaqEntry';

export function useEditWebsiteFaqEntry() {
  const queryClient = useQueryClient();

  return useApiMutation<
    WebsiteFaqEntry,
    UpdateWebsiteFaqEntryVariables,
    ApiError
  >({
    mutationFn: ({ academyId, entryId, payload }) =>
      websiteContentService.updateFaqEntry(academyId, entryId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async (_data, variables) => {
      await invalidateFaqEntries(
        queryClient,
        variables.academyId,
        variables.entryId
      );
    },
  });
}
