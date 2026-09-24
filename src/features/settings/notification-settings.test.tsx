/**
 * Platform notification defaults, presented through the shared matrix.
 *
 * The data layer is the legacy `{email, push, sms}` triple and must stay
 * so; what is asserted is the mapping — the engagement switch is the one
 * real control, it reads `email`, and flipping it writes `email` back
 * with the other two fields carried unchanged.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';

const useNotificationPreferences = vi.fn();
const mutate = vi.fn();

vi.mock('@features/notifications', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useNotificationPreferences: () => useNotificationPreferences() as unknown,
    useUpdateNotificationPreferences: () => ({
      mutate,
      isPending: false,
      error: null,
      reset: vi.fn(),
    }),
  };
});

import { NotificationSettings } from './components/NotificationSettings';

function renderSettings() {
  const i18n = createI18nInstance('en');
  return render(
    <I18nextProvider i18n={i18n}>
      <NotificationSettings />
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NotificationSettings', () => {
  it('presents the defaults through the matrix with the locked rows', () => {
    useNotificationPreferences.mockReturnValue({
      data: { email: true, push: false, sms: false },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderSettings();

    expect(screen.getByText('Platform email defaults')).toBeTruthy();
    expect(screen.getAllByText('Always on')).toHaveLength(3);
    expect(screen.getAllByRole('switch')).toHaveLength(1);
    expect(screen.queryByText('Operations')).toBeNull();
  });

  it('writes the engagement switch back to the legacy email default', () => {
    useNotificationPreferences.mockReturnValue({
      data: { email: true, push: true, sms: false },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderSettings();
    fireEvent.click(
      screen.getByRole('switch', { name: 'Email for Updates and announcements' })
    );

    expect(mutate).toHaveBeenCalledWith({ email: false, push: true, sms: false });
  });

  it('shows loading and error states', () => {
    useNotificationPreferences.mockReturnValue({ isLoading: true });
    const { unmount } = renderSettings();
    expect(screen.getByRole('status', { name: 'Loading email preferences' })).toBeTruthy();
    unmount();

    const refetch = vi.fn();
    useNotificationPreferences.mockReturnValue({
      isLoading: false,
      error: new Error('x'),
      refetch,
    });
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
