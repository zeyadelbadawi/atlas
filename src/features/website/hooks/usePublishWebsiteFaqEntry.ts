/**
 * usePublishWebsiteFaqEntry hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { WebsiteFaqEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface PublishWebsiteFaqEntryVariables {
  readonly academyId: string;
  readonly entryId: string;
}

export function usePublishWebsiteFaqEntry() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsiteFaqEntry, PublishWebsiteFaqEntryVariables, ApiError>({
    mutationFn: ({ academyId, entryId }) => websiteContentService.publishFaqEntry(academyId, entryId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.faqEntry(variables.academyId, variables.entryId));
      await invalidate(websiteKeys.faqEntries(variables.academyId));
    },
  });
}
