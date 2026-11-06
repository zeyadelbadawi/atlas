/**
 * B1 (UX audit, docs/ux-audit/batch-01.md) — the auth flow says what really
 * happened. Each test names the finding it proves.
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { createQueryClient } from '@services/query';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { authenticationService } from '@services/identity';
import { ApiError, createApiError } from '@api';
import type { RegistrationResult } from '@types';
import { signupOptionsService } from './services/SignupOptionsService';
import { SignInForm } from './components/SignInForm';
import { RegistrationForm } from './components/RegistrationForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { TwoFactorChallengeForm } from './components/TwoFactorChallengeForm';
import { EmailOtpChallengeForm } from './components/EmailOtpChallengeForm';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SignInPage from './pages/SignInPage';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}
if (typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => null;
}

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};
/** The app-wide failure reporter: a call here is the second, duplicate toast. */
const reporter = vi.fn();

function renderUi(
  ui: ReactNode,
  { at = '/', lang = 'en' }: { at?: string; lang?: 'en' | 'ar' } = {}
) {
  const client = createQueryClient(reporter);
  client.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={createI18nInstance(lang)}>
        <ToastContext.Provider value={toastValue}>
          <MemoryRouter initialEntries={[at]}>
            <Routes>
              <Route path="*" element={ui} />
            </Routes>
          </MemoryRouter>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const SERVER_500 = (): ApiError =>
  createApiError('server', {
    messageKey: 'errors.internal',
    status: 500,
    requestId: 'req-500',
  });
const NETWORK = (): ApiError => createApiError('network');
const SERVER_TEXT =
  'Something failed on our side. We are looking into it — please try again shortly.';
const NETWORK_TEXT =
  "We couldn't reach the server. Check your connection and try again.";

beforeEach(() => {
  reporter.mockReset();
  vi.spyOn(authenticationService, 'authOptions').mockResolvedValue({
    google: false,
  });
  vi.spyOn(signupOptionsService, 'getSignupOptions').mockResolvedValue({
    organizationSignup: false,
    trialsEnabled: false,
    trialPlans: [],
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('sign-in (V01, V19, V21, V23, V45)', () => {
  const renderSignIn = (error: ApiError | null) =>
    renderUi(
      <SignInForm
        onSubmit={vi.fn(async () => {})}
        isLoading={false}
        error={error}
      />
    );

  it('says "Invalid email or password" only for wrong credentials (401)', () => {
    renderSignIn(
      createApiError('unauthorized', {
        messageKey: 'errors.auth.invalidCredentials',
        status: 401,
      })
    );
    expect(screen.getByTestId('auth-form-alert').textContent).toContain(
      'Invalid email or password.'
    );
  });

  it.each([
    ['a 500', SERVER_500(), SERVER_TEXT],
    [
      'a 503',
      createApiError('server', {
        messageKey: 'errors.unavailable',
        status: 503,
      }),
      SERVER_TEXT,
    ],
    ['a network failure', NETWORK(), NETWORK_TEXT],
  ])('says what really happened for %s', (_label, error, text) => {
    renderSignIn(error);
    const alert = screen.getByTestId('auth-form-alert');
    expect(alert.textContent).toContain(text);
    expect(alert.textContent).not.toMatch(/invalid email or password/i);
    // Focus moves to the message, not the page body.
    expect(document.activeElement).toBe(alert);
  });

  it('marks the email field for a 400 that names it, with no banner', async () => {
    renderSignIn(
      createApiError('validation', {
        messageKey: 'errors.validation.failed',
        status: 400,
        violations: [{ field: 'email', messageKey: 'validation:invalidEmail' }],
      })
    );
    const email = screen.getByLabelText('Email');
    await waitFor(() =>
      expect(email.getAttribute('aria-invalid')).toBe('true')
    );
    expect(screen.getByText('Enter a valid email address')).toBeTruthy();
    expect(screen.queryByTestId('auth-form-alert')).toBeNull();
  });

  it('turns off the browser bubble and marks both fields required', () => {
    const { container } = renderSignIn(null);
    expect(container.querySelector('form')?.noValidate).toBe(true);
    expect(screen.getByLabelText('Email').getAttribute('aria-required')).toBe(
      'true'
    );
    expect(
      screen.getByLabelText('Password').getAttribute('aria-required')
    ).toBe('true');
  });

  it('mirrors the directional sign-in icon in RTL', () => {
    const identity = {
      session: { status: 'unauthenticated' },
      isAuthenticated: false,
      isRestoring: false,
      signIn: async () => undefined,
      completeTwoFactor: async () => undefined,
      completeEmailOtp: async () => undefined,
    } as unknown as IdentityContextValue;
    const { container } = renderUi(
      <IdentityContext.Provider value={identity}>
        <SignInPage />
      </IdentityContext.Provider>,
      { at: '/auth/sign-in' }
    );
    expect(
      container.querySelector('svg.lucide-log-in')?.getAttribute('class')
    ).toContain('rtl:-scale-x-100');
  });
});

describe('registration (V03, V19, V22, V23, V24, V42)', () => {
  const fill = (values: Partial<Record<string, string>>) => {
    for (const [id, value] of Object.entries(values)) {
      fireEvent.change(document.getElementById(id) as HTMLElement, {
        target: { value },
      });
    }
  };
  const submit = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
  const fillValid = () => {
    fill({
      name: 'Sara Ali',
      email: 'sara@example.com',
      phoneNumber: '01001234567',
      password: 'Xy7!kq93Lmnop',
      confirmPassword: 'Xy7!kq93Lmnop',
    });
    fireEvent.click(screen.getByRole('checkbox'));
  };

  it('puts "phone number already used" on the phone field, not the email card (409)', async () => {
    vi.spyOn(authenticationService, 'register').mockRejectedValue(
      // As the client receives it today: a 409 keeps no violations.
      new ApiError({
        kind: 'conflict',
        messageKey: 'errors.auth.phoneTaken',
        status: 409,
        retryable: false,
      })
    );
    renderUi(<RegistrationForm />, { at: '/auth/register' });
    await screen.findByLabelText('Full Name');
    fillValid();
    submit();
    expect(
      await screen.findByText(
        /This phone number is already used by another account/
      )
    ).toBeTruthy();
    expect(
      screen.queryByText(/An account with this email already exists/)
    ).toBeNull();
    expect(screen.queryByText('This item was changed elsewhere')).toBeNull();
    await waitFor(() => expect(document.activeElement?.id).toBe('phoneNumber'));
  });

  it('keeps "email already has an account" with the way to sign in', async () => {
    vi.spyOn(authenticationService, 'register').mockRejectedValue(
      new ApiError({
        kind: 'conflict',
        messageKey: 'errors.auth.emailAlreadyRegistered',
        status: 409,
        retryable: false,
      })
    );
    renderUi(<RegistrationForm />, { at: '/auth/register' });
    await screen.findByLabelText('Full Name');
    fillValid();
    submit();
    const card = await screen.findByTestId('register-email-exists');
    expect(
      within(card).getByText('This email already has an account')
    ).toBeTruthy();
    expect(
      within(card).getByRole('link', { name: 'Sign in instead' })
    ).toBeTruthy();
  });

  it('says a one-letter name is too short and an empty password is required', async () => {
    renderUi(<RegistrationForm />, { at: '/auth/register' });
    await screen.findByLabelText('Full Name');
    fill({ name: 'A' });
    submit();
    expect(
      (await screen.findAllByText(/Name must be at least 2 characters/)).length
    ).toBeGreaterThan(0);
    expect(screen.queryByText('Name is required')).toBeNull();
    // (The summary repeats it; the field's own message is the one checked.)
    expect(
      document.getElementById('password')?.getAttribute('aria-invalid')
    ).toBe('true');
    expect(screen.getAllByText(/Password is required/).length).toBeGreaterThan(
      0
    );
    expect(
      screen.queryByText('Password must be at least 8 characters')
    ).toBeNull();
  });

  it('says a 255-character email is too long, not invalid', async () => {
    renderUi(<RegistrationForm />, { at: '/auth/register' });
    await screen.findByLabelText('Full Name');
    fill({ email: `${'x'.repeat(250)}@a.co` });
    submit();
    expect(
      (
        await screen.findByText('Email must be 254 characters or fewer', {
          selector: '#email-error',
        })
      ).id
    ).toBe('email-error');
    expect(screen.queryByText('Please enter a valid email')).toBeNull();
  });

  it('shows the error summary, takes focus, and uses no browser bubble', async () => {
    const { container } = renderUi(<RegistrationForm />, {
      at: '/auth/register',
    });
    await screen.findByLabelText('Full Name');
    expect(container.querySelector('form')?.noValidate).toBe(true);
    submit();
    const summary = await screen.findByTestId('form-error-summary');
    await waitFor(() => expect(document.activeElement).toBe(summary));
    expect(
      within(summary).getByText(/Full Name: Name is required/)
    ).toBeTruthy();
  });

  it('marks the required fields', async () => {
    renderUi(<RegistrationForm />, { at: '/auth/register' });
    for (const label of [
      'Full Name',
      'Email',
      'Password',
      'Confirm Password',
    ]) {
      expect(
        (await screen.findByLabelText(label)).getAttribute('aria-required')
      ).toBe('true');
    }
  });

  it('shows the name limit as it nears, instead of cutting a paste', async () => {
    renderUi(<RegistrationForm />, { at: '/auth/register' });
    const name = (await screen.findByLabelText(
      'Full Name'
    )) as HTMLInputElement;
    fill({ name: 'N'.repeat(150) });
    expect(name.value).toHaveLength(150);
    expect(screen.getByTestId('name-counter').textContent).toBe(
      '150 / 100 characters'
    );
  });

  it('a server error is one message with its real reason, focused, and no toast', async () => {
    vi.spyOn(authenticationService, 'register').mockRejectedValue(SERVER_500());
    renderUi(<RegistrationForm />, { at: '/auth/register' });
    await screen.findByLabelText('Full Name');
    fillValid();
    submit();
    const alert = await screen.findByTestId('auth-form-alert');
    expect(alert.textContent).toContain(SERVER_TEXT);
    await waitFor(() =>
      expect(alert.parentElement?.contains(document.activeElement)).toBe(true)
    );
    expect(reporter).not.toHaveBeenCalled();
  });
});

describe('forgot password (V04, V20, V21)', () => {
  it('confirms in body text on the success surface', async () => {
    vi.spyOn(authenticationService, 'requestPasswordReset').mockResolvedValue();
    renderUi(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));
    const success = await screen.findByTestId('forgot-password-success');
    // Semantic tokens: foreground text on the success surface (≥ 4.5:1 in
    // both themes) — never the white-on-pale-green it was.
    expect(success.className).toContain('bg-success-surface');
    expect(success.className).toContain('text-foreground');
    expect(success.className).not.toContain('text-success-foreground');
    expect(success.getAttribute('role')).toBe('status');
    expect(within(success).getByText('Check Your Email')).toBeTruthy();
  });

  it.each([
    ['a 500', SERVER_500(), SERVER_TEXT],
    ['a network failure', NETWORK(), NETWORK_TEXT],
  ])('shows %s once, inline, with no toast', async (_label, error, text) => {
    vi.spyOn(authenticationService, 'requestPasswordReset').mockRejectedValue(
      error
    );
    renderUi(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));
    expect(
      (await screen.findByTestId('auth-form-alert')).textContent
    ).toContain(text);
    expect(screen.queryByText('Unexpected error')).toBeNull();
    expect(reporter).not.toHaveBeenCalled();
  });

  it('marks the email field for a 400 that names it', async () => {
    vi.spyOn(authenticationService, 'requestPasswordReset').mockRejectedValue(
      createApiError('validation', {
        messageKey: 'errors.validation.failed',
        status: 400,
        violations: [{ field: 'email', messageKey: 'validation:invalidEmail' }],
      })
    );
    renderUi(<ForgotPasswordForm />);
    const email = screen.getByLabelText('Email');
    fireEvent.change(email, { target: { value: 'a@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));
    await waitFor(() =>
      expect(email.getAttribute('aria-invalid')).toBe('true')
    );
    expect(screen.getByText('Enter a valid email address')).toBeTruthy();
    expect(screen.queryByTestId('auth-form-alert')).toBeNull();
  });
});

describe('reset password (V10, V20, V22, V37)', () => {
  it('an invalid link is a page with a heading and a way to a new link', async () => {
    vi.spyOn(
      authenticationService,
      'validatePasswordResetToken'
    ).mockResolvedValue(false);
    renderUi(<ResetPasswordPage />, { at: '/auth/reset-password?token=bad' });
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: "This link can't be used",
      })
    ).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Request a new reset link' })
        .getAttribute('href')
    ).toBe('/auth/forgot-password');
  });

  it('a link refused on submit swaps to the same state — no "Unexpected error", no toast', async () => {
    vi.spyOn(
      authenticationService,
      'validatePasswordResetToken'
    ).mockResolvedValue(true);
    vi.spyOn(authenticationService, 'confirmPasswordReset').mockRejectedValue(
      createApiError('unauthorized', {
        messageKey: 'errors.auth.invalidResetToken',
        status: 401,
      })
    );
    renderUi(<ResetPasswordPage />, { at: '/auth/reset-password?token=ok' });
    const password = await screen.findByLabelText('New Password');
    fireEvent.change(password, { target: { value: 'Xy7!kq93Lmnop' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'Xy7!kq93Lmnop' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
    const heading = await screen.findByRole('heading', {
      level: 1,
      name: "This link can't be used",
    });
    expect(
      screen.getByText(/This reset link is invalid or has expired/)
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Request a new reset link' })
    ).toBeTruthy();
    expect(screen.queryByText('Unexpected error')).toBeNull();
    expect(document.activeElement).toBe(heading);
    expect(reporter).not.toHaveBeenCalled();
  });

  it('an empty password is "required", not "at least 8 characters"', async () => {
    vi.spyOn(
      authenticationService,
      'validatePasswordResetToken'
    ).mockResolvedValue(true);
    renderUi(<ResetPasswordPage />, { at: '/auth/reset-password?token=ok' });
    await screen.findByLabelText('New Password');
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
    expect(await screen.findByText('Password is required')).toBeTruthy();
    expect(
      screen.queryByText('Password must be at least 8 characters')
    ).toBeNull();
  });

  it('a failed link CHECK is not reported as a dead link', async () => {
    vi.spyOn(
      authenticationService,
      'validatePasswordResetToken'
    ).mockRejectedValue(SERVER_500());
    renderUi(<ResetPasswordPage />, { at: '/auth/reset-password?token=ok' });
    expect(await screen.findByTestId('reset-link-check-failed')).toBeTruthy();
    expect(screen.getByTestId('auth-form-alert').textContent).toContain(
      SERVER_TEXT
    );
    expect(
      screen.getByRole('button', { name: /Try again|Retry/ })
    ).toBeTruthy();
  });
});

describe('two-factor step (V05, V34)', () => {
  const renderTwoFactor = (error: ApiError | null, onSubmit = vi.fn()) =>
    renderUi(
      <TwoFactorChallengeForm
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        isLoading={false}
        error={error}
      />
    );

  it.each([
    ['a 500', SERVER_500(), SERVER_TEXT],
    ['a network failure', NETWORK(), NETWORK_TEXT],
  ])('does not call %s a wrong code', (_label, error, text) => {
    renderTwoFactor(error);
    const message = screen.getByTestId('two-factor-error');
    expect(message.textContent).toBe(text);
    expect(message.textContent).not.toMatch(/didn't work/);
  });

  it('says "that code didn\'t work" for the real wrong-code answer', () => {
    renderTwoFactor(
      createApiError('unauthorized', {
        messageKey: 'errors.auth.invalidTwoFactorCode',
        status: 401,
      })
    );
    expect(screen.getByTestId('two-factor-error').textContent).toBe(
      "That code didn't work. Check your app and try the current code."
    );
  });

  it('keeps Verify enabled and says what is missing', () => {
    const onSubmit = vi.fn();
    renderTwoFactor(null, onSubmit);
    const verify = screen.getByRole('button', { name: 'Verify' });
    expect(verify.hasAttribute('disabled')).toBe(false);
    fireEvent.change(screen.getByLabelText('Authentication code'), {
      target: { value: '123' },
    });
    fireEvent.click(verify);
    expect(
      screen.getByText(
        'Enter all 6 digits of the code from your authenticator app.'
      )
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('email-code step (V06)', () => {
  it('never shows the raw word "internal"', () => {
    const now = Date.now();
    renderUi(
      <EmailOtpChallengeForm
        challenge={{
          emailOtpRequired: true,
          challengeId: 'c',
          expiresAt: new Date(now + 600_000).toISOString(),
          resendAvailableAt: new Date(now + 60_000).toISOString(),
          resendsRemaining: 3,
          maskedEmail: 's•••@example.com',
        }}
        onSubmit={vi.fn()}
        onResend={vi.fn()}
        onCancel={vi.fn()}
        isLoading={false}
        error={SERVER_500()}
        forgotPasswordHref="/auth/forgot-password"
      />
    );
    expect(screen.getByText(SERVER_TEXT)).toBeTruthy();
    expect(screen.queryByText(/^internal$/)).toBeNull();
    expect(screen.queryByText(/errors:internal/)).toBeNull();
  });
});

describe('Arabic copy', () => {
  it('says a one-letter name is too short, in Arabic', async () => {
    renderUi(<RegistrationForm />, { at: '/auth/register', lang: 'ar' });
    const name = await screen.findByLabelText('الاسم الكامل');
    fireEvent.change(name, { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء حساب' }));
    expect(
      (await screen.findAllByText(/يجب أن يتكوّن الاسم من حرفين على الأقل/))
        .length
    ).toBeGreaterThan(0);
  });
});
