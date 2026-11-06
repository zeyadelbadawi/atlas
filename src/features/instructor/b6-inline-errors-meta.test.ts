/**
 * B6 (UX audit) V07 — every instructor mutation whose failure
 * the screen shows itself (an inline alert, a field, one toast with the
 * real reason) declares `meta.inlineErrors`, so the app-wide reporter adds
 * no second message. Before, a failed grade, void, override, or CSV export
 * showed two toasts.
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

const instructor = () => import('./hooks');

const hooks: Record<string, () => Promise<unknown>> = {
  useGradeSubmission: async () => (await instructor()).useGradeSubmission,
  useGradeQuizAttempt: async () => (await instructor()).useGradeQuizAttempt,
  useInvalidateQuizAttempt: async () =>
    (await instructor()).useInvalidateQuizAttempt,
  useUpsertQuizOverride: async () => (await instructor()).useUpsertQuizOverride,
  useDeleteQuizOverride: async () => (await instructor()).useDeleteQuizOverride,
  useIntegrityCsv: async () => (await instructor()).useIntegrityCsv,
};

describe('B6 instructor mutations render their own failures (one message)', () => {
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
