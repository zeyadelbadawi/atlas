/**
 * useCreateCourseSection hook.
 *
 * Mutation hook for adding a section to a course's curriculum.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { CourseSection, CreateCourseSectionPayload } from '@types';

export function useCreateCourseSection(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<CourseSection, CreateCourseSectionPayload, ApiError>({
    mutationFn: (payload) =>
      courseService.createCourseSection(academyId, courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.sections(academyId, courseId));
      await invalidate(courseKeys.detail(academyId, courseId));
    },
  });
}
