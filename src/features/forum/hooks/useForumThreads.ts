/**
 * useForumThreads hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { forumKeys } from '@services/query';
import { forumService } from '../services/ForumService';
import type { CollectionQuery, ForumThread, PaginatedResult } from '@types';

export interface UseForumThreadsOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useForumThreads(
  courseId: string,
  options?: UseForumThreadsOptions
) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<ForumThread>>({
    queryKey: forumKeys.threads(courseId, query),
    queryFn: () => forumService.getThreads(courseId, query),
    enabled: enabled && !!courseId,
  });
}
