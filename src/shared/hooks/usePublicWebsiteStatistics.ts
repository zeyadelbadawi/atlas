/**
 * usePublicWebsiteStatistics hook — Phase 6. `StatisticsSection`'s real,
 * live, Academy-scoped counts.
 */
import { useApiQuery } from './useApiQuery';
import { INLINE_ERRORS_META, publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '@services';
import type { PublicWebsiteStatistics } from '@types';
import type { ApiError } from '@api';

/** B9 (UX audit) — the public site draws its own state for a failed read; the app-wide toast would only repeat it. */
const PUBLIC_READ_META = { [INLINE_ERRORS_META]: true } as const;

export function usePublicWebsiteStatistics(academyId: string | undefined) {
  return useApiQuery<PublicWebsiteStatistics | null, ApiError>({
    meta: PUBLIC_READ_META,
    queryKey: publicWebsiteKeys.statistics(academyId),
    queryFn: () => publicWebsiteService.getStatistics(academyId!),
    enabled: !!academyId,
  });
}
