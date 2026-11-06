/**
 * B8 (UX audit) V03/V14 — every Platform Owner write whose failure the
 * console shows itself (a field, one inline alert, one toast with the real
 * reason) declares `meta.inlineErrors`, so the app-wide reporter adds no
 * second message. Before, a failed approve/reject, suspend, request reply,
 * internal switch, trial policy, payment method, provider, commission,
 * plan or support action showed two messages that often disagreed.
 *
 * The internal-flag and deletion-plan READS are rendered by their card and
 * dialog, so they opt out of the reporter the same way (query `meta`).
 */
import { describe, expect, it, vi } from 'vitest';
import { INLINE_ERRORS_META } from '@services/query';

const captured = vi.hoisted(
  () =>
    [] as Array<{ meta?: Record<string, unknown>; showErrorToast?: boolean }>
);
const capturedQueries = vi.hoisted(
  () => [] as Array<{ meta?: Record<string, unknown> }>
);

const mockedHooks = vi.hoisted(() => ({
  useApiMutation: (options: {
    meta?: Record<string, unknown>;
    showErrorToast?: boolean;
  }) => {
    captured.push(options);
    return { reset: () => undefined };
  },
  useApiQuery: (options: { meta?: Record<string, unknown> }) => {
    capturedQueries.push(options);
    return { data: undefined, refetch: () => undefined };
  },
  useInvalidate: () => ({ invalidate: () => Promise.resolve() }),
}));

vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...mockedHooks,
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...mockedHooks,
}));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useQueryClient: () => ({
    removeQueries: vi.fn(),
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  }),
}));

type Hook = (...args: string[]) => unknown;
const billingHooks = () =>
  import('@features/billing/hooks') as unknown as Promise<Record<string, Hook>>;
const billing = (name: string) => async () => (await billingHooks())[name];

const hooks: Record<string, () => Promise<Hook>> = {
  useApprovePayment: billing('useApprovePayment'),
  useRejectPayment: billing('useRejectPayment'),
  useCreateBankTransferMethod: billing('useCreateBankTransferMethod'),
  useCreateWalletMethod: billing('useCreateWalletMethod'),
  useCreateInstapayMethod: billing('useCreateInstapayMethod'),
  useUpdatePlatformPaymentMethod: billing('useUpdatePlatformPaymentMethod'),
  useSaveAtlasSubscriptionPaymentProviderConfig: billing(
    'useSaveAtlasSubscriptionPaymentProviderConfig'
  ),
  useSetAtlasSubscriptionPaymentProviderEnabled: billing(
    'useSetAtlasSubscriptionPaymentProviderEnabled'
  ),
  useTestAtlasSubscriptionPaymentProviderConnection: billing(
    'useTestAtlasSubscriptionPaymentProviderConnection'
  ),
  useSetOrganizationInternal: async () =>
    (await import('./hooks/useOrganizationPlatformFlags'))
      .useSetOrganizationInternal as Hook,
  useDeleteUserAsPlatformOwner: async () =>
    (await import('./hooks/useUserDeletion'))
      .useDeleteUserAsPlatformOwner as Hook,
  useUserSuspension: async () =>
    (await import('./hooks/useUserDeletion')).useUserSuspension as Hook,
  useSubscriptionAdjustment: async () =>
    (await import('./hooks/useSubscriptionAdjustments'))
      .useSubscriptionAdjustment as Hook,
  useUpdatePlan: async () =>
    (await import('./hooks/usePlatformPlans')).useUpdatePlan as Hook,
  usePreviewLimitImpact: async () =>
    (await import('./hooks/usePlatformPlans')).usePreviewLimitImpact as Hook,
  useUpdateGlobalCommission: async () =>
    (await import('@features/platform-commerce/hooks/useCommission'))
      .useUpdateGlobalCommission as Hook,
  useUpdatePlanCommission: async () =>
    (await import('@features/platform-commerce/hooks/useCommission'))
      .useUpdatePlanCommission as Hook,
  useUpdateOrganizationCommission: async () =>
    (await import('@features/platform-commerce/hooks/useCommission'))
      .useUpdateOrganizationCommission as Hook,
  useUpdatePlatformCustomerRequest: async () =>
    (
      await import('@features/customer-requests/hooks/usePlatformCustomerRequests')
    ).useUpdatePlatformCustomerRequest as Hook,
  usePostTeamCustomerRequestMessage: async () =>
    (
      await import('@features/customer-requests/hooks/usePlatformCustomerRequests')
    ).usePostTeamCustomerRequestMessage as Hook,
  useUpdateCustomerRequestRouting: async () =>
    (
      await import('@features/customer-requests/hooks/usePlatformCustomerRequests')
    ).useUpdateCustomerRequestRouting as Hook,
  useUpdateTrialPolicy: async () =>
    (await import('@features/tenant/hooks/useUpdateTrialPolicy'))
      .useUpdateTrialPolicy as Hook,
  usePostSupportCaseReply: async () =>
    (await import('@features/support/hooks/usePostSupportCaseReply'))
      .usePostSupportCaseReply as Hook,
  useUpdateSupportCaseStatus: async () =>
    (await import('@features/support/hooks/useUpdateSupportCaseStatus'))
      .useUpdateSupportCaseStatus as Hook,
};

describe('B8 Platform Owner mutations render their own failures (one message)', () => {
  it.each(Object.keys(hooks))(
    '%s declares meta.inlineErrors and no toast of its own',
    async (name) => {
      const hook = await hooks[name]();
      captured.length = 0;
      hook('org-1');
      expect(captured.length).toBe(1);
      expect(captured[0]?.meta?.[INLINE_ERRORS_META]).toBe(true);
      expect(captured[0]?.showErrorToast).toBe(false);
    }
  );
});

describe('B8 reads the console renders itself', () => {
  const queries: Record<string, () => Promise<Hook>> = {
    useOrganizationPlatformFlags: async () =>
      (await import('./hooks/useOrganizationPlatformFlags'))
        .useOrganizationPlatformFlags as Hook,
    useUserDeletionPlan: async () =>
      (await import('./hooks/useUserDeletion')).useUserDeletionPlan as Hook,
  };

  it.each(Object.keys(queries))(
    '%s opts out of the app-wide error toast',
    async (name) => {
      const hook = await queries[name]();
      capturedQueries.length = 0;
      hook('org-1');
      expect(capturedQueries[0]?.meta?.[INLINE_ERRORS_META]).toBe(true);
    }
  );
});
