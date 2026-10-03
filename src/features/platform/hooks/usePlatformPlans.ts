/**
 * Platform-Owner plan administration hooks (P57).
 *
 * Every mutation invalidates the CUSTOMER plan-catalog query key as well as
 * its own, because editing the catalog changes what a customer sees on the
 * Plans page — leaving that cached would show two different prices in one
 * session.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { invalidatePlans, platformPlanKeys } from '@services/query';
import { platformPlansService } from '../services/PlatformPlansService';
import type {
  CollectionQuery,
  CreatePlanPayload,
  PaginatedResult,
  Plan,
  PlanHistoryEntry,
  PlanLimitImpact,
  PlanLimits,
  UpdatePlanPayload,
} from '@types';
import type { ApiError } from '@api';

/** Query keys for the platform-side plan surfaces — now declared in the shared factory (same shape). */
export { platformPlanKeys };

export function usePlanHistory(key: string, query?: CollectionQuery) {
  return useApiQuery<PaginatedResult<PlanHistoryEntry>, ApiError>({
    queryKey: platformPlanKeys.history(key, query),
    queryFn: () => platformPlansService.getHistory(key, query),
    enabled: key.length > 0,
  });
}

export interface UpdatePlanVariables {
  readonly key: string;
  readonly payload: UpdatePlanPayload;
}

// Plan mutations refresh every plan read — the authenticated catalog, the
// plan's own detail and history, and the marketing site's public list —
// through `invalidatePlans`, so a change is visible wherever plans render.
export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useApiMutation<Plan, UpdatePlanVariables, ApiError>({
    mutationFn: ({ key, payload }) =>
      platformPlansService.updatePlan(key, payload),
    onSuccess: (_plan, variables) =>
      invalidatePlans(queryClient, variables.key),
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useApiMutation<Plan, CreatePlanPayload, ApiError>({
    mutationFn: (payload) => platformPlansService.createPlan(payload),
    onSuccess: (plan) => invalidatePlans(queryClient, plan.key),
  });
}

export interface ArchivePlanVariables {
  readonly key: string;
  readonly expectedVersion: number;
}

export function useArchivePlan() {
  const queryClient = useQueryClient();
  return useApiMutation<Plan, ArchivePlanVariables, ApiError>({
    mutationFn: ({ key, expectedVersion }) =>
      platformPlansService.archivePlan(key, expectedVersion),
    onSuccess: (_plan, variables) =>
      invalidatePlans(queryClient, variables.key),
  });
}

export interface PreviewLimitsVariables {
  readonly key: string;
  readonly limits: PlanLimits;
}

/**
 * Dry run, deliberately a MUTATION hook rather than a query: it is fired
 * on demand from the editor (when the owner asks "what would this do?"),
 * not cached and re-fetched on mount. It writes nothing server-side.
 */
export function usePreviewLimitImpact() {
  return useApiMutation<PlanLimitImpact, PreviewLimitsVariables, ApiError>({
    mutationFn: ({ key, limits }) =>
      platformPlansService.previewLimitImpact(key, limits),
    // A preview failing is not a save failing; the caller surfaces it inline.
    showErrorToast: false,
  });
}
