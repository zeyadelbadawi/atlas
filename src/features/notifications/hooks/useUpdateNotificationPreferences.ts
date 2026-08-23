/**
 * useUpdateNotificationPreferences hook.
 *
 * The settings page shows its own contextual saving/success/error state,
 * so no toast here.
 */
import { useApiMutation } from '@/shared/hooks';
import { notificationKeys } from '@services/query';
import { notificationService } from '../services/NotificationService';
import type { ApiError } from '@api';
import type { NotificationPreferences } from '@types';

export function useUpdateNotificationPreferences() {
  return useApiMutation<NotificationPreferences, NotificationPreferences, ApiError>({
    mutationFn: (payload) => notificationService.updatePreferences(payload),
    showSuccessToast: false,
    showErrorToast: false,
    invalidateKeys: [notificationKeys.all],
  });
}
