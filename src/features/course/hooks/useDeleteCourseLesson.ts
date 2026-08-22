/**
 * useDeleteCourseLesson hook.
 *
 * Mutation hook for deleting a lesson.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';

export interface DeleteCourseLessonVariables {
  readonly sectionId: string;
  readonly lessonId: string;
}

export function useDeleteCourseLesson(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, DeleteCourseLessonVariables, ApiError>({
    mutationFn: ({ sectionId, lessonId }) =>
      courseService.deleteCourseLesson(
        academyId,
        courseId,
        sectionId,
        lessonId
      ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.sections(academyId, courseId));
    },
  });
}
