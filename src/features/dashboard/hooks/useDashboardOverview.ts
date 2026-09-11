/**
 * useDashboardOverview (Phase 8).
 *
 * Fetches the single server-side dashboard aggregation for whichever
 * scope `useDashboardScope` resolved. Disabled entirely when there is no
 * scope yet — never a request with an undefined id in the path.
 */
import { useApiQuery } from '@/shared/hooks';
import { dashboardService } from '../services/DashboardService';
import { useDashboardScope } from './useDashboardScope';
import type { DashboardScopeSelection } from './useDashboardScope';
import type { DashboardOverview } from '@types';
import type { ApiError } from '@api';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: (scope: DashboardScopeSelection) =>
    scope.kind === 'organization'
      ? ([
          'dashboard',
          'overview',
          'organization',
          scope.organizationId,
        ] as const)
      : scope.kind === 'academy'
        ? (['dashboard', 'overview', 'academy', scope.academyId] as const)
        : (['dashboard', 'overview', 'none'] as const),
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
  });
}
