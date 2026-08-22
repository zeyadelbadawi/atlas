/**
 * usePublishWebsiteTestimonialEntry hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { WebsiteTestimonialEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface PublishWebsiteTestimonialEntryVariables {
  readonly academyId: string;
  readonly entryId: string;
}

export function usePublishWebsiteTestimonialEntry() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsiteTestimonialEntry, PublishWebsiteTestimonialEntryVariables, ApiError>({
    mutationFn: ({ academyId, entryId }) =>
      websiteContentService.publishTestimonialEntry(academyId, entryId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.testimonialEntry(variables.academyId, variables.entryId));
      await invalidate(websiteKeys.testimonialEntries(variables.academyId));
    },
  });
}
