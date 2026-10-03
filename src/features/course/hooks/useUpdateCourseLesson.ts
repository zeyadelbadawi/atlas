/**
 * useUpdateCourseLesson hook.
 *
 * Mutation hook for updating a lesson. Invalidates the whole builder
 * curriculum so the unit row shows the new title/status without a refresh.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { CourseLesson, UpdateCourseLessonPayload } from '@types';

export interface UpdateCourseLessonVariables {
  readonly sectionId: string;
  readonly lessonId: string;
  readonly payload: UpdateCourseLessonPayload;
}

export function useUpdateCourseLesson(academyId: string, courseId: string) {
  const queryClient = useQueryClient();

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
      await invalidateCourseCurriculum(queryClient, { academyId, courseId });
    },
  });
}
