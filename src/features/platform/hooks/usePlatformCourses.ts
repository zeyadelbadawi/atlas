/**
 * Global Course Console hooks (P60).
 *
 * Filters are part of the QUERY KEY, not applied after the fact: the server
 * does the filtering, so two different filter sets are two different cached
 * results. Reusing one key for both would show the previous filter's rows
 * for a frame every time the operator changed a dropdown.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformCourseKeys } from '@services/query';
import { platformCourseService } from '../services/PlatformCourseService';
import type {
  CollectionQuery,
  PaginatedResult,
  PlatformCourseDetail,
  PlatformCourseSummary,
} from '@types';
import type { ApiError } from '@api';

export interface UsePlatformCoursesOptions {
  readonly query?: CollectionQuery;
}

export function usePlatformCourses(options?: UsePlatformCoursesOptions) {
  return useApiQuery<PaginatedResult<PlatformCourseSummary>, ApiError>({
    queryKey: platformCourseKeys.list(options?.query),
    queryFn: () => platformCourseService.getCourses(options?.query),
  });
}

export function usePlatformCourse(courseId: string) {
  return useApiQuery<PlatformCourseDetail, ApiError>({
    queryKey: platformCourseKeys.detail(courseId),
    queryFn: () => platformCourseService.getCourse(courseId),
    enabled: courseId.length > 0,
  });
}
