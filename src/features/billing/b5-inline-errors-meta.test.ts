/**
 * B5 (UX audit V12) — every mutation whose failure the screen shows itself
 * (an inline alert, a dialog, a field) declares `meta.inlineErrors`, so the
 * app-wide reporter does not add a second or third message. Before, a
 * failed proof upload showed "Unexpected error" plus a toast with another
 * reason; a failed cancel showed a toast over the dialog's own text.
 */
import { describe, expect, it, vi } from 'vitest';
import { INLINE_ERRORS_META } from '@services/query';

const captured: Array<{
  meta?: Record<string, unknown>;
  showErrorToast?: boolean;
}> = [];

vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useApiMutation: (options: { meta?: Record<string, unknown> }) => {
    captured.push(options);
    return {};
  },
  useAcademyBoundMutation: (mutation: unknown) => mutation,
  useAuth: () => ({ organization: { id: 'org-1' } }),
  useInvalidate: () => ({ invalidate: vi.fn() }),
}));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useQueryClient: () => ({}),
}));

const hooks: Record<string, () => Promise<(...args: never[]) => unknown>> = {
  useSubmitPaymentProof: async () =>
    (await import('./hooks/useSubmitPaymentProof')).useSubmitPaymentProof,
  useCancelPayment: async () =>
    (await import('./hooks/useCancelPayment')).useCancelPayment,
  useCreatePayment: async () =>
    (await import('./hooks/useCreatePayment')).useCreatePayment,
  useCreateCheckout: async () =>
    (await import('./hooks/useCreateCheckout')).useCreateCheckout,
  useCancelTrial: async () =>
    (await import('@features/tenant/hooks/useSubscriptionLifecycle'))
      .useCancelTrial,
  useCancelSubscription: async () =>
    (await import('@features/tenant/hooks/useSubscriptionLifecycle'))
      .useCancelSubscription,
  useCreateCustomerRequest: async () =>
    (await import('@features/customer-requests/hooks/useCustomerRequests'))
      .useCreateCustomerRequest,
  useReplyToCustomerRequest: async () =>
    (await import('@features/customer-requests/hooks/useCustomerRequests'))
      .useReplyToCustomerRequest,
  useCancelCustomerRequest: async () =>
    (await import('@features/customer-requests/hooks/useCustomerRequests'))
      .useCancelCustomerRequest,
  useReplyToMySupportCase: async () =>
    (await import('@features/support/hooks/useMySupportCases'))
      .useReplyToMySupportCase,
  useCreateSupportCase: async () =>
    (await import('@features/support/hooks/useMySupportCases'))
      .useCreateSupportCase,
  useCloseMySupportCase: async () =>
    (await import('@features/support/hooks/useMySupportCases'))
      .useCloseMySupportCase,
  useCreateLiveSession: async () =>
    (await import('@features/live-sessions/hooks/useLiveSessions'))
      .useCreateLiveSession,
  useUpdateLiveSession: async () =>
    (await import('@features/live-sessions/hooks/useLiveSessions'))
      .useUpdateLiveSession,
};

describe('B5 mutations render their own failures (one message)', () => {
  it.each(Object.keys(hooks))(
    '%s declares meta.inlineErrors and no toast of its own',
    async (name) => {
      const hook = await hooks[name]();
      captured.length = 0;
      (hook as (...args: string[]) => unknown)('academy-1', 'course-1');
      const options = captured.at(-1);
      expect(options?.meta?.[INLINE_ERRORS_META]).toBe(true);
      expect(options?.showErrorToast).toBe(false);
    }
  );
});
