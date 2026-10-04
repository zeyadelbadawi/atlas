/**
 * useUpdateCourseSection hook.
 *
 * Mutation hook for updating a course section.
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
import type { CourseSection, UpdateCourseSectionPayload } from '@types';

export interface UpdateCourseSectionVariables {
  readonly sectionId: string;
  readonly payload: UpdateCourseSectionPayload;
}

export function useUpdateCourseSection(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();

  const mutation = useApiMutation<
    CourseSection,
    AcademyScopedVariables<UpdateCourseSectionVariables>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: { sectionId, payload } }) =>
      courseService.updateCourseSection(
        academyId,
        courseId,
        sectionId,
        payload
      ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { academyId }) => {
      await invalidate(courseKeys.sections(academyId, courseId));
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
