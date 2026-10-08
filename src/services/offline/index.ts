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
  clearOfflineData,
  OFFLINE_CACHE_TTL_MS,
} from './query-persistence';
export {
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
  backoffDelay,
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
