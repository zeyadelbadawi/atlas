/**
 * useCourseStudents hook.
 *
 * Fetches the enrolled-student roster for one course the current instructor
 * is authorized to teach.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { instructorKeys } from '@services/query';
import { instructorService } from '../services/InstructorService';
import type { CollectionQuery, InstructorStudent, PaginatedResult } from '@types';

export interface UseCourseStudentsOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useCourseStudents(
  courseId: string,
  options?: UseCourseStudentsOptions
) {
  const { query, enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<InstructorStudent>>({
    queryKey: instructorKeys.students(user?.id, courseId, query),
    queryFn: () => instructorService.getCourseStudents(courseId, query),
    enabled: enabled && !!user?.id && !!courseId,
  });
}
