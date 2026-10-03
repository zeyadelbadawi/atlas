/**
 * W3-compose — query and mutation hooks for both composers.
 *
 * History is an infinite query that keeps refetching while any campaign on
 * the first page is still in flight, so progress comes from the server's
 * real outbox counts rather than from a client-side animation. Previews and
 * sends are mutations: never cached, never retried blindly (the send body
 * carries an `idempotencyKey`, which is what makes the HTTP client's replay
 * of an ambiguous failure safe).
 */
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { messagingKeys } from '@services/query';
import type { ApiError } from '@api';
import {
  academyMessagesService,
  platformCampaignsService,
} from '../services/MessagingService';
import {
  isActiveCampaign,
  type CampaignAccepted,
  type CampaignPage,
  type CampaignPreview,
  type CampaignPreviewRequest,
  type CampaignQuota,
  type CampaignSendRequest,
} from '../messaging.types';

export const HISTORY_PAGE_SIZE = 10;
const ACTIVE_REFETCH_MS = 10_000;

function refetchWhileActive(data: InfiniteData<CampaignPage> | undefined) {
  const first = data?.pages[0]?.items ?? [];
  return first.some((item) => isActiveCampaign(item.status)) ? ACTIVE_REFETCH_MS : false;
}

export function useAcademyMessageQuota(academyId: string) {
  return useApiQuery<CampaignQuota, ApiError>({
    queryKey: messagingKeys.academyQuota(academyId),
    queryFn: () => academyMessagesService.quota(academyId),
    enabled: academyId.length > 0,
  });
}

export function useAcademyMessageHistory(academyId: string) {
  return useInfiniteQuery<
    CampaignPage,
    ApiError,
    InfiniteData<CampaignPage, string | undefined>,
    ReturnType<typeof messagingKeys.academyHistory>,
    string | undefined
  >({
    queryKey: messagingKeys.academyHistory(academyId),
    queryFn: ({ pageParam }) =>
      academyMessagesService.history(academyId, {
        cursor: pageParam,
        limit: HISTORY_PAGE_SIZE,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: academyId.length > 0,
    refetchInterval: (query) => refetchWhileActive(query.state.data),
  });
}

export function usePlatformCampaignHistory() {
  return useInfiniteQuery<
    CampaignPage,
    ApiError,
    InfiniteData<CampaignPage, string | undefined>,
    ReturnType<typeof messagingKeys.platformHistory>,
    string | undefined
  >({
    queryKey: messagingKeys.platformHistory(),
    queryFn: ({ pageParam }) =>
      platformCampaignsService.history({ cursor: pageParam, limit: HISTORY_PAGE_SIZE }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: (query) => refetchWhileActive(query.state.data),
  });
}

export function useAcademyMessagePreview(academyId: string) {
  return useApiMutation<CampaignPreview, CampaignPreviewRequest, ApiError>({
    mutationFn: (payload) => academyMessagesService.preview(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
  });
}

export function useSendAcademyMessage(academyId: string) {
  return useApiMutation<CampaignAccepted, CampaignSendRequest, ApiError>({
    mutationFn: (payload) => academyMessagesService.send(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    invalidateKeys: [
      messagingKeys.academyHistory(academyId),
      messagingKeys.academyQuota(academyId),
    ],
  });
}

export function usePlatformCampaignPreview() {
  return useApiMutation<CampaignPreview, CampaignPreviewRequest, ApiError>({
    mutationFn: (payload) => platformCampaignsService.preview(payload),
    showSuccessToast: false,
    showErrorToast: false,
  });
}

export function useSendPlatformCampaign() {
  return useApiMutation<CampaignAccepted, CampaignSendRequest, ApiError>({
    mutationFn: (payload) => platformCampaignsService.send(payload),
    showSuccessToast: false,
    showErrorToast: false,
    invalidateKeys: [messagingKeys.platformHistory()],
  });
}
