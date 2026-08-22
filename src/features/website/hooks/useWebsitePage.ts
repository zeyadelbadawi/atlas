/**
 * useWebsitePage hook.
 *
 * The single query behind the Page Editor — its section composition IS
 * this record's `sections`.
 */
import { useApiQuery } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';
import type { WebsitePage } from '@types';
import type { ApiError } from '@api';

export function useWebsitePage(academyId: string, pageId: string) {
  return useApiQuery<WebsitePage, ApiError>({
    queryKey: websiteKeys.page(academyId, pageId),
    queryFn: () => websiteConfigurationService.getPage(academyId, pageId),
    enabled: !!academyId && !!pageId,
  });
}
