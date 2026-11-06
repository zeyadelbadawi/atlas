/**
 * B6 (UX audit) V05/V07 — every forum mutation whose failure the screen
 * shows itself (an inline alert, a field, one toast with the real reason)
 * declares `meta.inlineErrors`, so the app-wide reporter adds no second
 * message. Before, a failed thread, reply, pin or lock showed two toasts
 * (up to four on pin/lock).
 */
import { describe, expect, it, vi } from 'vitest';
import { INLINE_ERRORS_META } from '@services/query';

const captured = vi.hoisted(
  () =>
    [] as Array<{ meta?: Record<string, unknown>; showErrorToast?: boolean }>
);

vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useApiMutation: (options: {
    meta?: Record<string, unknown>;
    showErrorToast?: boolean;
  }) => {
    captured.push(options);
    return {};
  },
  useAuth: () => ({ user: { id: 'user-1' } }),
  useInvalidate: () => ({ invalidate: vi.fn() }),
}));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useQueryClient: () => ({ removeQueries: vi.fn() }),
}));

const forum = () => import('./hooks');

const hooks: Record<string, () => Promise<unknown>> = {
  useCreateThread: async () => (await forum()).useCreateThread,
  useCreateReply: async () => (await forum()).useCreateReply,
  usePinThread: async () => (await forum()).usePinThread,
  useUnpinThread: async () => (await forum()).useUnpinThread,
  useLockThread: async () => (await forum()).useLockThread,
  useUnlockThread: async () => (await forum()).useUnlockThread,
  useDeleteThread: async () => (await forum()).useDeleteThread,
  useDeleteReply: async () => (await forum()).useDeleteReply,
};

describe('B6 forum mutations render their own failures (one message)', () => {
  it.each(Object.keys(hooks))(
    '%s declares meta.inlineErrors and no toast of its own',
    async (name) => {
      const hook = (await hooks[name]()) as (...args: string[]) => unknown;
      captured.length = 0;
      hook('course-1', 'item-1');
      expect(captured.length).toBe(1);
      expect(captured[0]?.meta?.[INLINE_ERRORS_META]).toBe(true);
      expect(captured[0]?.showErrorToast).toBe(false);
    }
  );
});
