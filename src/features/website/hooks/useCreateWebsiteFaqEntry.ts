/**
 * useCreateWebsiteFaqEntry hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { CreateWebsiteFaqEntryPayload, WebsiteFaqEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface CreateWebsiteFaqEntryVariables {
  readonly academyId: string;
  readonly payload: CreateWebsiteFaqEntryPayload;
}

export function useCreateWebsiteFaqEntry() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsiteFaqEntry, CreateWebsiteFaqEntryVariables, ApiError>({
    mutationFn: ({ academyId, payload }) => websiteContentService.createFaqEntry(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.faqEntries(variables.academyId));
    },
  });
}
