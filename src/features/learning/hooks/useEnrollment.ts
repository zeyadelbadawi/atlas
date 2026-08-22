/**
 * useEnrollment hook.
 *
 * Fetches the current student's enrollment for one course, if any. Used to
 * derive the course's academyId (see Enrollment type) and to drive the
 * course details page's state-dependent actions (Enroll / Continue / ...).
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { enrollmentKeys } from '@services/query';
import { enrollmentService } from '../services/EnrollmentService';
import type { Enrollment } from '@types';

export interface UseEnrollmentOptions {
  readonly enabled?: boolean;
}

export function useEnrollment(
  courseId: string,
  options?: UseEnrollmentOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<Enrollment | null>({
    queryKey: enrollmentKeys.course(user?.id, courseId),
    queryFn: () => enrollmentService.getEnrollmentForCourse(courseId),
    enabled: enabled && !!user?.id && !!courseId,
  });
}
