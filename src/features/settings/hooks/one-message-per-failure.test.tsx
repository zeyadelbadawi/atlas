/**
 * B1 (UX audit, V20) — exactly ONE message per failed settings save.
 *
 * The General and Communications tabs render their own failures (on a
 * field, or one inline message). Their mutations must raise no toast and
 * keep the app-wide reporter quiet; before, a 500 showed the inline card
 * AND a toast (Communications: two toasts and a card). A General save is
 * confirmed (V11).
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

const toast = vi.hoisted(() => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));
const service = vi.hoisted(() => ({
  updateConfiguration: vi.fn(),
  updateCommunications: vi.fn(),
}));

vi.mock('@app/providers', () => ({ useToast: () => toast }));
vi.mock('../services/PlatformSettingsService', () => ({
  platformSettingsService: service,
}));

const { useUpdatePlatformSettings, useUpdatePlatformCommunicationSettings } =
  await import('./index');

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

afterEach(() => vi.clearAllMocks());

describe('settings mutations', () => {
  it.each([
    [
      'useUpdatePlatformSettings',
      () => useUpdatePlatformSettings(),
      service.updateConfiguration,
    ],
    [
      'useUpdatePlatformCommunicationSettings',
      () => useUpdatePlatformCommunicationSettings(),
      service.updateCommunications,
    ],
  ] as const)('%s raises no toast for a failure', async (_name, hook, call) => {
    call.mockRejectedValue(
      new ApiError({
        kind: 'server',
        messageKey: 'errors.internal',
        status: 500,
        retryable: true,
      })
    );
    const { report, wrapper } = setup();
    const { result } = renderHook(hook as MutationHook, { wrapper });
    await act(async () => {
      await result.current.mutateAsync({} as never).catch(() => {});
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.notifyError).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });

  it('confirms a saved General tab', async () => {
    service.updateConfiguration.mockResolvedValue({ platformName: 'Atlas' });
    const { wrapper } = setup();
    const { result } = renderHook(() => useUpdatePlatformSettings(), {
      wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync({ platformName: 'Atlas' });
    });
    expect(toast.notifySuccess).toHaveBeenCalledTimes(1);
    expect(toast.notifySuccess.mock.calls[0][0]).toBe(
      'settings:messages.saveSuccess'
    );
  });
});
