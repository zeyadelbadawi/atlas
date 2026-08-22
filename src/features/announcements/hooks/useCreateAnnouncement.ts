/**
 * useCreateAnnouncement hook.
 *
 * Mutation hook for creating a course-scoped announcement.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { announcementKeys } from '@services/query';
import type { ApiError } from '@api';
import { announcementService } from '../services/AnnouncementService';
import type { Announcement, CreateAnnouncementPayload } from '@types';

export function useCreateAnnouncement(courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<Announcement, CreateAnnouncementPayload, ApiError>({
    mutationFn: (payload) =>
      announcementService.createAnnouncement(courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(announcementKeys.all);
    },
  });
}
