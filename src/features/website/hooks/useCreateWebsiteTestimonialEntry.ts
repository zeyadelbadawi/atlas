/**
 * useCreateWebsiteTestimonialEntry hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { CreateWebsiteTestimonialEntryPayload, WebsiteTestimonialEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface CreateWebsiteTestimonialEntryVariables {
  readonly academyId: string;
  readonly payload: CreateWebsiteTestimonialEntryPayload;
}

export function useCreateWebsiteTestimonialEntry() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsiteTestimonialEntry, CreateWebsiteTestimonialEntryVariables, ApiError>({
    mutationFn: ({ academyId, payload }) =>
      websiteContentService.createTestimonialEntry(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.testimonialEntries(variables.academyId));
    },
  });
}
