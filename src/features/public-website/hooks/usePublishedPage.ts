/**
 * usePublishedPage hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '../services/PublicWebsiteService';
import type { WebsitePage } from '@types';
import type { ApiError } from '@api';

export function usePublishedPage(academyId: string | undefined, slug: string) {
  return useApiQuery<WebsitePage | null, ApiError>({
    queryKey: publicWebsiteKeys.page(academyId, slug),
    queryFn: () => publicWebsiteService.getPublishedPage(academyId!, slug),
    enabled: !!academyId && !!slug,
  });
}
