/**
 * useNotificationPreferences hook.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { notificationKeys } from '@services/query';
import { notificationService } from '../services/NotificationService';
import type { NotificationPreferences } from '@types';
import type { ApiError } from '@api';

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useApiQuery<NotificationPreferences, ApiError>({
    queryKey: notificationKeys.preferences(user?.id),
    queryFn: () => notificationService.getPreferences(),
    enabled: !!user,
  });
}
