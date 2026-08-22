/**
 * useBlogPosts hook.
 *
 * Fetches the blog posts visible to the current user — published posts
 * plus their own drafts, as resolved by the backend.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { blogKeys } from '@services/query';
import { blogService } from '../services/BlogService';
import type { BlogPost, CollectionQuery, PaginatedResult } from '@types';

export interface UseBlogPostsOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useBlogPosts(options?: UseBlogPostsOptions) {
  const { query, enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<BlogPost>>({
    queryKey: blogKeys.list(user?.id, query),
    queryFn: () => blogService.getPosts(query),
    enabled: enabled && !!user?.id,
  });
}
