/**
 * useCreateReply hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { forumKeys } from '@services/query';
import type { ApiError } from '@api';
import { forumService } from '../services/ForumService';
import type { CreateForumReplyPayload, ForumReply } from '@types';

export function useCreateReply(courseId: string, threadId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<ForumReply, CreateForumReplyPayload, ApiError>({
    mutationFn: (payload) =>
      forumService.createReply(courseId, threadId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(forumKeys.all);
    },
  });
}
