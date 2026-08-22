/**
 * useUpdateWebsiteTestimonialEntry hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { UpdateWebsiteTestimonialEntryPayload, WebsiteTestimonialEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface UpdateWebsiteTestimonialEntryVariables {
  readonly academyId: string;
  readonly entryId: string;
  readonly payload: UpdateWebsiteTestimonialEntryPayload;
}

export function useUpdateWebsiteTestimonialEntry() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsiteTestimonialEntry, UpdateWebsiteTestimonialEntryVariables, ApiError>({
    mutationFn: ({ academyId, entryId, payload }) =>
      websiteContentService.updateTestimonialEntry(academyId, entryId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.testimonialEntry(variables.academyId, variables.entryId));
      await invalidate(websiteKeys.testimonialEntries(variables.academyId));
    },
  });
}
