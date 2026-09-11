/**
 * usePublicWebsiteStatistics hook — Phase 6. `StatisticsSection`'s real,
 * live, Academy-scoped counts.
 */
import { useApiQuery } from './useApiQuery';
import { publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '@services';
import type { PublicWebsiteStatistics } from '@types';
import type { ApiError } from '@api';

export function usePublicWebsiteStatistics(academyId: string | undefined) {
  return useApiQuery<PublicWebsiteStatistics | null, ApiError>({
    queryKey: publicWebsiteKeys.statistics(academyId),
    queryFn: () => publicWebsiteService.getStatistics(academyId!),
    enabled: !!academyId,
  });
}
