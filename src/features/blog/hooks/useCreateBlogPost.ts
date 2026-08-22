/**
 * useCreateBlogPost hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { blogKeys } from '@services/query';
import type { ApiError } from '@api';
import { blogService } from '../services/BlogService';
import type { BlogPost, CreateBlogPostPayload } from '@types';

export function useCreateBlogPost() {
  const { invalidate } = useInvalidate();

  return useApiMutation<BlogPost, CreateBlogPostPayload, ApiError>({
    mutationFn: (payload) => blogService.createPost(payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(blogKeys.all);
    },
  });
}
