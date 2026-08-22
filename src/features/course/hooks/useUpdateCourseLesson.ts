/**
 * useUpdateCourseLesson hook.
 *
 * Mutation hook for updating a lesson.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { CourseLesson, UpdateCourseLessonPayload } from '@types';

export interface UpdateCourseLessonVariables {
  readonly sectionId: string;
  readonly lessonId: string;
  readonly payload: UpdateCourseLessonPayload;
}

export function useUpdateCourseLesson(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<CourseLesson, UpdateCourseLessonVariables, ApiError>({
    mutationFn: ({ sectionId, lessonId, payload }) =>
      courseService.updateCourseLesson(
        academyId,
        courseId,
        sectionId,
        lessonId,
        payload
      ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.sections(academyId, courseId));
    },
  });
}
