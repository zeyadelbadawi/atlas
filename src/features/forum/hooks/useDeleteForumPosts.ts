/**
 * B6 (UX audit) V05 — moderators delete a thread (with its replies) or one
 * reply. Course moderators only, gated in the UI like pin/lock; the
 * backend refuses everyone else (403), the author included.
 *
 * The page shows the ONE failure message itself, so both mutations mark
 * their errors inline and the app-wide reporter stays quiet.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { INLINE_ERRORS_META, forumKeys } from '@services/query';
import type { ApiError } from '@api';
import { forumService } from '../services/ForumService';

export function useDeleteThread(courseId: string) {
  const queryClient = useQueryClient();
  const { invalidate } = useInvalidate();

  return useApiMutation<void, string, ApiError>({
    mutationFn: (threadId) => forumService.deleteThread(courseId, threadId),
    showSuccessToast: false,
    showErrorToast: false,
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async (_data, threadId) => {
      // The thread is gone: drop it (and its replies) rather than refetch
      // it into a "not found" while the page navigates back to the list.
      queryClient.removeQueries({
        queryKey: forumKeys.thread(courseId, threadId),
      });
      queryClient.removeQueries({
        queryKey: [...forumKeys.all, 'replies', courseId, threadId],
      });
      await invalidate([...forumKeys.all, 'threads', courseId]);
      await invalidate(forumKeys.forum(courseId));
    },
  });
}

export function useDeleteReply(courseId: string, threadId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, string, ApiError>({
    mutationFn: (replyId) =>
      forumService.deleteReply(courseId, threadId, replyId),
    showSuccessToast: false,
    showErrorToast: false,
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async () => {
      // The replies list, the thread's reply count and the list's counts.
      await invalidate([...forumKeys.all, 'replies', courseId, threadId]);
      await invalidate(forumKeys.thread(courseId, threadId));
      await invalidate([...forumKeys.all, 'threads', courseId]);
    },
  });
}
