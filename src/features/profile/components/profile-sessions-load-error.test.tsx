/**
 * B1 (UX audit, V17) — when the active-sessions list cannot be read, the
 * card says so and offers a retry, instead of "Loading your content…"
 * for as long as anyone waits. One message: no toast repeats it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { createQueryClient } from '@services/query';
import { ApiError } from '@api';
import { ProfileSessionsCard } from './ProfileSessionsCard';

const service = vi.hoisted(() => ({
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeOtherSessions: vi.fn(),
}));

vi.mock('@services/identity', () => ({ authenticationService: service }));
vi.mock('@app/providers', async (orig) => ({
  ...((await orig()) as Record<string, unknown>),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));
vi.mock('@/shared/hooks', async (orig) => ({
  ...((await orig()) as Record<string, unknown>),
  useSignOut: () => ({ signOut: vi.fn() }),
}));

function renderCard(language: 'en' | 'ar' = 'en') {
  const report = vi.fn();
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <QueryClientProvider client={createQueryClient(report)}>
        <ProfileSessionsCard />
      </QueryClientProvider>
    </I18nextProvider>
  );
  return { report };
}

afterEach(() => {
  cleanup();
  service.listSessions.mockReset();
});

describe('ProfileSessionsCard — the list cannot be loaded', () => {
  it('shows an error state with a retry, and no toast', async () => {
    service.listSessions.mockRejectedValue(
      new ApiError({
        kind: 'server',
        messageKey: 'errors.internal',
        status: 500,
        retryable: true,
      })
    );
    const { report } = renderCard();
    expect(
      await screen.findByText("We couldn't load your active sessions")
    ).toBeTruthy();
    expect(screen.getByText(/Something failed on our side/)).toBeTruthy();
    expect(screen.queryByText(/Loading your content/)).toBeNull();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(report).not.toHaveBeenCalled();
    expect(service.listSessions).toHaveBeenCalledTimes(1);

    // Retry reads the list again.
    service.listSessions.mockResolvedValue([
      {
        id: 's1',
        isCurrent: true,
        startedAt: '2026-10-01T10:00:00.000Z',
        deviceLabel: 'This laptop',
      },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('This laptop')).toBeTruthy());
  });

  it('says it in Arabic', async () => {
    service.listSessions.mockRejectedValue(
      new ApiError({
        kind: 'network',
        messageKey: 'errors.network',
        retryable: true,
      })
    );
    renderCard('ar');
    expect(await screen.findByText('تعذّر تحميل جلساتك النشطة')).toBeTruthy();
  });
});
