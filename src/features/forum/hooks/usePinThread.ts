/**
 * usePinThread hook. Requires forum moderation authorization — enforced by
 * the backend, gated in the UI via `forum.moderate`.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { forumKeys } from '@services/query';
import type { ApiError } from '@api';
import { forumService } from '../services/ForumService';
import type { ForumThread } from '@types';

export function usePinThread(courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<ForumThread, string, ApiError>({
    mutationFn: (threadId) => forumService.pinThread(courseId, threadId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(forumKeys.all);
    },
  });
}
