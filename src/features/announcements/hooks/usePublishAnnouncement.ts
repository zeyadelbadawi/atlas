/**
 * usePublishAnnouncement hook.
 *
 * Mutation hook for publishing a course-scoped announcement — moves it
 * into every eligible student's feed. No frontend fan-out logic; the
 * backend contract owns that.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { announcementKeys, INLINE_ERRORS_META } from '@services/query';
import type { ApiError } from '@api';
import { announcementService } from '../services/AnnouncementService';
import type { Announcement } from '@types';

export function usePublishAnnouncement(courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<Announcement, string, ApiError>({
    mutationFn: (announcementId) =>
      announcementService.publishAnnouncement(courseId, announcementId),
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
