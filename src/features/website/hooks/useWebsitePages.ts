/**
 * useWebsitePages hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';
import type { CollectionQuery, PaginatedResult, WebsitePage } from '@types';
import type { ApiError } from '@api';

export interface UseWebsitePagesOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useWebsitePages(academyId: string, options?: UseWebsitePagesOptions) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<WebsitePage>, ApiError>({
    queryKey: websiteKeys.pages(academyId, query),
    queryFn: () => websiteConfigurationService.getPages(academyId, query),
    enabled: enabled && !!academyId,
  });
}
