/**
 * useWebsiteFaqEntry hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import { websiteContentService } from '../services/WebsiteContentService';
import type { WebsiteFaqEntry } from '@types';
import type { ApiError } from '@api';

export function useWebsiteFaqEntry(academyId: string, entryId: string) {
  return useApiQuery<WebsiteFaqEntry, ApiError>({
    queryKey: websiteKeys.faqEntry(academyId, entryId),
    queryFn: () => websiteContentService.getFaqEntry(academyId, entryId),
    enabled: !!academyId && !!entryId,
  });
}
