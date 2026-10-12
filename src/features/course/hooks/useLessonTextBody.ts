/**
 * B0-LRN-01 — reads an existing text lesson's body for the builder's
 * lesson dialog (staff read; same permission as saving it).
 *
 * A 404 is an expected answer, not an error: an older text lesson can have
 * no content row, its body still in the description. The caller falls back
 * to that, so no retry and no toast.
 */
import { useApiQuery } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import type { StaffLessonContent } from '@types';
import { courseService } from '../services/CourseService';

export function useLessonTextBody(
  academyId: string,
  courseId: string,
  target: { readonly sectionId: string; readonly lessonId: string } | null
) {
  return useApiQuery<StaffLessonContent, ApiError>({
    queryKey: [
      ...courseKeys.detail(academyId, courseId),
      'lesson-content',
      target?.lessonId ?? null,
    ],
    queryFn: () =>
      courseService.getLessonContent(
        academyId,
        courseId,
        target!.sectionId,
        target!.lessonId
      ),
    enabled: target !== null,
    retry: false,
    staleTime: 0,
    placeholderData: undefined,
  });
}
