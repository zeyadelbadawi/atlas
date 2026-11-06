/**
 * useUpdateAnnouncement hook.
 *
 * Mutation hook for updating a course-scoped announcement.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { announcementKeys, INLINE_ERRORS_META } from '@services/query';
import type { ApiError } from '@api';
import { announcementService } from '../services/AnnouncementService';
import type { Announcement, UpdateAnnouncementPayload } from '@types';

export interface UpdateAnnouncementVariables {
  readonly announcementId: string;
  readonly payload: UpdateAnnouncementPayload;
}

export function useUpdateAnnouncement(courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<Announcement, UpdateAnnouncementVariables, ApiError>({
    mutationFn: ({ announcementId, payload }) =>
      announcementService.updateAnnouncement(courseId, announcementId, payload),
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
