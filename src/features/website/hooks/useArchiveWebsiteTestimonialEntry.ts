/**
 * useArchiveWebsiteTestimonialEntry hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { WebsiteTestimonialEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface ArchiveWebsiteTestimonialEntryVariables {
  readonly academyId: string;
  readonly entryId: string;
}

export function useArchiveWebsiteTestimonialEntry() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsiteTestimonialEntry, ArchiveWebsiteTestimonialEntryVariables, ApiError>({
    mutationFn: ({ academyId, entryId }) =>
      websiteContentService.archiveTestimonialEntry(academyId, entryId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.testimonialEntry(variables.academyId, variables.entryId));
      await invalidate(websiteKeys.testimonialEntries(variables.academyId));
    },
  });
}
