/**
 * useMarkNotificationRead hook.
 */
import { useApiMutation } from '@/shared/hooks';
import { notificationKeys } from '@services/query';
import { notificationService } from '../services/NotificationService';
import type { ApiError } from '@api';
import type { Notification } from '@types';

export function useMarkNotificationRead() {
  return useApiMutation<Notification, string, ApiError>({
    mutationFn: (notificationId) => notificationService.markAsRead(notificationId),
    showSuccessToast: false,
    // Invalidates every notification query (list/summary/preferences) for
    // the current user — broader than strictly necessary, but immune to
    // key-shape mismatches between this mutation and whatever `query`
    // filters the list was fetched with (the same reasoning
    // `useApprovePayment` already applies with `platformPaymentKeys.all`).
    invalidateKeys: [notificationKeys.all],
  });
}
