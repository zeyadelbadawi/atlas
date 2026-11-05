/**
 * B1 (UX audit, V09/V15/V17/V20/V28) — exactly ONE message per failure.
 *
 * Every profile form renders its own failures (on a field, or one inline
 * message with the real reason). Its mutation must therefore raise no
 * toast of its own AND keep the app-wide reporter quiet — otherwise the
 * customer read a generic card plus a toast, or "Your session has expired"
 * over "Your current password is incorrect". The session lists render their
 * own error state the same way, after one round of the HTTP client's
 * retries instead of ~20 s of "Loading your content…".
 */
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { createQueryClient } from '@services/query';
import { ApiError } from '@api';

/** The table mixes hooks of different shapes; this is all the test reads. */
type MutationHook = () => {
  readonly mutateAsync: (variables: never) => Promise<unknown>;
  readonly isError: boolean;
};
type QueryHook = () => { readonly isError: boolean };

const toast = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
const api = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  updatePreferences: vi.fn(),
  updatePhone: vi.fn(),
  listSessions: vi.fn(),
  listTrustedDevices: vi.fn(),
}));

vi.mock('@app/providers', () => ({ useToast: () => toast }));
vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ refreshSession: vi.fn(async () => {}) }),
}));
vi.mock('@services/identity', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  currentUserService: {
    updateProfile: api.updateProfile,
    changePassword: api.changePassword,
    updatePreferences: api.updatePreferences,
    updatePhone: api.updatePhone,
  },
  authenticationService: {
    listSessions: api.listSessions,
    listTrustedDevices: api.listTrustedDevices,
  },
}));

const {
  useChangePassword,
  useSessions,
  useTrustedDevices,
  useUpdatePhone,
  useUpdatePreferences,
  useUpdateProfile,
} = await import('./index');

const SERVER_ERROR = () =>
  new ApiError({
    kind: 'server',
    messageKey: 'errors.internal',
    status: 500,
    retryable: true,
  });

function setup() {
  const report = vi.fn();
  const client = createQueryClient(report);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={createI18nInstance('en')}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </I18nextProvider>
  );
  return { report, wrapper };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('profile mutations: the form shows the failure, nothing else does', () => {
  it.each([
    ['useUpdateProfile', () => useUpdateProfile(), api.updateProfile],
    ['useChangePassword', () => useChangePassword(), api.changePassword],
    [
      'useUpdatePreferences',
      () => useUpdatePreferences(),
      api.updatePreferences,
    ],
    ['useUpdatePhone', () => useUpdatePhone(), api.updatePhone],
  ] as const)('%s raises no toast for a failure', async (_name, hook, call) => {
    call.mockRejectedValue(SERVER_ERROR());
    const { report, wrapper } = setup();
    const { result } = renderHook(hook as MutationHook, { wrapper });
    await act(async () => {
      await result.current.mutateAsync({} as never).catch(() => {});
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.notifyError).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });

  it('confirms a saved name (V28)', async () => {
    api.updateProfile.mockResolvedValue({ name: 'Sara Chen' });
    const { wrapper } = setup();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: 'Sara Chen' });
    });
    expect(toast.notifySuccess).toHaveBeenCalledTimes(1);
    expect(toast.notifySuccess.mock.calls[0][0]).toBe(
      'profile:success.profileUpdated'
    );
  });
});

describe('session lists: an error state, not a spinner or a toast (V17)', () => {
  it.each([
    ['useSessions', () => useSessions(), api.listSessions],
    ['useTrustedDevices', () => useTrustedDevices(), api.listTrustedDevices],
  ] as const)(
    '%s fails after one attempt and stays quiet',
    async (_name, hook, call) => {
      call.mockRejectedValue(SERVER_ERROR());
      const { report, wrapper } = setup();
      const { result } = renderHook(hook as QueryHook, { wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(call).toHaveBeenCalledTimes(1);
      expect(report).not.toHaveBeenCalled();
    }
  );
});
