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
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import { invalidateRoster as invalidateRosterQueries } from '@services/query';
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

/**
 * Shared invalidation: every roster page/filter of THE ACADEMY THE ACTION
 * WAS MADE IN, the open learner's detail, and the counts a roster change
 * moves (academy stats, dashboard overview) — see `invalidateRoster`. W5
 * (F9): the academy comes from the mutation's variables, never from the
 * render that happens to be current when the request settles.
 */
function useRosterInvalidation() {
  const queryClient = useQueryClient();
  return (academyId: string, userId?: string) =>
    invalidateRosterQueries(queryClient, { academyId, userId });
}

export interface StudentActionVariables {
  readonly userId: string;
}

export interface BlockStudentVariables extends StudentActionVariables {
  readonly payload?: BlockAcademyStudentPayload;
}

export function useBlockAcademyStudent(academyId: string) {
  const invalidateRoster = useRosterInvalidation();
  const mutation = useApiMutation<
    AcademyRosterStudent,
    AcademyScopedVariables<BlockStudentVariables>,
    ApiError
  >({
    mutationFn: ({ academyId: id, payload: { userId, payload } }) =>
      academyRosterService.blockStudent(id, userId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (_data, { academyId: id, payload: { userId } }) =>
      invalidateRoster(id, userId),
  });

  return useAcademyBoundMutation(mutation, academyId);
}

function useStudentAction(
  academyId: string,
  action: (academyId: string, userId: string) => Promise<AcademyRosterStudent>
) {
  const invalidateRoster = useRosterInvalidation();
  const mutation = useApiMutation<
    AcademyRosterStudent,
    AcademyScopedVariables<StudentActionVariables>,
    ApiError
  >({
    mutationFn: ({ academyId: id, payload: { userId } }) => action(id, userId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (_data, { academyId: id, payload: { userId } }) =>
      invalidateRoster(id, userId),
  });

  return useAcademyBoundMutation(mutation, academyId);
}

export function useUnblockAcademyStudent(academyId: string) {
  return useStudentAction(academyId, (id, userId) =>
    academyRosterService.unblockStudent(id, userId)
  );
}

export function useApproveAcademyStudent(academyId: string) {
  return useStudentAction(academyId, (id, userId) =>
    academyRosterService.approveStudent(id, userId)
  );
}

export function useRejectAcademyStudent(academyId: string) {
  return useStudentAction(academyId, (id, userId) =>
    academyRosterService.rejectStudent(id, userId)
  );
}

export interface EnrollStudentVariables extends StudentActionVariables {
  readonly payload: EnrollAcademyStudentPayload;
}

export function useEnrollAcademyStudent(academyId: string) {
  const invalidateRoster = useRosterInvalidation();
  const mutation = useApiMutation<
    RosterEnrollment,
    AcademyScopedVariables<EnrollStudentVariables>,
    ApiError
  >({
    mutationFn: ({ academyId: id, payload: { userId, payload } }) =>
      academyRosterService.enrollStudent(id, userId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (_data, { academyId: id, payload: { userId } }) =>
      invalidateRoster(id, userId),
  });

  return useAcademyBoundMutation(mutation, academyId);
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
  const invalidateRoster = useRosterInvalidation();
  const mutation = useApiMutation<
    RosterEnrollment,
    AcademyScopedVariables<RevokeEnrollmentVariables>,
    ApiError
  >({
    mutationFn: ({ academyId: id, payload: { enrollmentId, payload } }) =>
      academyRosterService.revokeEnrollment(id, enrollmentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (_data, { academyId: id, payload: { userId } }) =>
      invalidateRoster(id, userId),
  });

  return useAcademyBoundMutation(mutation, academyId);
}

export interface UpdateEnrollmentExpiryVariables extends EnrollmentActionVariables {
  readonly payload: UpdateRosterEnrollmentExpiryPayload;
}

export function useUpdateRosterEnrollmentExpiry(academyId: string) {
  const invalidateRoster = useRosterInvalidation();
  const mutation = useApiMutation<
    RosterEnrollment,
    AcademyScopedVariables<UpdateEnrollmentExpiryVariables>,
    ApiError
  >({
    mutationFn: ({ academyId: id, payload: { enrollmentId, payload } }) =>
      academyRosterService.updateEnrollmentExpiry(id, enrollmentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: (_data, { academyId: id, payload: { userId } }) =>
      invalidateRoster(id, userId),
  });

  return useAcademyBoundMutation(mutation, academyId);
}
