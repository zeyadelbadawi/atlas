/**
 * The management-host verify-email page: the token is read from the URL,
 * removed from it, submitted once under a `no-referrer` policy, and every
 * outcome the backend can report has its own state — with a way forward
 * (resend when signed in, sign-in-and-return when not, retry when the
 * token was never spent). When the outcome (or "sent") replaces what was
 * on screen, focus moves to it instead of falling back to the body.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { createApiError } from '@api';
import type { ApiError } from '@api';
import VerifyEmailPage from './pages/VerifyEmailPage';

interface MutationState {
  isSuccess: boolean;
  isError: boolean;
  isPending: boolean;
  error: ApiError | null;
  mutate: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
}

const verify: MutationState = {
  isSuccess: false,
  isError: false,
  isPending: false,
  error: null,
  mutate: vi.fn(),
  reset: vi.fn(),
};
const resend: MutationState = {
  isSuccess: false,
  isError: false,
  isPending: false,
  error: null,
  mutate: vi.fn(),
  reset: vi.fn(),
};
const auth = { isAuthenticated: false, refreshSession: vi.fn(async () => {}) };

vi.mock('./hooks/useVerifyEmail', () => ({ useVerifyEmail: () => verify }));
vi.mock('./hooks/useResendEmailVerification', () => ({
  useResendEmailVerification: () => resend,
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => auth,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function reset(state: MutationState): void {
  state.isSuccess = false;
  state.isError = false;
  state.isPending = false;
  state.error = null;
  state.mutate = vi.fn();
  state.reset = vi.fn();
}

function fail(error: ApiError): void {
  verify.isError = true;
  verify.error = error;
}

beforeEach(() => {
  reset(verify);
  reset(resend);
  auth.isAuthenticated = false;
  auth.refreshSession = vi.fn(async () => {});
});
afterEach(() => cleanup());

let currentSearch = '';
function LocationProbe(): null {
  currentSearch = useLocation().search;
  return null;
}

function tree(url: string) {
  return (
    <MemoryRouter initialEntries={[url]}>
      <VerifyEmailPage />
      <LocationProbe />
    </MemoryRouter>
  );
}

function renderAt(url: string) {
  return render(tree(url));
}

const referrerMeta = () =>
  document.head.querySelector<HTMLMetaElement>('meta[name="referrer"]');
const errorState = () => screen.getByTestId('verify-email-error').dataset.state;

describe('VerifyEmailPage (management host)', () => {
  it('submits the token once, then removes it from the address bar', () => {
    renderAt('/auth/verify-email?token=abc&utm=x');
    expect(verify.mutate).toHaveBeenCalledTimes(1);
    expect(verify.mutate.mock.calls[0][0]).toEqual({ token: 'abc' });
    expect(screen.getByTestId('verify-email-pending')).toBeTruthy();
    // The token is gone from the URL; anything else is left alone.
    expect(currentSearch).toBe('?utm=x');
  });

  it('sets a no-referrer policy while mounted and restores the default after', () => {
    const view = renderAt('/auth/verify-email?token=abc');
    expect(referrerMeta()?.content).toBe('no-referrer');
    view.unmount();
    expect(referrerMeta()).toBeNull();
  });

  it('refreshes the session after a successful verification', () => {
    verify.mutate = vi.fn((_vars, options?: { onSuccess?: () => void }) => {
      options?.onSuccess?.();
    });
    renderAt('/auth/verify-email?token=abc');
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('shows the verified state on success', () => {
    verify.isSuccess = true;
    renderAt('/auth/verify-email?token=abc');
    expect(screen.getByTestId('verify-email-success')).toBeTruthy();
    expect(
      screen.getByText('auth:verifyEmail.successDescription')
    ).toBeTruthy();
  });

  it('a missing token, signed out: an invalid-link state that offers sign-in and comes back here', () => {
    renderAt('/auth/verify-email');
    expect(verify.mutate).not.toHaveBeenCalled();
    expect(errorState()).toBe('missing');
    expect(
      screen.getByText('auth:verifyEmail.goToSignIn').getAttribute('href')
    ).toBe('/auth/sign-in?redirect=%2Fauth%2Fverify-email');
  });

  it('a missing token, signed in: the place to request a new link', () => {
    auth.isAuthenticated = true;
    renderAt('/auth/verify-email');
    expect(screen.getByTestId('verify-email-request')).toBeTruthy();
    fireEvent.click(screen.getByText('auth:verifyEmail.resend.action'));
    expect(resend.mutate).toHaveBeenCalledTimes(1);
  });

  it('an invalid link (unknown or malformed) is its own state', () => {
    fail(
      createApiError('validation', {
        messageKey: 'errors.auth.invalidVerificationToken',
      })
    );
    renderAt('/auth/verify-email?token=abc');
    expect(errorState()).toBe('invalid');
    expect(screen.getByText('auth:verifyEmail.invalidTitle')).toBeTruthy();
    // Signed out: told how to get a new link, not shown a button that would 401.
    expect(screen.queryByTestId('verify-email-resend')).toBeNull();
    expect(
      screen.getByText('auth:verifyEmail.signInToResend', { exact: false })
    ).toBeTruthy();
  });

  it('an expired link offers a resend to a signed-in reader', () => {
    auth.isAuthenticated = true;
    fail(
      createApiError('validation', {
        messageKey: 'errors.auth.verificationTokenExpired',
      })
    );
    renderAt('/auth/verify-email?token=abc');
    expect(errorState()).toBe('expired');
    expect(screen.getByText('auth:verifyEmail.expiredTitle')).toBeTruthy();
    fireEvent.click(screen.getByText('auth:verifyEmail.resend.action'));
    expect(resend.mutate).toHaveBeenCalledTimes(1);
  });

  it('an already-used link says so and offers no resend', () => {
    auth.isAuthenticated = true;
    fail(
      createApiError('validation', {
        messageKey: 'errors.auth.verificationTokenUsed',
      })
    );
    renderAt('/auth/verify-email?token=abc');
    expect(errorState()).toBe('used');
    expect(screen.getByText('auth:verifyEmail.usedDescription')).toBeTruthy();
    expect(screen.queryByTestId('verify-email-resend')).toBeNull();
    expect(screen.getByText('auth:verifyEmail.continue')).toBeTruthy();
  });

  it('rate limited: its own state, and a retry re-submits the same token', () => {
    fail(createApiError('rateLimited'));
    renderAt('/auth/verify-email?token=abc');
    expect(errorState()).toBe('rateLimited');
    act(() => {
      fireEvent.click(screen.getByText('common:actions.retry'));
    });
    expect(verify.reset).toHaveBeenCalledTimes(1);
    expect(verify.mutate).toHaveBeenCalledTimes(2);
    expect(verify.mutate.mock.calls[1][0]).toEqual({ token: 'abc' });
  });

  it('a network failure is its own state and can be retried', () => {
    fail(createApiError('network'));
    renderAt('/auth/verify-email?token=abc');
    expect(errorState()).toBe('network');
    expect(screen.getByText('auth:verifyEmail.networkTitle')).toBeTruthy();
    expect(screen.getByText('common:actions.retry')).toBeTruthy();
  });

  it('an invalid link cannot be "retried" — the answer would not change', () => {
    fail(
      createApiError('validation', {
        messageKey: 'errors.auth.invalidVerificationToken',
      })
    );
    renderAt('/auth/verify-email?token=abc');
    expect(screen.queryByText('common:actions.retry')).toBeNull();
  });

  it('moves focus to the outcome when it replaces "verifying…" or the Retry button', () => {
    const view = renderAt('/auth/verify-email?token=abc');
    expect(screen.getByTestId('verify-email-pending')).toBeTruthy();

    fail(createApiError('network'));
    view.rerender(tree('/auth/verify-email?token=abc'));
    expect(document.activeElement).toBe(
      screen.getByTestId('verify-email-error')
    );

    // Retry: the button disappears while pending, then the outcome takes focus.
    act(() => {
      fireEvent.click(screen.getByText('common:actions.retry'));
    });
    reset(verify);
    view.rerender(tree('/auth/verify-email?token=abc'));
    verify.isSuccess = true;
    view.rerender(tree('/auth/verify-email?token=abc'));
    expect(document.activeElement?.textContent).toBe(
      'auth:verifyEmail.successTitle'
    );
  });

  it('moves focus to "sent" when it replaces the resend button', () => {
    auth.isAuthenticated = true;
    const view = renderAt('/auth/verify-email');
    fireEvent.click(screen.getByText('auth:verifyEmail.resend.action'));
    resend.isSuccess = true;
    view.rerender(tree('/auth/verify-email'));
    expect(document.activeElement).toBe(
      screen.getByTestId('verify-email-resend-sent')
    );
  });

  it('resend outcomes: sent, and rate limited', () => {
    auth.isAuthenticated = true;
    resend.isSuccess = true;
    const view = renderAt('/auth/verify-email');
    expect(screen.getByTestId('verify-email-resend-sent').textContent).toBe(
      'auth:verifyEmail.resend.sent'
    );
    view.unmount();

    reset(resend);
    resend.isError = true;
    resend.error = createApiError('rateLimited');
    renderAt('/auth/verify-email');
    expect(screen.getByRole('alert').textContent).toBe(
      'auth:verifyEmail.resend.rateLimited'
    );
  });
});
