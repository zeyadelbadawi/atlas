/**
 * B2 — Founding Academies hooks (Platform Owner). Every mutation
 * invalidates `platformFoundingKeys.all` (and the contact inbox, which a
 * create may mark handled), so the seat meter, the table and the open
 * detail always come from the same server state. Feedback (toasts) is
 * the page's job, so the shared toasts are off.
 */
import { keepPreviousData } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import {
  platformContactSubmissionKeys,
  platformFoundingKeys,
} from '@services/query';
import type { ApiError } from '@api';
import type { PaginatedResult } from '@types';
import {
  platformFoundingService,
  type CreateFoundingPayload,
  type FoundingCandidate,
  type FoundingEligiblePlan,
  type FoundingEmailAudiencePayload,
  type FoundingEmailPayload,
  type FoundingEmailPreview,
  type FoundingListQuery,
  type FoundingMembership,
  type FoundingMembershipDetail,
  type FoundingQuote,
  type FoundingSeatSummary,
  type UpdateFoundingPayload,
} from '../services/PlatformFoundingService';

const QUIET = { showSuccessToast: false, showErrorToast: false } as const;
const INVALIDATE = [platformFoundingKeys.all];

export function usePlatformFoundingList(query: FoundingListQuery) {
  return useApiQuery<PaginatedResult<FoundingMembership>, ApiError>({
    queryKey: platformFoundingKeys.list(query),
    queryFn: () => platformFoundingService.list(query),
    placeholderData: keepPreviousData,
  });
}

export function usePlatformFoundingSummary() {
  return useApiQuery<FoundingSeatSummary, ApiError>({
    queryKey: platformFoundingKeys.summary(),
    queryFn: () => platformFoundingService.summary(),
  });
}

export function usePlatformFoundingDetail(id: string | null) {
  return useApiQuery<FoundingMembershipDetail, ApiError>({
    queryKey: platformFoundingKeys.detail(id ?? ''),
    queryFn: () => platformFoundingService.get(id ?? ''),
    enabled: Boolean(id),
  });
}

export function usePlatformFoundingPlans(enabled = true) {
  return useApiQuery<FoundingEligiblePlan[], ApiError>({
    queryKey: platformFoundingKeys.plans(),
    queryFn: () => platformFoundingService.plans(),
    enabled,
  });
}

export function usePlatformFoundingCandidates(search: string, enabled = true) {
  return useApiQuery<FoundingCandidate[], ApiError>({
    queryKey: platformFoundingKeys.candidates(search),
    queryFn: () => platformFoundingService.candidates(search),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePlatformFoundingQuote(
  organizationId: string,
  planKey: string
) {
  return useApiQuery<FoundingQuote, ApiError>({
    queryKey: platformFoundingKeys.quote(organizationId, planKey),
    queryFn: () => platformFoundingService.quote(organizationId, planKey),
    enabled: Boolean(organizationId && planKey),
  });
}

export function useCreateFounding() {
  return useApiMutation<
    FoundingMembershipDetail,
    CreateFoundingPayload,
    ApiError
  >({
    mutationFn: (payload) => platformFoundingService.create(payload),
    invalidateKeys: [...INVALIDATE, platformContactSubmissionKeys.all],
    ...QUIET,
  });
}

export function useUpdateFounding() {
  return useApiMutation<
    FoundingMembershipDetail,
    { readonly id: string; readonly payload: UpdateFoundingPayload },
    ApiError
  >({
    mutationFn: ({ id, payload }) =>
      platformFoundingService.update(id, payload),
    invalidateKeys: INVALIDATE,
    ...QUIET,
  });
}

export function useRevokeFounding() {
  return useApiMutation<
    FoundingMembershipDetail,
    { readonly id: string; readonly reason: string },
    ApiError
  >({
    mutationFn: ({ id, reason }) => platformFoundingService.revoke(id, reason),
    invalidateKeys: INVALIDATE,
    ...QUIET,
  });
}

export function usePreviewFoundingEmail() {
  return useApiMutation<
    FoundingEmailPreview,
    FoundingEmailAudiencePayload,
    ApiError
  >({
    mutationFn: (payload) => platformFoundingService.previewEmail(payload),
    ...QUIET,
  });
}

export function useSendFoundingEmail() {
  return useApiMutation<
    { readonly sendId: string; readonly queued: number },
    FoundingEmailPayload,
    ApiError
  >({
    mutationFn: (payload) => platformFoundingService.sendEmail(payload),
    invalidateKeys: INVALIDATE,
    ...QUIET,
  });
}
