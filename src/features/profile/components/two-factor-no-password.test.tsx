/**
 * B0-IAM-02 — a Google-only account has no password, so the server refuses
 * to confirm or disable TOTP with `errors.auth.setPasswordBeforeTwoFactor`.
 * The card shows that message (it tells the user to set a password through
 * "Forgot password?"), not "wrong code" or "wrong password".
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
import { ApiError } from '@api';
import { TwoFactorCard } from './TwoFactorCard';

const NO_PASSWORD = 'errors.auth.setPasswordBeforeTwoFactor';
const service = vi.hoisted(() => ({
  getStatus: vi.fn(),
  startSetup: vi.fn(),
  confirmSetup: vi.fn(),
  disable: vi.fn(),
  regenerateRecoveryCodes: vi.fn(),
}));
const toast = vi.hoisted(() => vi.fn());

vi.mock('@services/identity', () => ({ twoFactorService: service }));
vi.mock('@hooks', async (orig) => ({
  ...((await orig()) as Record<string, unknown>),
  useToast: () => ({ toast }),
}));
vi.mock('@app/providers', async (orig) => ({
  ...((await orig()) as Record<string, unknown>),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));
const i18n = vi.hoisted(() => ({
  t: (key: string) => key,
  i18n: { language: 'en' },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => i18n }));

const noPasswordError = () =>
  new ApiError({
    kind: 'validation',
    messageKey: NO_PASSWORD,
    status: 400,
    retryable: false,
  });

function renderCard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TwoFactorCard />
    </QueryClientProvider>
  );
}

describe('TwoFactorCard — account without a password', () => {
  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset());
    toast.mockReset();
  });
  afterEach(() => cleanup());

  it('says to set a password first when confirming setup', async () => {
    service.getStatus.mockResolvedValue({
      enabled: false,
      pendingSetup: false,
      recoveryCodesRemaining: 0,
    });
    service.startSetup.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      otpauthUrl: 'otpauth://totp/Atlas:x?secret=JBSWY3DPEHPK3PXP',
    });
    service.confirmSetup.mockRejectedValue(noPasswordError());
    renderCard();

    fireEvent.click(
      await screen.findByRole('button', { name: 'profile:actions.enable' })
    );
    fireEvent.change(
      await screen.findByLabelText('profile:twoFactor.enterCode'),
      {
        target: { value: '123456' },
      }
    );
    fireEvent.change(document.getElementById('totp-setup-password')!, {
      target: { value: 'anything' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'profile:twoFactor.verifyAndEnable' })
    );

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'errors:auth.setPasswordBeforeTwoFactor',
        })
      )
    );
    expect(toast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'profile:twoFactor.invalidCode' })
    );
  });

  it('says to set a password first when disabling', async () => {
    service.getStatus.mockResolvedValue({
      enabled: true,
      pendingSetup: false,
      recoveryCodesRemaining: 8,
    });
    service.disable.mockRejectedValue(noPasswordError());
    renderCard();

    fireEvent.click(
      await screen.findByRole('button', { name: 'profile:twoFactor.disable' })
    );
    fireEvent.change(document.getElementById('twofactor-password')!, {
      target: { value: 'anything' },
    });
    const buttons = screen.getAllByRole('button', {
      name: 'profile:twoFactor.disable',
    });
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'errors:auth.setPasswordBeforeTwoFactor',
        })
      )
    );
    expect(toast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'profile:twoFactor.passwordRejected' })
    );
  });
});
