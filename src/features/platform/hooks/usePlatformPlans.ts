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
import {
  INLINE_ERRORS_META,
  invalidatePlans,
  platformPlanKeys,
} from '@services/query';
import { platformPlansService } from '../services/PlatformPlansService';
import type {
  CollectionQuery,
  CreatePlanPayload,
  PaginatedResult,
  Plan,
  PlanHistoryEntry,
  PlanLimitImpact,
  PlanLimits,
  PlanNoticePreview,
  PlanNoticePreviewPayload,
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
    // B8 (UX audit) V07/V14 — the editor shows the one message: a
    // violation on its field, a 409 as "reload", anything else inline.
    showErrorToast: false,
    meta: { [INLINE_ERRORS_META]: true },
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
    meta: { [INLINE_ERRORS_META]: true },
  });
}

export interface PreviewNoticeVariables {
  readonly key: string;
  readonly payload: PlanNoticePreviewPayload;
}

/**
 * B8 (UX audit) V08 — before a price or limit edit is saved, how many
 * organizations it will email. Fired from the editor's Save; a mutation
 * for the same reason as `usePreviewLimitImpact`. The editor shows a
 * failure itself.
 */
export function usePreviewPlanNotice() {
  return useApiMutation<PlanNoticePreview, PreviewNoticeVariables, ApiError>({
    mutationFn: ({ key, payload }) =>
      platformPlansService.previewNotice(key, payload),
    showErrorToast: false,
    meta: { [INLINE_ERRORS_META]: true },
  });
}
