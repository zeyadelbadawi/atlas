/**
 * The management-host verify-email page: the token is read from the URL,
 * removed from it, submitted once under a `no-referrer` policy, and every
 * outcome the backend can report has its own state — with a way forward
 * (resend when signed in, sign-in-and-return when not, retry when the
 * token was never spent). When the outcome (or "sent") replaces what was
 * on screen, focus moves to it instead of falling back to the body.
 *
 * ATO F1 follow-up: a live link opened without its account's session is
 * refused with `signInRequired` and not spent — the page asks the reader
 * to sign in, keeps the token in `sessionStorage` for the round trip, and
 * submits it again once they are signed in.
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
const auth = {
  isAuthenticated: false,
  isRestoring: false,
  refreshSession: vi.fn(async () => {}),
  signOut: vi.fn(async () => {}),
};

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
  auth.isRestoring = false;
  auth.refreshSession = vi.fn(async () => {});
  auth.signOut = vi.fn(async () => {});
  window.sessionStorage.clear();
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

const PENDING_KEY = 'atlas:pending-email-verification';
const storedPending = () => {
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  return raw ? (JSON.parse(raw) as { token: string; expiresAt: number }) : null;
};
const keepPending = (token: string, expiresAt = Date.now() + 60_000) =>
  window.sessionStorage.setItem(
    PENDING_KEY,
    JSON.stringify({ token, expiresAt })
  );
const signInRequired = () =>
  createApiError('forbidden', {
    messageKey: 'errors.auth.verificationSignInRequired',
  });

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

describe('VerifyEmailPage — sign-in required (ATO F1 follow-up)', () => {
  it('signed out: asks to sign in and come back, and keeps the token (not in the URL)', () => {
    fail(signInRequired());
    renderAt('/auth/verify-email?token=abc');
    const prompt = screen.getByTestId('verify-email-sign-in-required');
    expect(prompt.dataset.account).toBe('none');
    expect(
      screen.getByText('auth:verifyEmail.signInRequiredTitle')
    ).toBeTruthy();
    expect(
      screen.getByText('auth:verifyEmail.goToSignIn').getAttribute('href')
    ).toBe('/auth/sign-in?redirect=%2Fauth%2Fverify-email');
    expect(currentSearch).toBe('');
    const kept = storedPending();
    expect(kept?.token).toBe('abc');
    // Kept for 30 minutes.
    expect(kept!.expiresAt - Date.now()).toBeGreaterThan(29 * 60 * 1000);
    expect(kept!.expiresAt - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);
  });

  it('back from signing in: the kept token is submitted, and cleared once verified', () => {
    keepPending('abc');
    auth.isAuthenticated = true;
    verify.mutate = vi.fn((_vars, options?: { onSuccess?: () => void }) => {
      verify.isSuccess = true;
      options?.onSuccess?.();
    });
    const view = renderAt('/auth/verify-email');
    expect(verify.mutate).toHaveBeenCalledTimes(1);
    expect(verify.mutate.mock.calls[0][0]).toEqual({ token: 'abc' });
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
    view.rerender(tree('/auth/verify-email'));
    expect(screen.getByTestId('verify-email-success')).toBeTruthy();
    expect(storedPending()).toBeNull();
    // Never put back in the address bar.
    expect(currentSearch).toBe('');
  });

  it('waits for the session restore, so a signed-in reader is submitted as themselves', () => {
    auth.isRestoring = true;
    const view = renderAt('/auth/verify-email?token=abc');
    expect(verify.mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('verify-email-pending')).toBeTruthy();
    auth.isRestoring = false;
    auth.isAuthenticated = true;
    view.rerender(tree('/auth/verify-email'));
    expect(verify.mutate).toHaveBeenCalledTimes(1);
    expect(verify.mutate.mock.calls[0][0]).toEqual({ token: 'abc' });
  });

  it('re-submits once when the reader becomes signed in (e.g. the session restore finished)', () => {
    fail(signInRequired());
    const view = renderAt('/auth/verify-email?token=abc');
    expect(verify.mutate).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('verify-email-sign-in-required')).toBeTruthy();

    auth.isAuthenticated = true;
    view.rerender(tree('/auth/verify-email'));
    expect(verify.reset).toHaveBeenCalledTimes(1);
    expect(verify.mutate).toHaveBeenCalledTimes(2);
    expect(verify.mutate.mock.calls[1][0]).toEqual({ token: 'abc' });

    // Refused again while signed in: the link is another account's. No loop.
    view.rerender(tree('/auth/verify-email'));
    expect(verify.mutate).toHaveBeenCalledTimes(2);
    const prompt = screen.getByTestId('verify-email-sign-in-required');
    expect(prompt.dataset.account).toBe('other');
    expect(screen.getByText('auth:verifyEmail.otherAccountTitle')).toBeTruthy();
    expect(document.activeElement?.textContent).toBe(
      'auth:verifyEmail.otherAccountTitle'
    );
  });

  it('signed in as a different account: says so and offers to sign out', () => {
    auth.isAuthenticated = true;
    fail(signInRequired());
    renderAt('/auth/verify-email?token=abc');
    expect(verify.mutate).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('auth:verifyEmail.otherAccountDescription')
    ).toBeTruthy();
    expect(screen.queryByText('auth:verifyEmail.goToSignIn')).toBeNull();
    fireEvent.click(screen.getByText('auth:verifyEmail.signOutToSwitch'));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    // The token is still kept for whoever signs in next.
    expect(storedPending()?.token).toBe('abc');
  });

  it('an expired kept token is ignored and dropped', () => {
    keepPending('abc', Date.now() - 1);
    auth.isAuthenticated = true;
    renderAt('/auth/verify-email');
    expect(verify.mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('verify-email-request')).toBeTruthy();
    expect(storedPending()).toBeNull();
  });

  it('a link in the URL wins over a kept token', () => {
    keepPending('old');
    renderAt('/auth/verify-email?token=new');
    expect(verify.mutate).toHaveBeenCalledTimes(1);
    expect(verify.mutate.mock.calls[0][0]).toEqual({ token: 'new' });
  });

  it('a kept token the backend refuses for good (used) is cleared', () => {
    keepPending('abc');
    fail(
      createApiError('validation', {
        messageKey: 'errors.auth.verificationTokenUsed',
      })
    );
    renderAt('/auth/verify-email');
    expect(errorState()).toBe('used');
    expect(storedPending()).toBeNull();
  });

  it('keeps working when sessionStorage is unavailable', () => {
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    try {
      fail(signInRequired());
      renderAt('/auth/verify-email?token=abc');
      expect(screen.getByTestId('verify-email-sign-in-required')).toBeTruthy();
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});
