/**
 * Notification context isolation (frontend) — each context has its own
 * cache identity: the Management feed, Academy A's and Academy B's never
 * share a query-cache entry, and a mark-read refreshes only its context.
 * (What a context may SEE is decided by the server, from the session.)
 */
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { notificationKeys } from '@services/query';
import { useNotificationScope } from '@features/notifications';
import { LearnerSurfaceProvider } from './context/LearnerSurface.context';

function inAcademy(academyId: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter>
      <LearnerSurfaceProvider
        academyId={academyId}
        locale="en"
        buildHref={(path) => path}
      >
        {children}
      </LearnerSurfaceProvider>
    </MemoryRouter>
  );
}

describe('notification scope', () => {
  it('is Management outside a learner area', () => {
    const { result } = renderHook(() => useNotificationScope());
    expect(result.current).toBe('management');
  });

  it("is the academy's own inside its learner area", () => {
    const a = renderHook(() => useNotificationScope(), {
      wrapper: inAcademy('aca-A'),
    });
    const b = renderHook(() => useNotificationScope(), {
      wrapper: inAcademy('aca-B'),
    });
    expect(a.result.current).toBe('academy:aca-A');
    expect(b.result.current).toBe('academy:aca-B');
  });

  it('gives every context distinct feed and count keys for the same user', () => {
    const scopes = ['management', 'academy:aca-A', 'academy:aca-B'];
    const lists = scopes.map((s) =>
      JSON.stringify(notificationKeys.list(s, 'u1'))
    );
    const counts = scopes.map((s) =>
      JSON.stringify(notificationKeys.unreadCount(s, 'u1'))
    );
    expect(new Set(lists).size).toBe(3);
    expect(new Set(counts).size).toBe(3);
  });

  it("a context's invalidation prefix covers its own entries only", () => {
    const prefix = JSON.stringify(
      notificationKeys.scope('academy:aca-A')
    ).slice(0, -1);
    expect(
      JSON.stringify(notificationKeys.list('academy:aca-A', 'u1'))
    ).toContain(prefix);
    expect(
      JSON.stringify(notificationKeys.list('academy:aca-B', 'u1'))
    ).not.toContain(prefix);
    expect(
      JSON.stringify(notificationKeys.unreadCount('management', 'u1'))
    ).not.toContain(prefix);
  });
});
