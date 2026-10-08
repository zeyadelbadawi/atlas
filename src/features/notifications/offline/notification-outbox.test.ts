/**
 * Offline notification read state: the tap is reflected at once in every
 * cached feed and count of the SAME context only, and the outbox handlers
 * send the replay-safe requests.
 */
import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { notificationKeys } from '@services/query';

const markAsRead = vi.fn();
const markAllAsRead = vi.fn();
vi.mock('../services/NotificationService', () => ({
  notificationService: {
    markAsRead: (...a: unknown[]) => markAsRead(...a),
    markAllAsRead: (...a: unknown[]) => markAllAsRead(...a),
  },
}));

import { applyReadLocally } from './notification-outbox';

const n = (id: string, createdAt: string, isRead = false) => ({
  id,
  createdAt,
  isRead,
});

function seed(scope: string) {
  const client = new QueryClient();
  const items = [
    n('a', '2026-10-01T10:00:00.000Z'),
    n('b', '2026-10-01T11:00:00.000Z'),
    n('c', '2026-10-01T12:00:00.000Z', true),
  ];
  client.setQueryData(notificationKeys.list(scope, 'u1', undefined), {
    items,
    total: 3,
  });
  client.setQueryData(
    notificationKeys.list(scope, 'u1', { filters: { isRead: false } } as never),
    {
      items: items.slice(0, 2),
      total: 2,
    }
  );
  client.setQueryData(notificationKeys.unreadCount(scope, 'u1'), {
    total: 3,
    unread: 2,
  });
  return client;
}

const unread = (client: QueryClient, scope: string) =>
  (
    client.getQueryData(notificationKeys.unreadCount(scope, 'u1')) as {
      unread: number;
    }
  ).unread;

describe('applyReadLocally', () => {
  it('marks one notification read in every feed and decrements the count once', () => {
    const client = seed('academy:A');
    applyReadLocally(client, 'academy:A', { notificationId: 'a' });
    for (const [, data] of client.getQueriesData<{
      items: { id: string; isRead: boolean }[];
    }>({
      queryKey: notificationKeys.scope('academy:A'),
    })) {
      const a =
        data && 'items' in data
          ? data.items.find((x) => x.id === 'a')
          : undefined;
      // Absent (dropped from an unread-only feed) or present and read.
      if (a) expect(a.isRead).toBe(true);
    }
    expect(unread(client, 'academy:A')).toBe(1);
  });

  it('removes it from an unread-only feed (the bell preview)', () => {
    const client = seed('academy:A');
    applyReadLocally(client, 'academy:A', { notificationId: 'a' });
    const unreadFeed = client.getQueryData<{ items: { id: string }[] }>(
      notificationKeys.list('academy:A', 'u1', {
        filters: { isRead: false },
      } as never)
    )!;
    expect(unreadFeed.items.map((x) => x.id)).toEqual(['b']);
  });

  it('does not decrement for a notification that was already read', () => {
    const client = seed('academy:A');
    applyReadLocally(client, 'academy:A', { notificationId: 'c' });
    expect(unread(client, 'academy:A')).toBe(2);
  });

  it('mark-all is bounded by `before`', () => {
    const client = seed('academy:A');
    applyReadLocally(client, 'academy:A', {
      before: '2026-10-01T10:30:00.000Z',
    });
    const list = client.getQueryData<{
      items: { id: string; isRead: boolean }[];
    }>(notificationKeys.list('academy:A', 'u1', undefined))!;
    expect(list.items.map((x) => x.isRead)).toEqual([true, false, true]);
  });

  it("never touches another context's cache", () => {
    const client = seed('academy:A');
    client.setQueryData(notificationKeys.list('academy:B', 'u1', undefined), {
      items: [n('a', '2026-10-01T10:00:00.000Z')],
      total: 1,
    });
    client.setQueryData(notificationKeys.unreadCount('academy:B', 'u1'), {
      total: 1,
      unread: 1,
    });
    applyReadLocally(client, 'academy:A', {
      before: '2026-12-01T00:00:00.000Z',
    });
    expect(unread(client, 'academy:B')).toBe(1);
    expect(
      client.getQueryData<{ items: { isRead: boolean }[] }>(
        notificationKeys.list('academy:B', 'u1', undefined)
      )!.items[0].isRead
    ).toBe(false);
  });
});
