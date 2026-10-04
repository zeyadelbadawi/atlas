/**
 * useCreateCourseLesson hook.
 *
 * Mutation hook for adding a lesson to a course section. Invalidates the
 * whole builder curriculum (sections AND the unit item lists the builder
 * rows render from), so the new lesson appears without a refresh.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { CourseLesson, CreateCourseLessonPayload } from '@types';

export interface CreateCourseLessonVariables {
  readonly sectionId: string;
  readonly payload: CreateCourseLessonPayload;
}

export function useCreateCourseLesson(academyId: string, courseId: string) {
  const queryClient = useQueryClient();

  const mutation = useApiMutation<
    CourseLesson,
    AcademyScopedVariables<CreateCourseLessonVariables>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: { sectionId, payload } }) =>
      courseService.createCourseLesson(academyId, courseId, sectionId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { academyId }) => {
      await invalidateCourseCurriculum(queryClient, { academyId, courseId });
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
