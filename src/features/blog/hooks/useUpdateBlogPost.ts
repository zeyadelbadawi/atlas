/**
 * useUpdateBlogPost hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { blogKeys } from '@services/query';
import type { ApiError } from '@api';
import { blogService } from '../services/BlogService';
import type { BlogPost, UpdateBlogPostPayload } from '@types';

export interface UpdateBlogPostVariables {
  readonly id: string;
  readonly payload: UpdateBlogPostPayload;
}

export function useUpdateBlogPost() {
  const { invalidate } = useInvalidate();

  return useApiMutation<BlogPost, UpdateBlogPostVariables, ApiError>({
    mutationFn: ({ id, payload }) => blogService.updatePost(id, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(blogKeys.all);
    },
  });
}
