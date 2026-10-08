/**
 * useMarkAllNotificationsRead hook.
 */
import { useApiMutation } from '@/shared/hooks';
import { notificationKeys } from '@services/query';
import { notificationService } from '../services/NotificationService';
import { useNotificationScope } from '../context/notification-scope';
import type { ApiError } from '@api';

export function useMarkAllNotificationsRead() {
  const scope = useNotificationScope();
  return useApiMutation<void, void, ApiError>({
    mutationFn: () => notificationService.markAllAsRead(),
    successMessageKey: 'notifications:messages.markAllReadSuccess',
    invalidateKeys: [notificationKeys.scope(scope)],
  });
}
