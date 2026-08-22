/**
 * useWebsiteFaqEntries hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import { websiteContentService } from '../services/WebsiteContentService';
import type { CollectionQuery, PaginatedResult, WebsiteFaqEntry } from '@types';
import type { ApiError } from '@api';

export interface UseWebsiteFaqEntriesOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useWebsiteFaqEntries(academyId: string, options?: UseWebsiteFaqEntriesOptions) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<WebsiteFaqEntry>, ApiError>({
    queryKey: websiteKeys.faqEntries(academyId, query),
    queryFn: () => websiteContentService.getFaqEntries(academyId, query),
    enabled: enabled && !!academyId,
  });
}
