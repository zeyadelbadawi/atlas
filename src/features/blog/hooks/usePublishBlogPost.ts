/**
 * usePublishBlogPost hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { blogKeys } from '@services/query';
import type { ApiError } from '@api';
import { blogService } from '../services/BlogService';
import type { BlogPost } from '@types';

export function usePublishBlogPost() {
  const { invalidate } = useInvalidate();

  return useApiMutation<BlogPost, string, ApiError>({
    mutationFn: (id) => blogService.publishPost(id),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(blogKeys.all);
    },
  });
}
