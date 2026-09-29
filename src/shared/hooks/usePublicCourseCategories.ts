/**
 * usePublicCourseCategories hook — Theme 1 plan §D.2. `CourseCategoriesSection`'s
 * real, live, Academy-scoped categories (published public courses only).
 */
import { useApiQuery } from './useApiQuery';
import { publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '@services';
import type { PublicCourseCategory } from '@types';
import type { ApiError } from '@api';

export function usePublicCourseCategories(academyId: string | undefined) {
  return useApiQuery<readonly PublicCourseCategory[] | null, ApiError>({
    queryKey: publicWebsiteKeys.categories(academyId),
    queryFn: () => publicWebsiteService.getPublicCategories(academyId!),
    enabled: !!academyId,
  });
}
