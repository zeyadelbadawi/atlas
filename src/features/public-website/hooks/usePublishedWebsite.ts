/**
 * usePublishedWebsite hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '../services/PublicWebsiteService';
import type { WebsiteConfiguration } from '@types';
import type { ApiError } from '@api';

export function usePublishedWebsite(academyId: string | undefined) {
  return useApiQuery<WebsiteConfiguration, ApiError>({
    queryKey: publicWebsiteKeys.configuration(academyId),
    queryFn: () => publicWebsiteService.getPublishedWebsite(academyId!),
    enabled: !!academyId,
  });
}
