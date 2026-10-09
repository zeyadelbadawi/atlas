/** Local-first dashboard — public surface of the offline layer. */
export {
  offlineStore,
  setOfflineStoreForTesting,
  MemoryOfflineStore,
  IndexedDbOfflineStore,
} from './offline-store';
export type {
  OfflineStore,
  OfflineStoreName,
  OfflineStoreStatus,
} from './offline-store';
export {
  isPersistableQueryKey,
  startQueryPersistence,
  restorePersistedQueries,
  deletePersistedQueries,
  clearOfflineData,
  containsForbiddenField,
  dashboardPersistencePolicy,
  PUBLIC_OWNER,
  OFFLINE_CACHE_TTL_MS,
} from './query-persistence';
export type { PersistencePolicy } from './query-persistence';
export {
  academyScope,
  configureOfflineScope,
  currentOfflineScope,
  PLATFORM_SCOPE,
} from './offline-scope';
export type { OfflineScope, OfflineSurface } from './offline-scope';
export {
  learnerPersistencePolicy,
  learnerOwnerOf,
  isLearnerCourseKey,
} from './learner-persistence';
export {
  saveOfflineLessonText,
  loadOfflineLessonText,
  purgeOfflineLesson,
  purgeOfflineCourse,
  loadAssignmentDraft,
  saveAssignmentDraft,
  deleteAssignmentDraft,
  saveQuizJournal,
  loadQuizJournal,
  deleteQuizJournal,
} from './learner-content';
export type {
  OfflineLessonText,
  OfflineAssignmentDraft,
  QuizAnswerJournal,
} from './learner-content';
export {
  startLearnerOfflineWatcher,
  purgeLearnerCourse,
  grantRefusalScope,
  sequenceRefusalScope,
} from './learner-offline-watcher';
export {
  minimalLearnerIdentity,
  saveIdentitySnapshot,
  loadIdentitySnapshot,
  markPendingSignOut,
  hasPendingSignOut,
  clearPendingSignOut,
} from './identity-snapshot';
export type { IdentitySnapshot } from './identity-snapshot';
export {
  registerOutboxHandler,
  enqueueOutbox,
  drainOutbox,
  retryOutbox,
  discardOutboxEntry,
  discardUnsyncableOutbox,
  startOutbox,
  subscribeOutbox,
  getOutboxSnapshot,
  listOutboxEntries,
  backoffDelay,
  OUTBOX_TOO_OLD_KEY,
} from './mutation-queue';
export type {
  OutboxEntry,
  OutboxSnapshot,
  OutboxHandler,
  OutboxStatus,
} from './mutation-queue';
export {
  getConnectivity,
  subscribeConnectivity,
  reportNetworkFailure,
  reportServerReached,
  installJitteredOnlineManager,
} from './connectivity';
export type { ConnectivityState, ConnectivitySnapshot } from './connectivity';
export { setUpAppShell } from './app-shell';
