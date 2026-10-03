/**
 * useCreateCourseSection hook.
 *
 * Mutation hook for adding a section to a course's curriculum.
 */
import {
  useApiMutation,
  useInvalidate,
  useAcademyBoundMutation,
} from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { CourseSection, CreateCourseSectionPayload } from '@types';

export function useCreateCourseSection(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();

  const mutation = useApiMutation<
    CourseSection,
    AcademyScopedVariables<CreateCourseSectionPayload>,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      courseService.createCourseSection(academyId, courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { academyId }) => {
      await invalidate(courseKeys.sections(academyId, courseId));
      await invalidate(courseKeys.detail(academyId, courseId));
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
