/**
 * useStudentProgress hook.
 *
 * Fetches one enrolled student's detailed, course-scoped progress —
 * read-only, and only ever for a student enrolled in a course the current
 * instructor is authorized to teach (enforced by the backend contract, not
 * by this hook).
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { instructorKeys } from '@services/query';
import { instructorService } from '../services/InstructorService';
import type { InstructorStudentProgress } from '@types';

export interface UseStudentProgressOptions {
  readonly enabled?: boolean;
}

export function useStudentProgress(
  courseId: string,
  studentId: string,
  options?: UseStudentProgressOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<InstructorStudentProgress>({
    queryKey: instructorKeys.studentProgress(user?.id, courseId, studentId),
    queryFn: () => instructorService.getStudentProgress(courseId, studentId),
    enabled: enabled && !!user?.id && !!courseId && !!studentId,
  });
}
