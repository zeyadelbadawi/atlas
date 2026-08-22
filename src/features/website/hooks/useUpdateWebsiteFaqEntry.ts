/**
 * useUpdateWebsiteFaqEntry hook.
 *
 * Covers question/answer/order/visibility edits only — status transitions
 * (`publish`/`archive`) are their own dedicated actions/hooks, never
 * implicit here (see `WebsiteContentService`'s doc comment).
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { UpdateWebsiteFaqEntryPayload, WebsiteFaqEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface UpdateWebsiteFaqEntryVariables {
  readonly academyId: string;
  readonly entryId: string;
  readonly payload: UpdateWebsiteFaqEntryPayload;
}

export function useUpdateWebsiteFaqEntry() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsiteFaqEntry, UpdateWebsiteFaqEntryVariables, ApiError>({
    mutationFn: ({ academyId, entryId, payload }) =>
      websiteContentService.updateFaqEntry(academyId, entryId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.faqEntry(variables.academyId, variables.entryId));
      await invalidate(websiteKeys.faqEntries(variables.academyId));
    },
  });
}
