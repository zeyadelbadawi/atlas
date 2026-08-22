/**
 * useCreateCourse hook.
 *
 * Mutation hook for creating a new course within an academy.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { Course, CreateCoursePayload } from '@types';

export function useCreateCourse(academyId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<Course, CreateCoursePayload, ApiError>({
    mutationFn: (payload) => courseService.createCourse(academyId, payload),
    // The page shows its own contextual success/error toast and maps
    // validation errors onto form fields, so the mutation's generic toast is
    // suppressed to avoid showing the user two messages for one failure.
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.all);
    },
  });
}
