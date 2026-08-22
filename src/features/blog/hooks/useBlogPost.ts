/**
 * useBlogPost hook.
 *
 * Fetches a single blog post, if visible to the current user.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { blogKeys } from '@services/query';
import { blogService } from '../services/BlogService';
import type { BlogPost } from '@types';

export interface UseBlogPostOptions {
  readonly enabled?: boolean;
}

export function useBlogPost(id: string, options?: UseBlogPostOptions) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<BlogPost>({
    queryKey: blogKeys.detail(user?.id, id),
    queryFn: () => blogService.getPost(id),
    enabled: enabled && !!user?.id && !!id,
  });
}
