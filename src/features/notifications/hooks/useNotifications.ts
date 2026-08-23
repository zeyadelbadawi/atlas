/**
 * useNotifications hook.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { notificationKeys } from '@services/query';
import { notificationService } from '../services/NotificationService';
import type { CollectionQuery, Notification, PaginatedResult } from '@types';
import type { ApiError } from '@api';

export interface UseNotificationsOptions {
  readonly query?: CollectionQuery;
}

export function useNotifications(options?: UseNotificationsOptions) {
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<Notification>, ApiError>({
    queryKey: notificationKeys.list(user?.id, options?.query),
    queryFn: () => notificationService.getNotifications(options?.query),
    enabled: !!user,
  });
}
