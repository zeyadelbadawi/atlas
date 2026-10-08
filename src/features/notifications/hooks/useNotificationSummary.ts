/**
 * useNotificationSummary hook.
 *
 * The one source of the unread count — reused by both `NotificationsPage`
 * (unread tab badge) and the two bells, never a duplicated hardcoded
 * count.
 *
 * Polled once a minute and on window focus: there is no push channel, so
 * this is what keeps a badge honest for a person who leaves a tab open.
 * A minute is deliberately coarse — the count is a hint to open the
 * centre, not a live feed — and the focus refetch covers the common
 * case of coming back to the tab.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { notificationKeys } from '@services/query';
import { notificationService } from '../services/NotificationService';
import { useNotificationScope } from '../context/notification-scope';
import type { NotificationSummary } from '@types';
import type { ApiError } from '@api';

export function useNotificationSummary() {
  const { user } = useAuth();
  const scope = useNotificationScope();

  return useApiQuery<NotificationSummary, ApiError>({
    queryKey: notificationKeys.unreadCount(scope, user?.id),
    queryFn: () => notificationService.getSummary(),
    enabled: !!user,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
