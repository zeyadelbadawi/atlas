/**
 * Local-first dashboard — notification read state is the first change the
 * dashboard accepts offline, because replaying it is provably harmless:
 *
 *   notification.read      PATCH notifications/:id/read — the same state
 *                          however often it is sent; a notification deleted
 *                          meanwhile (404) is simply dropped.
 *   notification.readAll   POST notifications/read-all { before } — bounded
 *                          by the moment the person pressed it, so a replay
 *                          hours later never marks newer notifications read.
 *
 * The local cache is updated immediately (the badge and the list reflect
 * the tap at once) and the outbox carries the change to the server.
 */
import type { QueryClient } from '@tanstack/react-query';
import { notificationKeys } from '@services/query';
import { registerOutboxHandler } from '@services/offline';
import type {
  Notification,
  NotificationSummary,
  PaginatedResult,
} from '@types';
import { notificationService } from '../services/NotificationService';

export const NOTIFICATION_READ = 'notification.read';
export const NOTIFICATION_READ_ALL = 'notification.readAll';

export interface NotificationReadPayload {
  readonly notificationId: string;
}

export interface NotificationReadAllPayload {
  readonly before: string;
}

registerOutboxHandler<NotificationReadPayload>(NOTIFICATION_READ, {
  run: async ({ notificationId }) => {
    await notificationService.markAsRead(notificationId);
  },
  dropOnStatus: [404],
});

registerOutboxHandler<NotificationReadAllPayload>(NOTIFICATION_READ_ALL, {
  run: ({ before }) => notificationService.markAllAsRead(undefined, before),
});

function isList(value: unknown): value is PaginatedResult<Notification> {
  return (
    !!value && Array.isArray((value as PaginatedResult<Notification>).items)
  );
}

/** The list query asked for unread notifications only (`filters.isRead: false`). */
function isUnreadOnlyFeed(queryKey: readonly unknown[]): boolean {
  const query = queryKey[queryKey.length - 1] as
    { readonly filters?: { readonly isRead?: unknown } } | undefined;
  return query?.filters?.isRead === false;
}

function isSummary(value: unknown): value is NotificationSummary {
  return !!value && typeof (value as NotificationSummary).unread === 'number';
}

/**
 * Marks notifications read in every cached feed and count of `scope`:
 * one id, or every notification created at/before `before`.
 */
export function applyReadLocally(
  queryClient: QueryClient,
  scope: string,
  target: { readonly notificationId: string } | { readonly before: string }
): void {
  const matches = (notification: Notification) =>
    'notificationId' in target
      ? notification.id === target.notificationId
      : notification.createdAt <= target.before;
  // Distinct ids: the same notification can sit in several cached feeds.
  const newlyRead = new Set<string>();
  for (const [key, data] of queryClient.getQueriesData({
    queryKey: notificationKeys.scope(scope),
  })) {
    if (!isList(data)) continue;
    const items = data.items.map((notification) => {
      if (!notification.isRead && matches(notification)) {
        newlyRead.add(notification.id);
        return { ...notification, isRead: true };
      }
      return notification;
    });
    queryClient.setQueryData(key, {
      ...data,
      // An unread-only feed (the bell's preview) drops what is now read,
      // as the server's answer would.
      items: isUnreadOnlyFeed(key) ? items.filter((n) => !n.isRead) : items,
    });
  }
  for (const [key, data] of queryClient.getQueriesData({
    queryKey: notificationKeys.scope(scope),
  })) {
    if (!isSummary(data)) continue;
    const unread =
      'before' in target ? 0 : Math.max(0, data.unread - newlyRead.size);
    queryClient.setQueryData(key, { ...data, unread });
  }
}
