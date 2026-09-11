/**
 * Academy-wide announcement hooks.
 *
 * The course-scoped hooks alongside these are unchanged; these are their
 * academy-scoped twins, pointing at the backend's separate
 * `academies/:academyId/announcements` tree. Kept as separate hooks rather
 * than one hook with a `scope` discriminator because the two have genuinely
 * different arguments and different cache keys, and collapsing them would
 * mean every call site passing a scope tag that the function name already
 * says.
 *
 * Authorisation is the backend's: it checks the caller's own
 * `academy_members` row (`owner`/`administrator`/`manager`) on every one of
 * these routes. The UI gates on the `announcement.manage` permission so the
 * controls are not offered to someone who cannot use them — that is
 * ergonomics, not security, and a 403 is still the real answer.
 */
import { useApiQuery, useApiMutation, useInvalidate } from '@/shared/hooks';
import { announcementKeys } from '@services/query';
import type { ApiError } from '@api';
import { announcementService } from '../services/AnnouncementService';
import type {
  Announcement,
  CollectionQuery,
  CreateAnnouncementPayload,
  PaginatedResult,
  UpdateAnnouncementPayload,
} from '@types';

export function useAcademyAnnouncements(
  academyId: string,
  query?: CollectionQuery
) {
  return useApiQuery<PaginatedResult<Announcement>, ApiError>({
    queryKey: announcementKeys.academy(academyId, query),
    queryFn: () =>
      announcementService.getAcademyAnnouncements(academyId, query),
    enabled: !!academyId,
  });
}

export function useCreateAcademyAnnouncement(academyId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<Announcement, CreateAnnouncementPayload, ApiError>({
    mutationFn: (payload) =>
      announcementService.createAcademyAnnouncement(academyId, payload),
    // The page renders its own contextual messages; a generic toast on top
    // of an inline form error reads as two failures for one problem.
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      // The whole root: a new academy announcement also belongs in every
      // reader's feed, which is cached under a different key.
      await invalidate(announcementKeys.all);
    },
  });
}

export function useUpdateAcademyAnnouncement(academyId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    Announcement,
    { readonly announcementId: string; readonly payload: UpdateAnnouncementPayload },
    ApiError
  >({
    mutationFn: ({ announcementId, payload }) =>
      announcementService.updateAcademyAnnouncement(
        academyId,
        announcementId,
        payload
      ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(announcementKeys.all);
    },
  });
}

export function usePublishAcademyAnnouncement(academyId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<Announcement, string, ApiError>({
    mutationFn: (announcementId) =>
      announcementService.publishAcademyAnnouncement(academyId, announcementId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(announcementKeys.all);
    },
  });
}

export function useArchiveAcademyAnnouncement(academyId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<Announcement, string, ApiError>({
    mutationFn: (announcementId) =>
      announcementService.archiveAcademyAnnouncement(academyId, announcementId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(announcementKeys.all);
    },
  });
}
