/**
 * useReorderCourseSections hook.
 *
 * Mutation hook for persisting a new section order.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { ReorderItemsPayload } from '@types';

export function useReorderCourseSections(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, ReorderItemsPayload, ApiError>({
    mutationFn: (payload) =>
      courseService.reorderCourseSections(academyId, courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.sections(academyId, courseId));
    },
  });
}
