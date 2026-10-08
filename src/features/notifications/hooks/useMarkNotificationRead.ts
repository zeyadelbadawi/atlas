/**
 * useMarkNotificationRead hook.
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
  NOTIFICATION_READ,
  applyReadLocally,
} from '../offline/notification-outbox';
import type { ApiError } from '@api';
import type { Notification } from '@types';

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function useMarkNotificationRead() {
  const scope = useNotificationScope();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session.user?.id;
  return useApiMutation<Notification | null, string, ApiError>({
    // Local-first dashboard — offline (or when the request cannot reach the
    // server) the change is kept in the durable outbox and sent later;
    // replaying a mark-read is harmless (`notification-outbox.ts`).
    mutationFn: async (notificationId) => {
      const queue = async () =>
        !!userId &&
        (await enqueueOutbox(userId, NOTIFICATION_READ, { notificationId }));
      if (isOffline() && (await queue())) return null;
      try {
        return await notificationService.markAsRead(notificationId);
      } catch (raw) {
        const error = normalizeUnknownError(raw);
        if (
          (error.kind === 'network' || error.kind === 'timeout') &&
          (await queue())
        ) {
          return null;
        }
        throw raw;
      }
    },
    // The badge and the list reflect the tap at once, online or not.
    onMutate: (notificationId) =>
      applyReadLocally(queryClient, scope, { notificationId }),
    showSuccessToast: false,
    // Every feed and count of THIS context (whatever `query` filters the
    // list was fetched with) — never another context's entries.
    invalidateKeys: [notificationKeys.scope(scope)],
  });
}
