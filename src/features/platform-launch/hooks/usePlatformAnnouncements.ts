/**
 * B3 — site announcement hooks (Platform Owner) and the dashboard banner
 * feed (every signed-in dashboard user).
 */
import { keepPreviousData } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import {
  dashboardAnnouncementKeys,
  platformAnnouncementKeys,
  INLINE_ERRORS_META,
} from '@services/query';
import type { ApiError } from '@api';
import type { PaginatedResult } from '@types';
import { platformAnnouncementService } from '../services/PlatformAnnouncementService';
import { dashboardAnnouncementService } from '../services/DashboardAnnouncementService';
import type {
  AnnouncementListQuery,
  AnnouncementWritePayload,
  BlogLocale,
  PublicAnnouncement,
  SiteAnnouncement,
} from '../types';

/** Feedback is the page's (inline or its own toast); no generic error toast. */
const QUIET = {
  showSuccessToast: false,
  showErrorToast: false,
  meta: { [INLINE_ERRORS_META]: true },
} as const;
const INVALIDATE = [
  platformAnnouncementKeys.all,
  dashboardAnnouncementKeys.all,
];

export function usePlatformAnnouncements(
  query: AnnouncementListQuery,
  enabled = true
) {
  return useApiQuery<PaginatedResult<SiteAnnouncement>, ApiError>({
    queryKey: platformAnnouncementKeys.list(query),
    queryFn: () => platformAnnouncementService.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePlatformAnnouncement(id: string | null) {
  return useApiQuery<SiteAnnouncement, ApiError>({
    queryKey: platformAnnouncementKeys.detail(id ?? ''),
    queryFn: () => platformAnnouncementService.get(id ?? ''),
    enabled: Boolean(id),
  });
}

export function useCreateAnnouncement() {
  return useApiMutation<SiteAnnouncement, AnnouncementWritePayload, ApiError>({
    mutationFn: (payload) => platformAnnouncementService.create(payload),
    invalidateKeys: INVALIDATE,
    ...QUIET,
  });
}

export function useUpdateAnnouncement() {
  return useApiMutation<
    SiteAnnouncement,
    {
      readonly id: string;
      readonly payload: AnnouncementWritePayload & { readonly version: number };
    },
    ApiError
  >({
    mutationFn: ({ id, payload }) =>
      platformAnnouncementService.update(id, payload),
    invalidateKeys: INVALIDATE,
    ...QUIET,
  });
}

export function useAnnouncementTransition() {
  return useApiMutation<
    SiteAnnouncement,
    {
      readonly id: string;
      readonly version: number;
      readonly action: 'activate' | 'deactivate' | 'archive';
    },
    ApiError
  >({
    mutationFn: ({ id, version, action }) =>
      platformAnnouncementService.transition(id, action, version),
    invalidateKeys: INVALIDATE,
    ...QUIET,
  });
}

export function useDeleteAnnouncement() {
  return useApiMutation<void, string, ApiError>({
    mutationFn: (id) => platformAnnouncementService.remove(id),
    invalidateKeys: INVALIDATE,
    ...QUIET,
  });
}

/** The dashboard banner feed; quiet on failure (a banner is never critical). */
export function useDashboardAnnouncements(locale: BlogLocale, enabled = true) {
  return useApiQuery<
    { readonly banners: readonly PublicAnnouncement[] },
    ApiError
  >({
    queryKey: dashboardAnnouncementKeys.feed(locale),
    queryFn: () => dashboardAnnouncementService.dashboard(locale),
    staleTime: 5 * 60_000,
    retry: false,
    meta: { [INLINE_ERRORS_META]: true },
    enabled,
  });
}
