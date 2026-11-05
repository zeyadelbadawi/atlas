/**
 * B0 (UX audit) — a failed action used to raise TWO toasts: the hook's
 * generic "That action could not be completed" and the app-wide reporter's
 * real reason. Now exactly one toast shows, and it carries the reason.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createApiError, createQueryClient } from '@services';

const notifyError = vi.fn();
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError }),
}));

const { useApiMutation } = await import('./useApiMutation');

function setup(showErrorToast?: boolean) {
  notifyError.mockClear();
  const reported = vi.fn();
  const client = createQueryClient(reported);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={createI18nInstance('en')}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </I18nextProvider>
  );
  const { result } = renderHook(
    () =>
      useApiMutation({
        retry: false,
        showErrorToast,
        mutationFn: async () => {
          throw createApiError('conflict', { messageKey: 'errors.domain.hostnameTaken' });
        },
      }),
    { wrapper }
  );
  return { result, reported };
}

describe('useApiMutation — one toast per failure', () => {
  it('shows the specific reason once and keeps the app-wide reporter quiet', async () => {
    const { result, reported } = setup();
    act(() => result.current.mutate(undefined));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(notifyError).toHaveBeenCalledWith(
      'errors:conflict.title',
      'errors:domain.hostnameTaken',
      undefined
    );
    expect(reported).not.toHaveBeenCalled();
  });

  it('leaves the failure to the app-wide reporter when the hook toast is off', async () => {
    const { result, reported } = setup(false);
    act(() => result.current.mutate(undefined));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(notifyError).not.toHaveBeenCalled();
    expect(reported).toHaveBeenCalledTimes(1);
  });
});
