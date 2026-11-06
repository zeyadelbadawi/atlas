/**
 * usePublicCourseCategories hook — Theme 1 plan §D.2. `CourseCategoriesSection`'s
 * real, live, Academy-scoped categories (published public courses only).
 */
import { useApiQuery } from './useApiQuery';
import { INLINE_ERRORS_META, publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '@services';
import type { PublicCourseCategory } from '@types';
import type { ApiError } from '@api';

/** B9 (UX audit) — the public site draws its own state for a failed read; the app-wide toast would only repeat it. */
const PUBLIC_READ_META = { [INLINE_ERRORS_META]: true } as const;

export function usePublicCourseCategories(academyId: string | undefined) {
  return useApiQuery<readonly PublicCourseCategory[] | null, ApiError>({
    meta: PUBLIC_READ_META,
    queryKey: publicWebsiteKeys.categories(academyId),
    queryFn: () => publicWebsiteService.getPublicCategories(academyId!),
    enabled: !!academyId,
  });
}
