/**
 * useMarkNotificationRead hook.
 */
import { useApiMutation } from '@/shared/hooks';
import { notificationKeys } from '@services/query';
import { notificationService } from '../services/NotificationService';
import { useNotificationScope } from '../context/notification-scope';
import type { ApiError } from '@api';
import type { Notification } from '@types';

export function useMarkNotificationRead() {
  const scope = useNotificationScope();
  return useApiMutation<Notification, string, ApiError>({
    mutationFn: (notificationId) =>
      notificationService.markAsRead(notificationId),
    showSuccessToast: false,
    // Every feed and count of THIS context (whatever `query` filters the
    // list was fetched with) — never another context's entries.
    invalidateKeys: [notificationKeys.scope(scope)],
  });
}
