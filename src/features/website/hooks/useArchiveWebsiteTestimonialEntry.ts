/**
 * useArchiveWebsiteTestimonialEntry hook.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateTestimonialEntries } from '@services/query';
import type { ApiError } from '@api';
import type { WebsiteTestimonialEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface ArchiveWebsiteTestimonialEntryVariables {
  readonly academyId: string;
  readonly entryId: string;
}

export function useArchiveWebsiteTestimonialEntry() {
  const queryClient = useQueryClient();

  return useApiMutation<
    WebsiteTestimonialEntry,
    ArchiveWebsiteTestimonialEntryVariables,
    ApiError
  >({
    mutationFn: ({ academyId, entryId }) =>
      websiteContentService.archiveTestimonialEntry(academyId, entryId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidateTestimonialEntries(
        queryClient,
        variables.academyId,
        variables.entryId
      );
    },
  });
}
