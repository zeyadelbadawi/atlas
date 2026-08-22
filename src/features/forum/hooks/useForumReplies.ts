/**
 * useForumReplies hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { forumKeys } from '@services/query';
import { forumService } from '../services/ForumService';
import type { CollectionQuery, ForumReply, PaginatedResult } from '@types';

export interface UseForumRepliesOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useForumReplies(
  courseId: string,
  threadId: string,
  options?: UseForumRepliesOptions
) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<ForumReply>>({
    queryKey: forumKeys.replies(courseId, threadId, query),
    queryFn: () => forumService.getReplies(courseId, threadId, query),
    enabled: enabled && !!courseId && !!threadId,
  });
}
