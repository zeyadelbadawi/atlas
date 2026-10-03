/**
 * useUpdateWebsiteTestimonialEntry hook.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateTestimonialEntries } from '@services/query';
import type { ApiError } from '@api';
import type {
  UpdateWebsiteTestimonialEntryPayload,
  WebsiteTestimonialEntry,
} from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface UpdateWebsiteTestimonialEntryVariables {
  readonly academyId: string;
  readonly entryId: string;
  readonly payload: UpdateWebsiteTestimonialEntryPayload;
}

export function useUpdateWebsiteTestimonialEntry() {
  const queryClient = useQueryClient();

  return useApiMutation<
    WebsiteTestimonialEntry,
    UpdateWebsiteTestimonialEntryVariables,
    ApiError
  >({
    mutationFn: ({ academyId, entryId, payload }) =>
      websiteContentService.updateTestimonialEntry(academyId, entryId, payload),
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
