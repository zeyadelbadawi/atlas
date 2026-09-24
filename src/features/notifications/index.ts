/**
 * Notifications feature exports.
 *
 * Notification center and management.
 */
export { default as NotificationsPage } from './pages/NotificationsPage';
export { NotificationBell } from './components/NotificationBell';
export {
  NotificationList,
  NotificationRow,
} from './components/NotificationList';
export type {
  NotificationListProps,
  NotificationRowProps,
} from './components/NotificationList';
export {
  CommunicationPreferencesMatrix,
  CommunicationPreferencesMatrixSkeleton,
} from './components/CommunicationPreferencesMatrix';
export { CommunicationPreferencesPanel } from './components/CommunicationPreferencesPanel';
export type {
  CommunicationPreferencesMatrixProps,
  CommunicationPreferencesMatrixMode,
} from './components/CommunicationPreferencesMatrix';
export {
  useNotifications,
  useNotificationSummary,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useCommunicationPreferences,
  useUpdateCommunicationPreferences,
} from './hooks';
export type { UseNotificationsOptions } from './hooks';
