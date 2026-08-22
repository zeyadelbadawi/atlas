/**
 * useWebsiteConfiguration hook.
 *
 * `academyId` is an explicit parameter, not read internally — the same
 * pattern `useCourses(academyId, ...)` (Prompt 3C) already establishes for
 * every Academy-scoped hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import { websiteConfigurationService } from '../services/WebsiteConfigurationService';
import type { WebsiteConfiguration } from '@types';
import type { ApiError } from '@api';

export function useWebsiteConfiguration(academyId: string) {
  return useApiQuery<WebsiteConfiguration, ApiError>({
    queryKey: websiteKeys.configuration(academyId),
    queryFn: () => websiteConfigurationService.getConfiguration(academyId),
    enabled: !!academyId,
  });
}
