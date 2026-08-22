/**
 * useLockThread hook. Requires forum moderation authorization.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { forumKeys } from '@services/query';
import type { ApiError } from '@api';
import { forumService } from '../services/ForumService';
import type { ForumThread } from '@types';

export function useLockThread(courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<ForumThread, string, ApiError>({
    mutationFn: (threadId) => forumService.lockThread(courseId, threadId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(forumKeys.all);
    },
  });
}
