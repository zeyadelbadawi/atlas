/**
 * Academy roster mutations (P64 Phase 1).
 *
 * Block/unblock, approve/reject, manual enrollment, revoke and expiry —
 * every one invalidates the roster list AND the open learner's detail so
 * the drawer and the table never disagree. Success/error toasts are left
 * to the calling component, which maps the backend's specific
 * `messageKey`s (`errors.academy.studentBlocked`, ...) to friendly copy;
 * the generic per-mutation toast would only duplicate that.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { academyKeys } from '@services/query';
import type { ApiError } from '@api';
import { academyRosterService } from '../services/AcademyRosterService';
import type {
  AcademyRosterStudent,
  BlockAcademyStudentPayload,
  EnrollAcademyStudentPayload,
  RevokeRosterEnrollmentPayload,
  RosterEnrollment,
  UpdateRosterEnrollmentExpiryPayload,
} from '@types';

/** Shared invalidation: the whole roster tree for this academy. */
function useRosterInvalidation(academyId: string) {
  const { invalidate } = useInvalidate();
  const { organization } = useAuth();
  return async (userId?: string) => {
    // Prefix without the `query` element so every filter/page variant of
    // the roster list is refetched, not just one exact query object.
    await invalidate([...academyKeys.all, 'roster', organization?.id, academyId]);
    if (userId) {
      await invalidate(
        academyKeys.rosterStudent(organization?.id, academyId, userId)
      );
    }
  };
}

export interface StudentActionVariables {
  readonly userId: string;
}

export interface BlockStudentVariables extends StudentActionVariables {
  readonly payload?: BlockAcademyStudentPayload;
}

export function useBlockAcademyStudent(academyId: string) {
  const invalidateRoster = useRosterInvalidation(academyId);
  return useApiMutation<AcademyRosterStudent, BlockStudentVariables, ApiError>({
    mutationFn: ({ userId, payload }) =>
      academyRosterService.blockStudent(academyId, userId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (_data, { userId }) => invalidateRoster(userId),
  });
}

export function useUnblockAcademyStudent(academyId: string) {
  const invalidateRoster = useRosterInvalidation(academyId);
  return useApiMutation<AcademyRosterStudent, StudentActionVariables, ApiError>({
    mutationFn: ({ userId }) =>
      academyRosterService.unblockStudent(academyId, userId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (_data, { userId }) => invalidateRoster(userId),
  });
}

export function useApproveAcademyStudent(academyId: string) {
  const invalidateRoster = useRosterInvalidation(academyId);
  return useApiMutation<AcademyRosterStudent, StudentActionVariables, ApiError>({
    mutationFn: ({ userId }) =>
      academyRosterService.approveStudent(academyId, userId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (_data, { userId }) => invalidateRoster(userId),
  });
}

export function useRejectAcademyStudent(academyId: string) {
  const invalidateRoster = useRosterInvalidation(academyId);
  return useApiMutation<AcademyRosterStudent, StudentActionVariables, ApiError>({
    mutationFn: ({ userId }) =>
      academyRosterService.rejectStudent(academyId, userId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (_data, { userId }) => invalidateRoster(userId),
  });
}

export interface EnrollStudentVariables extends StudentActionVariables {
  readonly payload: EnrollAcademyStudentPayload;
}

export function useEnrollAcademyStudent(academyId: string) {
  const invalidateRoster = useRosterInvalidation(academyId);
  return useApiMutation<RosterEnrollment, EnrollStudentVariables, ApiError>({
    mutationFn: ({ userId, payload }) =>
      academyRosterService.enrollStudent(academyId, userId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (_data, { userId }) => invalidateRoster(userId),
  });
}

export interface EnrollmentActionVariables {
  /** The learner whose detail should refresh — the enrollment endpoint itself is not user-scoped. */
  readonly userId: string;
  readonly enrollmentId: string;
}

export interface RevokeEnrollmentVariables extends EnrollmentActionVariables {
  readonly payload?: RevokeRosterEnrollmentPayload;
}

export function useRevokeRosterEnrollment(academyId: string) {
  const invalidateRoster = useRosterInvalidation(academyId);
  return useApiMutation<RosterEnrollment, RevokeEnrollmentVariables, ApiError>({
    mutationFn: ({ enrollmentId, payload }) =>
      academyRosterService.revokeEnrollment(academyId, enrollmentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (_data, { userId }) => invalidateRoster(userId),
  });
}

export interface UpdateEnrollmentExpiryVariables
  extends EnrollmentActionVariables {
  readonly payload: UpdateRosterEnrollmentExpiryPayload;
}

export function useUpdateRosterEnrollmentExpiry(academyId: string) {
  const invalidateRoster = useRosterInvalidation(academyId);
  return useApiMutation<
    RosterEnrollment,
    UpdateEnrollmentExpiryVariables,
    ApiError
  >({
    mutationFn: ({ enrollmentId, payload }) =>
      academyRosterService.updateEnrollmentExpiry(
        academyId,
        enrollmentId,
        payload
      ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (_data, { userId }) => invalidateRoster(userId),
  });
}
