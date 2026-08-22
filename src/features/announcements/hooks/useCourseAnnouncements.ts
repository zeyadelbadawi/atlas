/**
 * useCourseAnnouncements hook.
 *
 * Fetches the announcements owned by one course — used by the instructor
 * management view, which needs drafts/scheduled/archived items too, not
 * just the published feed a student sees.
 */
import { useApiQuery } from '@/shared/hooks';
import { announcementKeys } from '@services/query';
import { announcementService } from '../services/AnnouncementService';
import type { Announcement, CollectionQuery, PaginatedResult } from '@types';

export interface UseCourseAnnouncementsOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useCourseAnnouncements(
  courseId: string,
  options?: UseCourseAnnouncementsOptions
) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<Announcement>>({
    queryKey: announcementKeys.course(courseId, query),
    queryFn: () => announcementService.getCourseAnnouncements(courseId, query),
    enabled: enabled && !!courseId,
  });
}
