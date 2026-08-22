/**
 * useReorderCourseLessons hook.
 *
 * Mutation hook for persisting a new lesson order within a section.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { ReorderItemsPayload } from '@types';

export interface ReorderCourseLessonsVariables {
  readonly sectionId: string;
  readonly payload: ReorderItemsPayload;
}

export function useReorderCourseLessons(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, ReorderCourseLessonsVariables, ApiError>({
    mutationFn: ({ sectionId, payload }) =>
      courseService.reorderCourseLessons(
        academyId,
        courseId,
        sectionId,
        payload
      ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.sections(academyId, courseId));
    },
  });
}
