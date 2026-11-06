/**
 * useArchiveAnnouncement hook.
 *
 * Mutation hook for archiving a course-scoped announcement.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { announcementKeys, INLINE_ERRORS_META } from '@services/query';
import type { ApiError } from '@api';
import { announcementService } from '../services/AnnouncementService';
import type { Announcement } from '@types';

export function useArchiveAnnouncement(courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<Announcement, string, ApiError>({
    mutationFn: (announcementId) =>
      announcementService.archiveAnnouncement(courseId, announcementId),
    showSuccessToast: false,
    showErrorToast: false,
    // B4 (UX audit) — the caller shows the one message; the app-wide
    // reporter must not add a second toast.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async () => {
      await invalidate(announcementKeys.all);
    },
  });
}
