/**
 * useStudentAnalytics (Phase 9) — the Client Owner's student progress
 * rollup, for whichever scope `useDashboardScope` resolved.
 *
 * Reuses the Phase 8 scope hook verbatim rather than re-deriving the
 * owner-vs-manager distinction a second way, so this view and the
 * dashboard can never disagree about which scope the user is in. As
 * there, the scope choice is presentation only — both endpoints are
 * independently authorized server-side.
 */
import { useApiQuery } from '@/shared/hooks';
import { studentAnalyticsService } from '../services/StudentAnalyticsService';
import { useDashboardScope } from './useDashboardScope';
import type { DashboardScopeSelection } from './useDashboardScope';
import type { StudentAnalytics } from '@types';
import type { ApiError } from '@api';

export const studentAnalyticsKeys = {
  scope: (scope: DashboardScopeSelection) =>
    scope.kind === 'organization'
      ? (['student-analytics', 'organization', scope.organizationId] as const)
      : scope.kind === 'academy'
        ? (['student-analytics', 'academy', scope.academyId] as const)
        : (['student-analytics', 'none'] as const),
};

export function useStudentAnalytics() {
  const scope = useDashboardScope();

  return useApiQuery<StudentAnalytics, ApiError>({
    queryKey: studentAnalyticsKeys.scope(scope),
    queryFn: () =>
      scope.kind === 'organization'
        ? studentAnalyticsService.getForOrganization(scope.organizationId)
        : studentAnalyticsService.getForAcademy(
            (scope as { academyId: string }).academyId
          ),
    enabled: scope.kind !== 'none',
  });
}
