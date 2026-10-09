import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlatformOwnerMfaNotice } from './PlatformOwnerMfaNotice';

const auth = vi.hoisted(() => ({ roles: [] as string[] }));
const getStatus = vi.hoisted(() => vi.fn());

vi.mock('@hooks', async (orig) => ({
  ...((await orig()) as Record<string, unknown>),
  useAuth: () => ({ user: { id: 'u1', roles: auth.roles } }),
}));
vi.mock('@services/identity', () => ({
  twoFactorService: { getStatus },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderNotice() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PlatformOwnerMfaNotice />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('PlatformOwnerMfaNotice', () => {
  beforeEach(() => {
    getStatus.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it('asks a Platform Owner without an authenticator app to set one up', async () => {
    auth.roles = ['platform_owner'];
    getStatus.mockResolvedValue({
      enabled: false,
      pendingSetup: false,
      recoveryCodesRemaining: 0,
    });
    renderNotice();
    expect(await screen.findByTestId('platform-owner-mfa-notice')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      '/dashboard/profile'
    );
  });

  it('stays hidden once the authenticator app is set up', async () => {
    auth.roles = ['platform_owner'];
    getStatus.mockResolvedValue({
      enabled: true,
      pendingSetup: false,
      recoveryCodesRemaining: 8,
    });
    renderNotice();
    await waitFor(() => expect(getStatus).toHaveBeenCalled());
    expect(screen.queryByTestId('platform-owner-mfa-notice')).toBeNull();
  });

  it('never queries or shows anything for other accounts', () => {
    auth.roles = ['staff'];
    renderNotice();
    expect(getStatus).not.toHaveBeenCalled();
    expect(screen.queryByTestId('platform-owner-mfa-notice')).toBeNull();
  });
});
