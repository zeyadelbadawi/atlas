/**
 * useReorderPageSections hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { ReorderItemsPayload, WebsitePage } from '@types';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';

export interface ReorderPageSectionsVariables {
  readonly academyId: string;
  readonly pageId: string;
  readonly payload: ReorderItemsPayload;
}

export function useReorderPageSections() {
  const { invalidate } = useInvalidate();

  return useApiMutation<WebsitePage, ReorderPageSectionsVariables, ApiError>({
    mutationFn: ({ academyId, pageId, payload }) =>
      websiteConfigurationService.reorderPageSections(academyId, pageId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(websiteKeys.page(variables.academyId, variables.pageId));
    },
  });
}
