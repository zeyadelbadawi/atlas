/**
 * useUpdateCourseSection hook.
 *
 * Mutation hook for updating a course section.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { CourseSection, UpdateCourseSectionPayload } from '@types';

export interface UpdateCourseSectionVariables {
  readonly sectionId: string;
  readonly payload: UpdateCourseSectionPayload;
}

export function useUpdateCourseSection(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<CourseSection, UpdateCourseSectionVariables, ApiError>({
    mutationFn: ({ sectionId, payload }) =>
      courseService.updateCourseSection(academyId, courseId, sectionId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.sections(academyId, courseId));
    },
  });
}
