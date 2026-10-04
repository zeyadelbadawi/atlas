/**
 * usePublishReadiness hook (W6).
 *
 * The server's publish-readiness verdict for one course — what the guided
 * course wizard's stepper, Review step and Publish button read. The key is
 * nested under the course detail key (`courseKeys.publishReadiness`), so
 * every course edit, publish and curriculum mutation that already
 * invalidates the detail refreshes it too.
 */
import { useApiQuery } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import { courseService } from '../services/CourseService';
import type { CoursePublishReadiness } from '@types';

export interface UsePublishReadinessOptions {
  readonly enabled?: boolean;
}

export function usePublishReadiness(
  academyId: string,
  courseId: string,
  options?: UsePublishReadinessOptions
) {
  const { enabled = true } = options ?? {};

  return useApiQuery<CoursePublishReadiness>({
    queryKey: courseKeys.publishReadiness(academyId, courseId),
    queryFn: () => courseService.getPublishReadiness(academyId, courseId),
    enabled: enabled && !!academyId && !!courseId,
  });
}
