/**
 * useUpdateNotificationPreferences hook.
 *
 * The settings page shows its own contextual saving/success/error state,
 * so no toast here — neither this hook's nor the app-wide reporter's
 * (B1, UX audit: a failed save showed the card AND a toast).
 */
import { useApiMutation } from '@/shared/hooks';
import { INLINE_ERRORS_META, notificationKeys } from '@services/query';
import { notificationService } from '../services/NotificationService';
import type { ApiError } from '@api';
import type { NotificationPreferences } from '@types';

export function useUpdateNotificationPreferences() {
  return useApiMutation<
    NotificationPreferences,
    NotificationPreferences,
    ApiError
  >({
    mutationFn: (payload) => notificationService.updatePreferences(payload),
    showSuccessToast: false,
    showErrorToast: false,
    invalidateKeys: [notificationKeys.all],
    meta: { [INLINE_ERRORS_META]: true },
  });
}
