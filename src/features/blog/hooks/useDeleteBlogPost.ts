/**
 * useDeleteBlogPost hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { blogKeys } from '@services/query';
import type { ApiError } from '@api';
import { blogService } from '../services/BlogService';

export function useDeleteBlogPost() {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, string, ApiError>({
    mutationFn: (id) => blogService.deletePost(id),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(blogKeys.all);
    },
  });
}
