/**
 * useNotificationSummary hook.
 *
 * The one source of the unread count — reused by both `NotificationsPage`
 * (unread tab badge) and any future header widget, never a duplicated
 * hardcoded count.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { notificationKeys } from '@services/query';
import { notificationService } from '../services/NotificationService';
import type { NotificationSummary } from '@types';
import type { ApiError } from '@api';

export function useNotificationSummary() {
  const { user } = useAuth();

  return useApiQuery<NotificationSummary, ApiError>({
    queryKey: notificationKeys.unreadCount(user?.id),
    queryFn: () => notificationService.getSummary(),
    enabled: !!user,
  });
}
