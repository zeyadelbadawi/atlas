/**
 * useCreateWebsiteFaqEntry hook.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateFaqEntries } from '@services/query';
import type { ApiError } from '@api';
import type { CreateWebsiteFaqEntryPayload, WebsiteFaqEntry } from '@types';
import { websiteContentService } from '../services/WebsiteContentService';

export interface CreateWebsiteFaqEntryVariables {
  readonly academyId: string;
  readonly payload: CreateWebsiteFaqEntryPayload;
}

export function useCreateWebsiteFaqEntry() {
  const queryClient = useQueryClient();

  return useApiMutation<
    WebsiteFaqEntry,
    CreateWebsiteFaqEntryVariables,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      websiteContentService.createFaqEntry(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidateFaqEntries(queryClient, variables.academyId);
    },
  });
}
