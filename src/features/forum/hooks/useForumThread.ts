/**
 * useForumThread hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { forumKeys } from '@services/query';
import { forumService } from '../services/ForumService';
import type { ForumThread } from '@types';

export interface UseForumThreadOptions {
  readonly enabled?: boolean;
}

export function useForumThread(
  courseId: string,
  threadId: string,
  options?: UseForumThreadOptions
) {
  const { enabled = true } = options ?? {};

  return useApiQuery<ForumThread>({
    queryKey: forumKeys.thread(courseId, threadId),
    queryFn: () => forumService.getThread(courseId, threadId),
    enabled: enabled && !!courseId && !!threadId,
  });
}
