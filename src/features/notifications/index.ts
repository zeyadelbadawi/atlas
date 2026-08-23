/**
 * Notifications feature exports.
 *
 * Notification center and management.
 */
export { default as NotificationsPage } from './pages/NotificationsPage';
export {
  useNotifications,
  useNotificationSummary,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from './hooks';
export type { UseNotificationsOptions } from './hooks';