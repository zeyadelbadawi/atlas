/**
 * usePublishWebsiteFaqEntry hook.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateFaqEntries } from '@services/query';
import type { ApiError } from '@api';
import type { WebsiteFaqEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface PublishWebsiteFaqEntryVariables {
  readonly academyId: string;
  readonly entryId: string;
}

export function usePublishWebsiteFaqEntry() {
  const queryClient = useQueryClient();

  return useApiMutation<
    WebsiteFaqEntry,
    PublishWebsiteFaqEntryVariables,
    ApiError
  >({
    mutationFn: ({ academyId, entryId }) =>
      websiteContentService.publishFaqEntry(academyId, entryId),
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
