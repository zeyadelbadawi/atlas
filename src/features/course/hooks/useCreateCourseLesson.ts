/**
 * useCreateCourseLesson hook.
 *
 * Mutation hook for adding a lesson to a course section.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { CourseLesson, CreateCourseLessonPayload } from '@types';

export interface CreateCourseLessonVariables {
  readonly sectionId: string;
  readonly payload: CreateCourseLessonPayload;
}

export function useCreateCourseLesson(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<CourseLesson, CreateCourseLessonVariables, ApiError>({
    mutationFn: ({ sectionId, payload }) =>
      courseService.createCourseLesson(academyId, courseId, sectionId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.sections(academyId, courseId));
    },
  });
}
