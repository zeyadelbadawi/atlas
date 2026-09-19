/**
 * Learner dashboard data hooks — internal entry point.
 *
 * Kept as its own barrel (rather than exported from the feature root) for
 * the same reason `features/learning/hooks` is: these are the feature's
 * own reads, and nothing outside `features/learner` has any business
 * calling them — every one of them is scoped to the signed-in learner on
 * the mounted academy surface, which is a context only this feature has.
 */
export { useLearnerOverview } from './useLearnerOverview';
export type { UseLearnerOverviewOptions } from './useLearnerOverview';
export { useLearnerAssessments } from './useLearnerAssessments';
export type { UseLearnerAssessmentsOptions } from './useLearnerAssessments';
export {
  useLearnerDevices,
  useRemoveLearnerDevice,
  useSessionTakeover,
} from './useLearnerDevices';
export type { UseLearnerDevicesOptions } from './useLearnerDevices';
export { useCourseSequence } from './useCourseSequence';
export type { UseCourseSequenceOptions } from './useCourseSequence';
export { useLearnerPurchases } from './useLearnerPurchases';
export type {
  UseLearnerPurchasesOptions,
  UseLearnerPurchasesResult,
} from './useLearnerPurchases';
export { useLearnerBottomNavVisibility } from './useLearnerBottomNavVisibility';

// The unified player's own hooks (§E.2, §E.3). Same barrel as the
// dashboard's: they are the same feature's reads, and the player is a page
// of this feature rather than a feature of its own.
export { useLessonGrant, grantRefreshDelayMs } from './useLessonGrant';
export type {
  UseLessonGrantOptions,
  UseLessonGrantResult,
} from './useLessonGrant';
export { usePlaybackHeartbeat } from './usePlaybackHeartbeat';
export type {
  UsePlaybackHeartbeatOptions,
  UsePlaybackHeartbeatResult,
} from './usePlaybackHeartbeat';
export { useVideoSource, supportsNativeHls } from './useVideoSource';
export type {
  UseVideoSourceOptions,
  UseVideoSourceResult,
} from './useVideoSource';
export {
  useCompleteLessonInPlayer,
  useUndoLessonCompletion,
} from './useLessonCompletion';
