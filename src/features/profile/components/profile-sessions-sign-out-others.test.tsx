/**
 * B0-IAM-06 — "Sign out all other devices" in one action.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileSessionsCard } from './ProfileSessionsCard';

const service = vi.hoisted(() => ({
  listSessions: vi.fn(),
  revokeSession: vi.fn(),
  revokeOtherSessions: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock('@services/identity', () => ({ authenticationService: service }));
vi.mock('@app/providers', async (orig) => ({
  ...((await orig()) as Record<string, unknown>),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));
vi.mock('@/shared/hooks', async (orig) => ({
  ...((await orig()) as Record<string, unknown>),
  // `@hooks` and `@/shared/hooks` are the same module.
  useToast: () => ({ toast }),
  useSignOut: () => ({ signOut: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const current = {
  id: 's1',
  isCurrent: true,
  startedAt: '2026-10-01T10:00:00.000Z',
  deviceLabel: 'This laptop',
};
const other = {
  id: 's2',
  isCurrent: false,
  startedAt: '2026-10-02T10:00:00.000Z',
  deviceLabel: 'Old phone',
};

function renderCard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProfileSessionsCard />
    </QueryClientProvider>
  );
}

describe('ProfileSessionsCard — sign out all other devices', () => {
  beforeEach(() => {
    service.listSessions.mockReset();
    service.revokeOtherSessions.mockReset();
    toast.mockReset();
  });
  afterEach(() => cleanup());

  it('signs out every other session after confirmation', async () => {
    service.listSessions.mockResolvedValue([current, other]);
    service.revokeOtherSessions.mockResolvedValue({ sessionsRevoked: 1 });
    renderCard();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'profile:sections.security.signOutOthers',
      })
    );
    expect(
      await screen.findByText('profile:sections.security.signOutOthersTitle')
    ).toBeTruthy();
    expect(service.revokeOtherSessions).not.toHaveBeenCalled();

    const buttons = screen.getAllByRole('button', {
      name: 'profile:sections.security.signOutOthers',
    });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() =>
      expect(service.revokeOtherSessions).toHaveBeenCalledTimes(1)
    );
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'profile:sections.security.signedOutOthers',
        })
      )
    );
    expect(service.revokeSession).not.toHaveBeenCalled();
  });

  it('reports a failure instead of claiming success', async () => {
    service.listSessions.mockResolvedValue([current, other]);
    service.revokeOtherSessions.mockRejectedValue(new Error('boom'));
    renderCard();

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'profile:sections.security.signOutOthers',
      })
    );
    await screen.findByText('profile:sections.security.signOutOthersTitle');
    const buttons = screen.getAllByRole('button', {
      name: 'profile:sections.security.signOutOthers',
    });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'profile:sections.security.signOutOthersFailed',
        })
      )
    );
  });

  it('hides the action when this is the only session', async () => {
    service.listSessions.mockResolvedValue([current]);
    renderCard();
    expect(await screen.findByText('This laptop')).toBeTruthy();
    expect(
      screen.queryByRole('button', {
        name: 'profile:sections.security.signOutOthers',
      })
    ).toBeNull();
  });
});
