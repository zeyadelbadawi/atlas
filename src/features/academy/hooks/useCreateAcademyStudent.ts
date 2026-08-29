/**
 * useCreateAcademyStudent hook.
 *
 * Mutation hook for creating a brand-new test/real student account
 * (`AcademyService.createAcademyStudent`).
 */
import { useApiMutation } from '@/shared/hooks';
import type { ApiError } from '@api';
import { academyService } from '../services/AcademyService';
import type { AcademyStudent, CreateAcademyStudentPayload } from '@types';

export interface CreateAcademyStudentVariables {
  readonly academyId: string;
  readonly payload: CreateAcademyStudentPayload;
}

export function useCreateAcademyStudent() {
  return useApiMutation<AcademyStudent, CreateAcademyStudentVariables, ApiError>({
    mutationFn: ({ academyId, payload }) =>
      academyService.createAcademyStudent(academyId, payload),
    // A student account is never listed on the Academy Members page (no
    // academy_members row is created), so there is no members-list query
    // to invalidate here — unlike Manager/Instructor.
    showSuccessToast: false,
    showErrorToast: false,
  });
}
