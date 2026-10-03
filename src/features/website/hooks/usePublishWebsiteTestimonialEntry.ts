/**
 * usePublishWebsiteTestimonialEntry hook.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateTestimonialEntries } from '@services/query';
import type { ApiError } from '@api';
import type { WebsiteTestimonialEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface PublishWebsiteTestimonialEntryVariables {
  readonly academyId: string;
  readonly entryId: string;
}

export function usePublishWebsiteTestimonialEntry() {
  const queryClient = useQueryClient();

  return useApiMutation<
    WebsiteTestimonialEntry,
    PublishWebsiteTestimonialEntryVariables,
    ApiError
  >({
    mutationFn: ({ academyId, entryId }) =>
      websiteContentService.publishTestimonialEntry(academyId, entryId),
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
