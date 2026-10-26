/**
 * B3 — blog hooks (Platform Owner). Every mutation invalidates
 * `platformBlogKeys.all`, so the list, the open editor and the launch
 * center counts come from the same server state. Feedback is the page's
 * job, so the shared toasts are off.
 */
import { keepPreviousData } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { INLINE_ERRORS_META, platformBlogKeys } from '@services/query';
import type { ApiError } from '@api';
import type { PaginatedResult } from '@types';
import { platformBlogService } from '../services/PlatformBlogService';
import type {
  BlogLocale,
  BlogPost,
  BlogPostListQuery,
  BlogPostWritePayload,
  PublicBlogPost,
  UpdateBlogPostPayload,
  UploadedImage,
} from '../types';

/** Feedback is the page's (inline or its own toast); no generic error toast. */
const QUIET = {
  showSuccessToast: false,
  showErrorToast: false,
  meta: { [INLINE_ERRORS_META]: true },
} as const;
const INVALIDATE = [platformBlogKeys.all];

export function usePlatformBlogPosts(query: BlogPostListQuery, enabled = true) {
  return useApiQuery<PaginatedResult<BlogPost>, ApiError>({
    queryKey: platformBlogKeys.list(query),
    queryFn: () => platformBlogService.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePlatformBlogPost(id: string | null) {
  return useApiQuery<BlogPost, ApiError>({
    queryKey: platformBlogKeys.detail(id ?? ''),
    queryFn: () => platformBlogService.get(id ?? ''),
    enabled: Boolean(id),
  });
}

export function usePlatformBlogPreview(
  id: string | null,
  locale: BlogLocale,
  enabled: boolean
) {
  return useApiQuery<PublicBlogPost, ApiError>({
    queryKey: platformBlogKeys.preview(id ?? '', locale),
    queryFn: () => platformBlogService.preview(id ?? '', locale),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateBlogPost() {
  return useApiMutation<BlogPost, BlogPostWritePayload, ApiError>({
    mutationFn: (payload) => platformBlogService.create(payload),
    invalidateKeys: INVALIDATE,
    ...QUIET,
  });
}

export function useUpdateBlogPost() {
  return useApiMutation<
    BlogPost,
    { readonly id: string; readonly payload: UpdateBlogPostPayload },
    ApiError
  >({
    mutationFn: ({ id, payload }) => platformBlogService.update(id, payload),
    invalidateKeys: INVALIDATE,
    ...QUIET,
  });
}

export type BlogTransition =
  | { readonly action: 'publish'; readonly publishAt?: string }
  | { readonly action: 'unpublish' }
  | { readonly action: 'archive' };

export function useBlogPostTransition() {
  return useApiMutation<
    BlogPost,
    {
      readonly id: string;
      readonly version: number;
      readonly transition: BlogTransition;
    },
    ApiError
  >({
    mutationFn: ({ id, version, transition }) => {
      if (transition.action === 'publish')
        return platformBlogService.publish(id, version, transition.publishAt);
      if (transition.action === 'unpublish')
        return platformBlogService.unpublish(id, version);
      return platformBlogService.archive(id, version);
    },
    invalidateKeys: INVALIDATE,
    ...QUIET,
  });
}

export function useDeleteBlogPost() {
  return useApiMutation<void, string, ApiError>({
    mutationFn: (id) => platformBlogService.remove(id),
    invalidateKeys: INVALIDATE,
    ...QUIET,
  });
}

export function useUploadBlogImage() {
  return useApiMutation<UploadedImage, File, ApiError>({
    mutationFn: (file) => platformBlogService.uploadImage(file),
    ...QUIET,
  });
}
