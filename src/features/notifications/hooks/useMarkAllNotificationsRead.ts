/**
 * useMarkAllNotificationsRead hook.
 */
import { useApiMutation } from '@/shared/hooks';
import { notificationKeys } from '@services/query';
import { notificationService } from '../services/NotificationService';
import type { ApiError } from '@api';

export function useMarkAllNotificationsRead() {
  return useApiMutation<void, void, ApiError>({
    mutationFn: () => notificationService.markAllAsRead(),
    successMessageKey: 'notifications:messages.markAllReadSuccess',
    invalidateKeys: [notificationKeys.all],
  });
}
