/**
 * useDashboardOverview (Phase 8).
 *
 * Fetches the single server-side dashboard aggregation for whichever
 * scope `useDashboardScope` resolved. Disabled entirely when there is no
 * scope yet — never a request with an undefined id in the path.
 */
import { useApiQuery } from '@/shared/hooks';
import { LIVE_LIST_QUERY_OPTIONS } from '@config';
import { dashboardOverviewKeys } from '@services/query';
import { dashboardService } from '../services/DashboardService';
import { useDashboardScope } from './useDashboardScope';
import type { DashboardScopeSelection } from './useDashboardScope';
import type { DashboardOverview } from '@types';
import type { ApiError } from '@api';

/**
 * Built on the shared `dashboardOverviewKeys` (same key shape as before) so
 * course, roster and member mutations elsewhere can invalidate the
 * overview without importing this feature.
 */
export const dashboardKeys = {
  all: dashboardOverviewKeys.all,
  overview: (scope: DashboardScopeSelection) =>
    scope.kind === 'organization'
      ? dashboardOverviewKeys.organization(scope.organizationId)
      : scope.kind === 'academy'
        ? dashboardOverviewKeys.academy(scope.academyId)
        : dashboardOverviewKeys.none(),
};

export function useDashboardOverview() {
  const scope = useDashboardScope();

  return useApiQuery<DashboardOverview, ApiError>({
    queryKey: dashboardKeys.overview(scope),
    queryFn: () =>
      scope.kind === 'organization'
        ? dashboardService.getForOrganization(scope.organizationId)
        : dashboardService.getForAcademy(
            (scope as { academyId: string }).academyId
          ),
    enabled: scope.kind !== 'none',
    // Counts move when OTHER people act (a learner registers, a colleague
    // publishes a course); there is no push channel, so poll while shown.
    ...LIVE_LIST_QUERY_OPTIONS,
  });
}
