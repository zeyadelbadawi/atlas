/**
 * useEnroll hook.
 *
 * Mutation hook for enrolling the current student in a course. Does not
 * implement payment, checkout or orders — it only records the enrollment
 * relationship through the abstract service contract.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { enrollmentKeys } from '@services/query';
import type { ApiError } from '@api';
import { enrollmentService } from '../services/EnrollmentService';
import type { CreateEnrollmentPayload, Enrollment } from '@types';

export function useEnroll() {
  const { invalidate } = useInvalidate();

  return useApiMutation<Enrollment, CreateEnrollmentPayload, ApiError>({
    mutationFn: (payload) => enrollmentService.createEnrollment(payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(enrollmentKeys.all);
    },
  });
}
