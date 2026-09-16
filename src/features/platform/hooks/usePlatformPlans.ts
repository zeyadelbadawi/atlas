/**
 * Platform-Owner plan administration hooks (P57).
 *
 * Every mutation invalidates the CUSTOMER plan-catalog query key as well as
 * its own, because editing the catalog changes what a customer sees on the
 * Plans page — leaving that cached would show two different prices in one
 * session.
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { planKeys } from '@services/query';
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

/** Query keys for the platform-side plan surfaces, alongside the existing `planKeys`. */
export const platformPlanKeys = {
  history: (key: string, query?: CollectionQuery) =>
    ['platform-plans', 'history', key, query ?? {}] as const,
};

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

export function useUpdatePlan() {
  const { invalidate } = useInvalidate();
  return useApiMutation<Plan, UpdatePlanVariables, ApiError>({
    mutationFn: ({ key, payload }) => platformPlansService.updatePlan(key, payload),
    onSuccess: (_plan, variables) => {
      void invalidate(planKeys.list());
      void invalidate(['platform-plans', 'history', variables.key]);
    },
  });
}

export function useCreatePlan() {
  const { invalidate } = useInvalidate();
  return useApiMutation<Plan, CreatePlanPayload, ApiError>({
    mutationFn: (payload) => platformPlansService.createPlan(payload),
    onSuccess: () => {
      void invalidate(planKeys.list());
    },
  });
}

export interface ArchivePlanVariables {
  readonly key: string;
  readonly expectedVersion: number;
}

export function useArchivePlan() {
  const { invalidate } = useInvalidate();
  return useApiMutation<Plan, ArchivePlanVariables, ApiError>({
    mutationFn: ({ key, expectedVersion }) =>
      platformPlansService.archivePlan(key, expectedVersion),
    onSuccess: (_plan, variables) => {
      void invalidate(planKeys.list());
      void invalidate(['platform-plans', 'history', variables.key]);
    },
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
