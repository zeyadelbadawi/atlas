/**
 * usePublishedPages hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '../services/PublicWebsiteService';
import type { WebsitePage } from '@types';
import type { ApiError } from '@api';

export function usePublishedPages(academyId: string | undefined) {
  return useApiQuery<readonly WebsitePage[], ApiError>({
    queryKey: publicWebsiteKeys.pages(academyId),
    queryFn: () => publicWebsiteService.getPublishedPages(academyId!),
    enabled: !!academyId,
  });
}
