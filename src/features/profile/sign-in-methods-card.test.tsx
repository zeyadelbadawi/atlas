/**
 * Google Identity — Account settings → Sign-in methods.
 *
 * Lists how the account signs in; never offers to remove the only way in;
 * stays out of the way where Google is neither offered nor connected.
 */
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { authenticationService } from '@services/identity';
import { SignInMethodsCard } from './components/SignInMethodsCard';

vi.mock('@app/providers', () => ({
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderWith(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={createI18nInstance('en')}>
        <MemoryRouter>{ui}</MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe('Account settings → Sign-in methods', () => {
  it('lists the connected Google account and offers to disconnect it', async () => {
    vi.spyOn(authenticationService, 'authOptions').mockResolvedValue({
      google: true,
    });
    vi.spyOn(authenticationService, 'signInMethods').mockResolvedValue({
      password: true,
      google: { email: 'sara@gmail.com', linkedAt: '2026-09-01T00:00:00Z' },
    });
    renderWith(<SignInMethodsCard />);
    const row = await screen.findByTestId('google-method-row');
    await waitFor(() => expect(row.textContent).toContain('sara@gmail.com'));
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeTruthy();
  });

  it('never offers to remove the only way in', async () => {
    vi.spyOn(authenticationService, 'authOptions').mockResolvedValue({
      google: true,
    });
    vi.spyOn(authenticationService, 'signInMethods').mockResolvedValue({
      password: false,
      google: { email: 'sara@gmail.com', linkedAt: '2026-09-01T00:00:00Z' },
    });
    renderWith(<SignInMethodsCard />);
    expect(await screen.findByText(/set a password first/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Disconnect' })).toBeNull();
  });

  it('is absent while Google is off here and not connected', async () => {
    vi.spyOn(authenticationService, 'authOptions').mockResolvedValue({
      google: false,
    });
    const methods = vi
      .spyOn(authenticationService, 'signInMethods')
      .mockResolvedValue({ password: true, google: null });
    renderWith(<SignInMethodsCard />);
    await waitFor(() => expect(methods).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByTestId('sign-in-methods-card')).toBeNull()
    );
  });
});
