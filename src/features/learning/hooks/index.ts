/**
 * Student Learning hooks — public entry point.
 */
export { useEnrollments } from './useEnrollments';
export type { UseEnrollmentsOptions } from './useEnrollments';
export { useEnrollment } from './useEnrollment';
export type { UseEnrollmentOptions } from './useEnrollment';
export { useEnroll } from './useEnroll';
export { useDiscoverCourses } from './useDiscoverCourses';
export type { UseDiscoverCoursesOptions } from './useDiscoverCourses';
export { useDiscoverCourse } from './useDiscoverCourse';
export type { UseDiscoverCourseOptions } from './useDiscoverCourse';
export { useCourseProgress } from './useCourseProgress';
export type { UseCourseProgressOptions } from './useCourseProgress';
export { useCourseContent } from './useCourseContent';
export type { UseCourseContentOptions } from './useCourseContent';
export { useCompleteLesson } from './useCompleteLesson';
export { useQuizzes } from './useQuizzes';
export type { UseQuizzesOptions } from './useQuizzes';
export { useQuiz } from './useQuiz';
export type { UseQuizOptions } from './useQuiz';
export { useQuizAttempts } from './useQuizAttempts';
export type { UseQuizAttemptsOptions } from './useQuizAttempts';
export { useStartQuizAttempt } from './useStartQuizAttempt';
export { useSubmitQuizAttempt } from './useSubmitQuizAttempt';
export type { SubmitQuizAttemptVariables } from './useSubmitQuizAttempt';
export { useAssignments } from './useAssignments';
export type { UseAssignmentsOptions } from './useAssignments';
export { useAssignment } from './useAssignment';
export type { UseAssignmentOptions } from './useAssignment';
export { useAssignmentSubmission } from './useAssignmentSubmission';
export type { UseAssignmentSubmissionOptions } from './useAssignmentSubmission';
export { useSubmitAssignment } from './useSubmitAssignment';

// Phase 4 — authoring + real-file-upload hooks.
export { useQuizzesForAuthoring } from './useQuizzesForAuthoring';
export type { UseQuizzesForAuthoringOptions } from './useQuizzesForAuthoring';
export { useQuizForAuthoring } from './useQuizForAuthoring';
export type { UseQuizForAuthoringOptions } from './useQuizForAuthoring';
export { useCreateQuiz } from './useCreateQuiz';
export { useUpdateQuiz } from './useUpdateQuiz';
export type { UpdateQuizVariables } from './useUpdateQuiz';
export { useDeleteQuiz } from './useDeleteQuiz';
export { useAssignmentsForAuthoring } from './useAssignmentsForAuthoring';
export type { UseAssignmentsForAuthoringOptions } from './useAssignmentsForAuthoring';
export { useAssignmentForAuthoring } from './useAssignmentForAuthoring';
export type { UseAssignmentForAuthoringOptions } from './useAssignmentForAuthoring';
export { useCreateAssignment } from './useCreateAssignment';
export { useUpdateAssignment } from './useUpdateAssignment';
export type { UpdateAssignmentVariables } from './useUpdateAssignment';
export { useDeleteAssignment } from './useDeleteAssignment';
export { useUploadSubmissionAttachment } from './useUploadSubmissionAttachment';
export type { UploadSubmissionAttachmentVariables } from './useUploadSubmissionAttachment';

// P64 Phase 3 — quiz engine v2, drafts, completion and certificates.
export { useQuizAttemptSession } from './useQuizAttemptSession';
export type { UseQuizAttemptSessionOptions } from './useQuizAttemptSession';
export { useQuizAttemptResults } from './useQuizAttemptResults';
export type { UseQuizAttemptResultsOptions } from './useQuizAttemptResults';
export { useSaveQuizAnswers } from './useSaveQuizAnswers';
export type { SaveQuizAnswersVariables } from './useSaveQuizAnswers';
export { useRecordQuizAttemptEvents } from './useRecordQuizAttemptEvents';
export type { RecordQuizAttemptEventsVariables } from './useRecordQuizAttemptEvents';
export { useSaveAssignmentDraft } from './useSaveAssignmentDraft';
export { useCourseCompletion } from './useCourseCompletion';
export type { UseCourseCompletionOptions } from './useCourseCompletion';
export {
  useCompletionRule,
  useUpdateCompletionRule,
} from './useCompletionRule';
export type { UseCompletionRuleOptions } from './useCompletionRule';
export {
  useMyCertificates,
  useMyCertificate,
  useMyCertificateDownload,
  useVerifyCertificate,
  useAcademyCertificates,
  useAcademyCertificate,
  useRevokeCertificate,
  useRegenerateCertificate,
  useIssueCertificate,
  useCertificateTemplate,
  useUpdateCertificateTemplate,
} from './useCertificates';
export type { UseAcademyCertificatesOptions } from './useCertificates';
export {
  useMyCourseReview,
  useSubmitMyReview,
  useDeleteMyReview,
} from './useMyCourseReview';
