/**
 * Academy hooks — public entry point.
 */
export { useAcademies } from './useAcademies';
export type { UseAcademiesOptions } from './useAcademies';
export { useAcademy } from './useAcademy';
export type { UseAcademyOptions } from './useAcademy';
export { useAcademyWebsiteStatus } from './useAcademyWebsiteStatus';
export { useUpdateAcademy } from './useUpdateAcademy';
export type { UpdateAcademyVariables } from './useUpdateAcademy';
export { useUpdateAcademyBranding } from './useUpdateAcademyBranding';
export type { UpdateAcademyBrandingVariables } from './useUpdateAcademyBranding';
export { useAcademyMembers } from './useAcademyMembers';
export type { UseAcademyMembersOptions } from './useAcademyMembers';
export { useAddAcademyManager } from './useAddAcademyManager';
export type { AddAcademyManagerVariables } from './useAddAcademyManager';
export { useAddAcademyInstructor } from './useAddAcademyInstructor';
export type { AddAcademyInstructorVariables } from './useAddAcademyInstructor';
export { useCreateAcademyStudent } from './useCreateAcademyStudent';
export type { CreateAcademyStudentVariables } from './useCreateAcademyStudent';
export { useAcademyStats } from './useAcademyStats';
export type { UseAcademyStatsOptions } from './useAcademyStats';
export { useDeleteAcademy } from './useDeleteAcademy';
export type { DeleteAcademyVariables } from './useDeleteAcademy';
// P64 Phase 1 — learner roster, registration policy and invites.
export { useAcademyStudents } from './useAcademyStudents';
export type { UseAcademyStudentsOptions } from './useAcademyStudents';
export { useAcademyStudent } from './useAcademyStudent';
export type { UseAcademyStudentOptions } from './useAcademyStudent';
export {
  useApproveAcademyStudent,
  useBlockAcademyStudent,
  useEnrollAcademyStudent,
  useRejectAcademyStudent,
  useRevokeRosterEnrollment,
  useUnblockAcademyStudent,
  useUpdateRosterEnrollmentExpiry,
} from './useAcademyStudentMutations';
export type {
  BlockStudentVariables,
  EnrollStudentVariables,
  EnrollmentActionVariables,
  RevokeEnrollmentVariables,
  StudentActionVariables,
  UpdateEnrollmentExpiryVariables,
} from './useAcademyStudentMutations';
export {
  useAcademyRegistrationPolicy,
  useUpdateAcademyRegistrationPolicy,
} from './useAcademyRegistrationPolicy';
export type { UseAcademyRegistrationPolicyOptions } from './useAcademyRegistrationPolicy';
export {
  useAcademyInvites,
  useCreateAcademyInvite,
  useRevokeAcademyInvite,
} from './useAcademyInvites';
export type { UseAcademyInvitesOptions } from './useAcademyInvites';
// 22 Sep 2026 — stale/foreign active-academy reconciliation (authorization audit).
export { useActiveAcademyReconciliation } from './useActiveAcademyReconciliation';
export {
  useAcademyCommunicationSettings,
  useUpdateAcademyCommunicationSettings,
} from './useAcademyCommunicationSettings';
// P64 Phase 2 — content protection, video tier and device policy (owner only).
export {
  useAcademyContentProtection,
  useAcademyDevicePolicy,
  useAcademyVideoTier,
  useUpdateAcademyContentProtection,
  useUpdateAcademyDevicePolicy,
  useUpdateAcademyVideoTier,
} from './useAcademyProtection';
export type { UseAcademyProtectionQueryOptions } from './useAcademyProtection';
// P13 — the Organization Owner's academy revenue summary and payouts.
export {
  useAcademyPayouts,
  useAcademyRevenueSummary,
} from './useAcademyPayouts';
// Academy Orders — the Organization Owner's read-only course orders.
export {
  useAcademyCourseOrder,
  useAcademyCourseOrders,
} from './useAcademyCourseOrders';
