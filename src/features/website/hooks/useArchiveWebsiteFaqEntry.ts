/**
 * useArchiveWebsiteFaqEntry hook.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateFaqEntries } from '@services/query';
import type { ApiError } from '@api';
import type { WebsiteFaqEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface ArchiveWebsiteFaqEntryVariables {
  readonly academyId: string;
  readonly entryId: string;
}

export function useArchiveWebsiteFaqEntry() {
  const queryClient = useQueryClient();

  return useApiMutation<
    WebsiteFaqEntry,
    ArchiveWebsiteFaqEntryVariables,
    ApiError
  >({
    mutationFn: ({ academyId, entryId }) =>
      websiteContentService.archiveFaqEntry(academyId, entryId),
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
