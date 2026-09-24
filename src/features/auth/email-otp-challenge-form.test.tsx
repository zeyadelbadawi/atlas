/**
 * The emailed sign-in code step (P66).
 *
 * What these pin, in the order a user meets them:
 *
 *  1. Six digits and the "remember this device" choice are what get
 *     submitted — nothing less, and the checkbox defaults ON, because the
 *     common case is a person on their own laptop.
 *  2. A wrong code says how many tries are left. The backend is specific
 *     here on purpose (see the component's doc comment), and a form that
 *     swallowed `details.attemptsRemaining` would turn a fair warning
 *     into a surprise lock-out.
 *  3. Resend honours the server's cooldown — disabled with a countdown
 *     until `resendAvailableAt`, enabled after — so a user cannot hammer
 *     the endpoint by accident and does not have to guess when to retry.
 *  4. An expired code closes the field and hands the primary action to
 *     resend; a destroyed challenge (attempts exceeded) offers only the
 *     way back to sign-in, because there is nothing else that can work.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ApiError } from '@api';
import type { EmailOtpChallenge } from '@types';
import { EmailOtpChallengeForm } from './components/EmailOtpChallengeForm';

/*
 * input-otp keeps a small interval that resolves the element under the
 * caret with `document.elementFromPoint`, which jsdom (no layout) does
 * not implement. Nothing here depends on that lookup; the stub lets the
 * real component tick under fake timers instead of crashing on the
 * first advance.
 */
if (typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => null;
}

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const i18n = createI18nInstance('en');
const NOW = new Date('2026-09-24T10:00:00.000Z');

function challengeAt(
  overrides: Partial<EmailOtpChallenge> = {}
): EmailOtpChallenge {
  return {
    emailOtpRequired: true,
    challengeId: 'otp-1',
    expiresAt: new Date(NOW.getTime() + 5 * 60_000).toISOString(),
    resendAvailableAt: new Date(NOW.getTime() + 30_000).toISOString(),
    resendsRemaining: 2,
    maskedEmail: 's•••@example.com',
    ...overrides,
  };
}

function otpError(
  messageKey: string,
  status: number,
  details?: Record<string, number>
): ApiError {
  return new ApiError({
    kind: status === 429 ? 'rateLimited' : 'unauthorized',
    messageKey,
    status,
    details,
    retryable: false,
  });
}

const onSubmit = vi.fn();
const onResend = vi.fn();
const onCancel = vi.fn();

function renderForm({
  challenge = challengeAt(),
  error = null,
  isLoading = false,
}: {
  challenge?: EmailOtpChallenge;
  error?: ApiError | null;
  isLoading?: boolean;
} = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <EmailOtpChallengeForm
          challenge={challenge}
          onSubmit={onSubmit}
          onResend={onResend}
          onCancel={onCancel}
          isLoading={isLoading}
          error={error}
          forgotPasswordHref="/auth/forgot-password"
        />
      </MemoryRouter>
    </I18nextProvider>
  );
}

