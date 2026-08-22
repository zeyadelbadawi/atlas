/**
 * useAnnouncement hook.
 *
 * Fetches a single announcement, if visible to the current user.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { announcementKeys } from '@services/query';
import { announcementService } from '../services/AnnouncementService';
import type { Announcement } from '@types';

export interface UseAnnouncementOptions {
  readonly enabled?: boolean;
}

export function useAnnouncement(id: string, options?: UseAnnouncementOptions) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<Announcement>({
    queryKey: announcementKeys.detail(user?.id, id),
    queryFn: () => announcementService.getAnnouncement(id),
    enabled: enabled && !!user?.id && !!id,
  });
}
