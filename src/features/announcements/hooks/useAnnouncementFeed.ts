/**
 * useAnnouncementFeed hook.
 *
 * Fetches the current user's visible announcement feed — the backend
 * resolves platform + academy + course scope from the session.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { announcementKeys } from '@services/query';
import { announcementService } from '../services/AnnouncementService';
import type { Announcement, CollectionQuery, PaginatedResult } from '@types';

export interface UseAnnouncementFeedOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useAnnouncementFeed(options?: UseAnnouncementFeedOptions) {
  const { query, enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<Announcement>>({
    queryKey: announcementKeys.feed(user?.id, query),
    queryFn: () => announcementService.getFeed(query),
    enabled: enabled && !!user?.id,
  });
}
