/**
 * useCreateThread hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { forumKeys } from '@services/query';
import type { ApiError } from '@api';
import { forumService } from '../services/ForumService';
import type { CreateForumThreadPayload, ForumThread } from '@types';

export function useCreateThread(courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<ForumThread, CreateForumThreadPayload, ApiError>({
    mutationFn: (payload) => forumService.createThread(courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(forumKeys.all);
    },
  });
}
