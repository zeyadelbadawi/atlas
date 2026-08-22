/**
 * useTeachingCourses hook.
 *
 * Fetches the courses the current instructor is authorized to teach.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { instructorKeys } from '@services/query';
import { instructorService } from '../services/InstructorService';
import type { CollectionQuery, PaginatedResult, TeachingCourse } from '@types';

export interface UseTeachingCoursesOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useTeachingCourses(options?: UseTeachingCoursesOptions) {
  const { query, enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<TeachingCourse>>({
    queryKey: instructorKeys.courses(user?.id, query),
    queryFn: () => instructorService.getTeachingCourses(query),
    enabled: enabled && !!user?.id,
  });
}
