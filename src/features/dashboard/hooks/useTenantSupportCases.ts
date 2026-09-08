/**
 * Tenant support-case hooks (Phase 8) — "submit a ticket" and "track my
 * tickets", both scoped by whichever dashboard scope resolved.
 *
 * The list is the caller's OWN tickets (the backend scopes it to the
 * authenticated requester), so it is safe to show in full; nothing is
 * filtered client-side.
 */
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { tenantSupportCaseService } from '../services/TenantSupportCaseService';
import { useDashboardScope } from './useDashboardScope';
import type { DashboardScopeSelection } from './useDashboardScope';
import type {
  CreateSupportCasePayload,
  PaginatedResult,
  SupportCaseDetail,
  SupportCaseSummary,
} from '@types';
import type { ApiError } from '@api';

export const tenantSupportCaseKeys = {
  mine: (scope: DashboardScopeSelection) =>
    scope.kind === 'organization'
      ? (['tenant-support-cases', 'organization', scope.organizationId] as const)
      : scope.kind === 'academy'
        ? (['tenant-support-cases', 'academy', scope.academyId] as const)
        : (['tenant-support-cases', 'none'] as const),
};

export function useMySupportCases() {
  const scope = useDashboardScope();

  return useApiQuery<PaginatedResult<SupportCaseSummary>, ApiError>({
    queryKey: tenantSupportCaseKeys.mine(scope),
    queryFn: () =>
      scope.kind === 'organization'
        ? tenantSupportCaseService.listMineForOrganization(scope.organizationId)
        : tenantSupportCaseService.listMineForAcademy(
            (scope as { academyId: string }).academyId
          ),
    enabled: scope.kind !== 'none',
  });
}

export function useSubmitSupportCase() {
  const scope = useDashboardScope();

  return useApiMutation<SupportCaseDetail, CreateSupportCasePayload, ApiError>({
    mutationFn: (payload) =>
      scope.kind === 'organization'
        ? tenantSupportCaseService.createForOrganization(scope.organizationId, payload)
        : tenantSupportCaseService.createForAcademy(
            (scope as { academyId: string }).academyId,
            payload
          ),
    // The form renders its own inline success/error states (this phase's
    // explicit "no alerts, no leaked technical errors" requirement), so no
    // toast is raised here on either path.
    showSuccessToast: false,
    showErrorToast: false,
    invalidateKeys: [tenantSupportCaseKeys.mine(scope)],
  });
}
