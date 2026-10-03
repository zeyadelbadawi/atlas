/**
 * useCreateWebsiteTestimonialEntry hook.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateTestimonialEntries } from '@services/query';
import type { ApiError } from '@api';
import type {
  CreateWebsiteTestimonialEntryPayload,
  WebsiteTestimonialEntry,
} from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface CreateWebsiteTestimonialEntryVariables {
  readonly academyId: string;
  readonly payload: CreateWebsiteTestimonialEntryPayload;
}

export function useCreateWebsiteTestimonialEntry() {
  const queryClient = useQueryClient();

  return useApiMutation<
    WebsiteTestimonialEntry,
    CreateWebsiteTestimonialEntryVariables,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      websiteContentService.createTestimonialEntry(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidateTestimonialEntries(queryClient, variables.academyId);
    },
  });
}
