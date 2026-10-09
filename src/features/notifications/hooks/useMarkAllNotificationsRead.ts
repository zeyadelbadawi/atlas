/**
 * useMarkAllNotificationsRead hook.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { useAuth } from '@hooks';
import { notificationKeys } from '@services/query';
import { enqueueOutbox } from '@services/offline';
import { normalizeUnknownError } from '@api';
import { notificationService } from '../services/NotificationService';
import { useNotificationScope } from '../context/notification-scope';
import {
  NOTIFICATION_READ_ALL,
  applyReadLocally,
} from '../offline/notification-outbox';
import type { ApiError } from '@api';

export function useMarkAllNotificationsRead() {
  const scope = useNotificationScope();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session.user?.id;
  return useApiMutation<void, void, ApiError>({
    mutationFn: async () => {
      // The moment of the tap bounds the action (also for a later replay from
      // the offline outbox): notifications that arrive afterwards stay unread.
      const before = new Date().toISOString();
      applyReadLocally(queryClient, scope, { before });
      const queue = async () =>
        !!userId &&
        (await enqueueOutbox(userId, NOTIFICATION_READ_ALL, { before }));
      if (
        typeof navigator !== 'undefined' &&
        navigator.onLine === false &&
        (await queue())
      ) {
        return;
      }
      try {
        await notificationService.markAllAsRead(undefined, before);
      } catch (raw) {
        const error = normalizeUnknownError(raw);
        if (
          (error.kind === 'network' || error.kind === 'timeout') &&
          (await queue())
        ) {
          return;
        }
        throw raw;
      }
    },
    successMessageKey: 'notifications:messages.markAllReadSuccess',
    invalidateKeys: [notificationKeys.scope(scope)],
  });
}