function codeInput(): HTMLInputElement {
  return screen.getByLabelText(/verification code/i) as HTMLInputElement;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  // The server answers relative to WHEN it was asked, so the cooldown is
  // computed from the (fake) clock at call time, not from `NOW`.
  onResend.mockImplementation(() =>
    Promise.resolve({
      resendAvailableAt: new Date(Date.now() + 90_000).toISOString(),
      resendsRemaining: 1,
    })
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('EmailOtpChallengeForm — submitting', () => {
  it('names the masked address and submits six digits with rememberDevice on by default', () => {
    renderForm();

    expect(screen.getByText('s•••@example.com')).toBeTruthy();
    expect(
      screen
        .getByRole('checkbox', { name: /remember this device/i })
        .getAttribute('aria-checked')
    ).toBe('true');

    const verify = screen.getByRole('button', { name: /^verify$/i });
    expect(verify.hasAttribute('disabled')).toBe(true);

    fireEvent.change(codeInput(), { target: { value: '123456' } });
    expect(verify.hasAttribute('disabled')).toBe(false);

    fireEvent.click(verify);
    expect(onSubmit).toHaveBeenCalledWith({
      code: '123456',
      rememberDevice: true,
    });
  });

  it('sends rememberDevice=false when the box is unticked', () => {
    renderForm();
    fireEvent.click(screen.getByRole('checkbox', { name: /remember/i }));
    fireEvent.change(codeInput(), { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      code: '654321',
      rememberDevice: false,
    });
  });

  it('keeps the digits left-to-right regardless of page direction', () => {
    const { container } = renderForm();
    // The slot group (six slot boxes) is the LTR island, whatever the page direction.
    const group = container.querySelector('[dir="ltr"] > div');
    expect(group).toBeTruthy();
    expect(group?.parentElement?.childElementCount).toBe(6);
  });

  it('shows how many attempts are left after a wrong code', () => {
    renderForm({
      error: otpError('errors.auth.otpInvalid', 401, { attemptsRemaining: 2 }),
    });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/didn't work/i);
    expect(alert.textContent).toMatch(/2 attempts left/i);
    expect(codeInput().getAttribute('aria-invalid')).toBe('true');
  });
});

describe('EmailOtpChallengeForm — resend', () => {
  it('is disabled with a countdown until resendAvailableAt, then enabled', async () => {
    renderForm();

    const resend = screen.getByRole('button', { name: /send a new code/i });
    expect(resend.hasAttribute('disabled')).toBe(true);
    expect(resend.textContent).toMatch(/0:30/);
    expect(screen.getByText(/2 resends left/i)).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(31_000);
    });

    expect(resend.hasAttribute('disabled')).toBe(false);
    expect(resend.textContent).toMatch(/^send a new code$/i);

    fireEvent.click(resend);
    await act(async () => {
      await Promise.resolve();
    });

    expect(onResend).toHaveBeenCalledTimes(1);
    // The server's new cooldown and remaining count are what the form
    // shows next — not a number it made up.
    expect(screen.getByText(/a new code was sent/i)).toBeTruthy();
    expect(resend.hasAttribute('disabled')).toBe(true);
    expect(resend.textContent).toMatch(/1:30/);
  });

  it('stays disabled when the server reports no resends left', () => {
    renderForm({ challenge: challengeAt({ resendsRemaining: 0 }) });
    act(() => {
      vi.advanceTimersByTime(31_000);
    });
    expect(
      screen
        .getByRole('button', { name: /send a new code/i })
        .hasAttribute('disabled')
    ).toBe(true);
    expect(screen.getByText(/no resends left/i)).toBeTruthy();
  });
});

describe('EmailOtpChallengeForm — expired and destroyed challenges', () => {
  it('closes the field when the backend says the code expired and makes resend the way on', () => {
    renderForm({
      challenge: challengeAt({ resendAvailableAt: NOW.toISOString() }),
      error: otpError('errors.auth.otpExpired', 410),
    });

    expect(screen.getByRole('alert').textContent).toMatch(/expired/i);
    expect(codeInput().hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByRole('button', { name: /^verify$/i }).hasAttribute('disabled')
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: /send a new code/i })
        .hasAttribute('disabled')
    ).toBe(false);
  });

  it('expires on its own once the countdown reaches zero', async () => {
    renderForm({
      challenge: challengeAt({
        expiresAt: new Date(NOW.getTime() + 2_000).toISOString(),
      }),
    });
    expect(screen.queryByRole('alert')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.getByRole('alert').textContent).toMatch(/expired/i);
    expect(codeInput().hasAttribute('disabled')).toBe(true);
  });

  it('offers only the way back to sign-in once attempts are exhausted', () => {
    renderForm({
      error: otpError('errors.auth.otpAttemptsExceeded', 429),
    });

    expect(screen.getByRole('alert').textContent).toMatch(/too many wrong codes/i);
    expect(screen.queryByLabelText(/verification code/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('offers a password reset when the address cannot receive email', () => {
    renderForm({
      error: otpError('errors.auth.otpSuppressedAddress', 422),
    });

    expect(screen.getByRole('alert').textContent).toMatch(/can't deliver email/i);
    expect(
      screen
        .getByRole('link', { name: /reset your password/i })
        .getAttribute('href')
    ).toBe('/auth/forgot-password');
    expect(screen.queryByLabelText(/verification code/i)).toBeNull();
  });
});
