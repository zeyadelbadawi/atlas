/**
 * useUpdateWebsiteFaqEntry hook.
 *
 * Covers question/answer/order/visibility edits only — status transitions
 * (`publish`/`archive`) are their own dedicated actions/hooks, never
 * implicit here (see `WebsiteContentService`'s doc comment).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateFaqEntries } from '@services/query';
import type { ApiError } from '@api';
import type { UpdateWebsiteFaqEntryPayload, WebsiteFaqEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface UpdateWebsiteFaqEntryVariables {
  readonly academyId: string;
  readonly entryId: string;
  readonly payload: UpdateWebsiteFaqEntryPayload;
}

export function useUpdateWebsiteFaqEntry() {
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
    onSuccess: async (_data, variables) => {
      await invalidateFaqEntries(
        queryClient,
        variables.academyId,
        variables.entryId
      );
    },
  });
}
