/**
 * Platform Owner commission hooks — the §4.2 hierarchy.
 *
 * Any write invalidates the WHOLE commission root: an organization's
 * `effective` rate is resolved from the plan and global tiers, so changing
 * either of those changes every cached organization answer too.
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { platformCommissionKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  AtlasCommissionConfig,
  OrganizationCommission,
  PlanCommission,
  UpdateAtlasCommissionConfigPayload,
  UpdateOrganizationCommissionPayload,
  UpdatePlanCommissionPayload,
} from '@types';
import { platformCommissionService } from '../services/PlatformCommissionService';

export function useGlobalCommission() {
  return useApiQuery<AtlasCommissionConfig, ApiError>({
    queryKey: platformCommissionKeys.global(),
    queryFn: () => platformCommissionService.getGlobal(),
  });
}

export function useUpdateGlobalCommission() {
  const { invalidate } = useInvalidate();
  return useApiMutation<
    AtlasCommissionConfig,
    UpdateAtlasCommissionConfigPayload,
    ApiError
  >({
    mutationFn: (payload) => platformCommissionService.updateGlobal(payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(platformCommissionKeys.all);
    },
  });
}

export function usePlanCommission(planKey: string) {
  return useApiQuery<PlanCommission, ApiError>({
    queryKey: platformCommissionKeys.plan(planKey),
    queryFn: () => platformCommissionService.getPlan(planKey),
    enabled: planKey.length > 0,
  });
}

export interface UpdatePlanCommissionVariables {
  readonly planKey: string;
  readonly payload: UpdatePlanCommissionPayload;
}

export function useUpdatePlanCommission() {
  const { invalidate } = useInvalidate();
  return useApiMutation<
    PlanCommission,
    UpdatePlanCommissionVariables,
    ApiError
  >({
    mutationFn: ({ planKey, payload }) =>
      platformCommissionService.updatePlan(planKey, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(platformCommissionKeys.all);
    },
  });
}

export function useOrganizationCommission(organizationId: string) {
  return useApiQuery<OrganizationCommission, ApiError>({
    queryKey: platformCommissionKeys.organization(organizationId),
    queryFn: () => platformCommissionService.getOrganization(organizationId),
    enabled: organizationId.length > 0,
  });
}

export interface UpdateOrganizationCommissionVariables {
  readonly organizationId: string;
  readonly payload: UpdateOrganizationCommissionPayload;
}

export function useUpdateOrganizationCommission() {
  const { invalidate } = useInvalidate();
  return useApiMutation<
    OrganizationCommission,
    UpdateOrganizationCommissionVariables,
    ApiError
  >({
    mutationFn: ({ organizationId, payload }) =>
      platformCommissionService.updateOrganization(organizationId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(platformCommissionKeys.all);
    },
  });
}
