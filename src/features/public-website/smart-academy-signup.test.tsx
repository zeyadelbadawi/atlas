/**
 * Smart academy signup — an academy website's sign-up page with an email
 * that already has an Atlas account.
 *
 * What these tests pin:
 *
 *   - a sign-up refused with "this email is registered" turns into "you
 *     don't need another account — enter your Atlas password", never a
 *     dead-end error, and without any separate "does this email exist" call;
 *   - "Already have an Atlas account? Join with it" reaches the same step;
 *   - a wrong password gets the generic sign-in answer;
 *   - a successful join greets the person by name, signs them in on THIS
 *     academy (`surface: 'academy'`), shows the emailed-code step, and lands
 *     them on `/my` once signed in;
 *   - a join awaiting approval, or a continuation that cannot complete,
 *     ends in a clear state instead of an error;
 *   - Arabic renders right-to-left.
 *
 * HTTP is mocked at the service layer (`authenticationService`); the page,
 * the forms, the query cache and i18n are real. The website shell and the
 * session hooks are replaced with minimal stand-ins.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import type * as SharedHooks from '@/shared/hooks';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { ApiError } from '@api';
import { authenticationService } from '@services/identity';
import type {
  AcademyJoinRequest,
  AcademyJoinResult,
  AcademyJoinSummary,
  EmailOtpChallenge,
  RegistrationRequest,
  RegistrationResult,
} from '@types';
import { PublicWebsiteSignUpPage } from './components/PublicWebsiteSignUpPage';
import { PublicWebsiteGuestRoute } from './components/PublicWebsiteGuestRoute';

// jsdom has no layout; the code input places its caret with this.
if (typeof document.elementFromPoint !== 'function') {
  document.elementFromPoint = () => null;
}

// jsdom has no ResizeObserver; Radix Checkbox measures with one.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const ACADEMY_ID = 'academy-b';

/*
  The session is REACTIVE, as in the app: the guest-route guard around the
  page re-renders when sign-in completes. A static stub hid exactly the bug
  where the guard redirected to /my before the page could say anything.
*/
const session = { status: 'unauthenticated' as string };
const sessionListeners = new Set<() => void>();
function setSessionStatus(status: string): void {
  session.status = status;
  sessionListeners.forEach((listener) => listener());
}
const signIn = vi.fn();
const completeEmailOtp = vi.fn();

vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof SharedHooks>()),
  useAuth: () => ({
    session: {
      status: useSyncExternalStore(
        (listener) => {
          sessionListeners.add(listener);
          return () => sessionListeners.delete(listener);
        },
        () => session.status
      ),
      user: null,
    },
  }),
  useSignOut: () => ({ signOut: vi.fn() }),
  useSignIn: () => ({
    signIn,
    completeTwoFactor: vi.fn(),
    completeEmailOtp,
    isLoading: false,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('@features/website', () => ({
  WebsiteChrome: ({ children }: { children: ReactNode }) => (
    <main>{children}</main>
  ),
  WebsiteBrandBridge: ({ children }: { children: ReactNode }) => (
    <>{children}</>
  ),
  resolvePagePath: () => undefined,
  resolveLocalizedText: () => '',
  usePublicWebsiteDocumentDirection: () => undefined,
}));

vi.mock('./hooks/usePublicWebsiteData', () => ({
  usePublicWebsiteData: () => ({
    status: 'ready',
    academy: { academyId: ACADEMY_ID, academyName: 'Nile Academy' },
    configuration: { header: {} },
    pages: [],
  }),
}));

vi.mock('./utils/public-website-link-renderer', () => ({
  usePublicWebsiteLinkRenderer:
    () =>
    ({
      href,
      className,
      children,
    }: {
      href: string;
      className?: string;
      children: ReactNode;
    }) => (
      <a href={href} className={className}>
        {children}
      </a>
    ),
  usePublicWebsiteHrefBuilder: () => (path: string) => path,
}));

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

const OTP_CHALLENGE: EmailOtpChallenge = {
  emailOtpRequired: true,
  challengeId: 'challenge-1',
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
  resendsRemaining: 3,
  maskedEmail: 'a•••@example.com',
} as EmailOtpChallenge;

let register: ReturnType<typeof vi.fn>;
let joinAcademy: ReturnType<typeof vi.fn>;
let joinSummary: ReturnType<typeof vi.fn>;

function invalidCredentials(): ApiError {
  return new ApiError({
    kind: 'unauthorized',
    messageKey: 'errors.auth.invalidCredentials',
    status: 401,
    retryable: false,
  });
}

beforeEach(() => {
  setSessionStatus('unauthenticated');
  register = vi.fn(async (): Promise<RegistrationResult> => {
    throw new ApiError({
      kind: 'conflict',
      messageKey: 'errors.auth.emailAlreadyRegistered',
      status: 409,
      retryable: false,
    });
  });
  joinAcademy = vi.fn(async (): Promise<AcademyJoinResult> => ({
    account: 'existing',
    status: 'active',
    name: 'Ahmed',
  }));
  joinSummary = vi.fn(async (): Promise<AcademyJoinSummary> => ({
    otherAcademies: [],
  }));
  signIn.mockResolvedValue(OTP_CHALLENGE);
  vi.spyOn(authenticationService, 'academyJoinSummary').mockImplementation(
    () => joinSummary() as Promise<AcademyJoinSummary>
  );
  vi.spyOn(authenticationService, 'register').mockImplementation(
    (request: RegistrationRequest) =>
      register(request) as Promise<RegistrationResult>
  );
  vi.spyOn(authenticationService, 'joinAcademy').mockImplementation(
    (request: AcademyJoinRequest) =>
      joinAcademy(request) as Promise<AcademyJoinResult>
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage(language: 'en' | 'ar' = 'en') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18nInstance(language)}>
        <ToastContext.Provider value={toastValue}>
          <div dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="root">
            <MemoryRouter initialEntries={['/sign-up']}>
              <Routes>
                <Route
                  path="/sign-up"
                  element={
                    <PublicWebsiteGuestRoute locale={language}>
                      <PublicWebsiteSignUpPage
                        lookupKey="nile"
                        locale={language}
                      />
                    </PublicWebsiteGuestRoute>
                  }
                />
                <Route path="/my" element={<p>learner dashboard</p>} />
              </Routes>
            </MemoryRouter>
          </div>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

async function submitSignUp(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full Name'), 'Ahmed');
  await user.type(screen.getByLabelText('Email'), 'ahmed@example.com');
  await user.type(screen.getByLabelText('Password'), 'not-my-atlas-password');
  await user.type(
    screen.getByLabelText('Confirm Password'),
    'not-my-atlas-password'
  );
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Create Account' }));
}

describe('smart academy signup — existing account', () => {
  it('turns "email already registered" into the enter-your-Atlas-password step', async () => {
    const user = userEvent.setup();
    renderPage();
    await submitSignUp(user);

    expect(
      await screen.findByText('You already have an Atlas account')
    ).toBeTruthy();
    // Why: this academy runs on Atlas, and the email is already on Atlas.
    expect(
      screen.getByText(
        /Nile Academy runs on Atlas, and this email is already registered on Atlas/
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        /You don't need a new account\. Continue with your Atlas account and we'll add Nile Academy to it\./
      )
    ).toBeTruthy();
    expect(
      screen.getByText('Use the password you already use for Atlas.')
    ).toBeTruthy();
    // The email is the one the sign-up was answered for — locked, not silently replaceable.
    const email = screen.getByLabelText('Email') as HTMLInputElement;
    expect(email.value).toBe('ahmed@example.com');
    expect(email.readOnly).toBe(true);
    expect(screen.getByRole('button', { name: 'Change email' })).toBeTruthy();
    // No new-account password fields; a reset path instead.
    expect(screen.queryByLabelText('Confirm Password')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Reset it' }).getAttribute('href')
    ).toBe('/forgot-password');
    // No other academy is named before any proof; nothing but the sign-up was asked.
    expect(joinAcademy).not.toHaveBeenCalled();
    expect(joinSummary).not.toHaveBeenCalled();
  });

  it('joins with the right password, greets by name, and continues into the academy emailed-code sign-in', async () => {
    const user = userEvent.setup();
    renderPage();
    await submitSignUp(user);
    await screen.findByText('You already have an Atlas account');

    await user.type(
      screen.getByLabelText('Your Atlas password'),
      'my-atlas-pass'
    );
    await user.click(
      screen.getByRole('button', { name: 'Continue with my Atlas account' })
    );

    await waitFor(() => expect(joinAcademy).toHaveBeenCalledTimes(1));
    expect(joinAcademy.mock.calls[0][0]).toEqual({
      email: 'ahmed@example.com',
      password: 'my-atlas-pass',
      academyId: ACADEMY_ID,
      inviteToken: undefined,
    });
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(signIn.mock.calls[0][0]).toMatchObject({
      email: 'ahmed@example.com',
      password: 'my-atlas-pass',
      surface: 'academy',
      academyId: ACADEMY_ID,
    });
    expect(await screen.findByText(/Welcome back, Ahmed\./)).toBeTruthy();
    expect(screen.getByLabelText('Verification code')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Verification code'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }));
    await waitFor(() => expect(completeEmailOtp).toHaveBeenCalled());
    expect(completeEmailOtp.mock.calls[0][0]).toMatchObject({
      challengeId: 'challenge-1',
      code: '123456',
      surface: 'academy',
      academyId: ACADEMY_ID,
    });
  });

  it('goes straight to /my when no emailed code is needed', async () => {
    signIn.mockImplementation(async () => {
      setSessionStatus('authenticated');
      return undefined;
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Join with it' }));
    await user.type(screen.getByLabelText('Email'), 'ahmed@example.com');
    await user.type(
      screen.getByLabelText('Your Atlas password'),
      'my-atlas-pass'
    );
    await user.click(
      screen.getByRole('button', { name: 'Continue with my Atlas account' })
    );

    expect(await screen.findByText('learner dashboard')).toBeTruthy();
  });

  it('answers a wrong password like a sign-in, without revealing anything else', async () => {
    joinAcademy.mockRejectedValue(invalidCredentials());
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Join with it' }));
    expect(screen.getByText('Join with your Atlas account')).toBeTruthy();

    await user.type(screen.getByLabelText('Email'), 'someone@example.com');
    await user.type(screen.getByLabelText('Your Atlas password'), 'wrong');
    await user.click(
      screen.getByRole('button', { name: 'Continue with my Atlas account' })
    );

    expect(await screen.findByText('Invalid email or password')).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('continues into sign-in when the account is already a learner here', async () => {
    joinAcademy.mockRejectedValue(
      new ApiError({
        kind: 'conflict',
        messageKey: 'errors.auth.alreadyLearnerHere',
        status: 409,
        retryable: false,
      })
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Join with it' }));
    await user.type(screen.getByLabelText('Email'), 'ahmed@example.com');
    await user.type(
      screen.getByLabelText('Your Atlas password'),
      'my-atlas-pass'
    );
    await user.click(
      screen.getByRole('button', { name: 'Continue with my Atlas account' })
    );

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(await screen.findByLabelText('Verification code')).toBeTruthy();
  });

  it('explains a join awaiting approval instead of trying to sign in', async () => {
    joinAcademy.mockResolvedValue({
      account: 'existing',
      status: 'pending',
      name: 'Ahmed',
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Join with it' }));
    await user.type(screen.getByLabelText('Email'), 'ahmed@example.com');
    await user.type(
      screen.getByLabelText('Your Atlas password'),
      'my-atlas-pass'
    );
    await user.click(
      screen.getByRole('button', { name: 'Continue with my Atlas account' })
    );

    expect(
      await screen.findByText(/Your request to join Nile Academy has been sent/)
    ).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('keeps the join and points to sign-in when the continuation cannot complete', async () => {
    signIn.mockRejectedValue(
      new ApiError({
        kind: 'network',
        messageKey: 'errors.network',
        retryable: true,
      })
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Join with it' }));
    await user.type(screen.getByLabelText('Email'), 'ahmed@example.com');
    await user.type(
      screen.getByLabelText('Your Atlas password'),
      'my-atlas-pass'
    );
    await user.click(
      screen.getByRole('button', { name: 'Continue with my Atlas account' })
    );

    expect(
      await screen.findByText(/it now has access to this academy/)
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toBeTruthy();
  });

  it('"Change email" unlocks the address by returning to the form, keeping what was typed', async () => {
    const user = userEvent.setup();
    renderPage();
    await submitSignUp(user);
    await screen.findByText('You already have an Atlas account');
    await user.click(screen.getByRole('button', { name: 'Change email' }));

    const email = screen.getByLabelText('Email') as HTMLInputElement;
    expect(email.readOnly).toBe(false);
    expect(email.value).toBe('ahmed@example.com');
    expect((screen.getByLabelText('Full Name') as HTMLInputElement).value).toBe(
      'Ahmed'
    );
    expect(screen.getByLabelText('Confirm Password')).toBeTruthy();
  });

  it('after the full sign-in, names the academies the account already uses — then /my', async () => {
    signIn.mockImplementation(async () => {
      setSessionStatus('authenticated');
      return undefined;
    });
    joinSummary.mockResolvedValue({ otherAcademies: ['Al-Nogoom Academy'] });
    const user = userEvent.setup();
    renderPage();
    await submitSignUp(user);
    await screen.findByText('You already have an Atlas account');
    await user.type(
      screen.getByLabelText('Your Atlas password'),
      'my-atlas-pass'
    );
    await user.click(
      screen.getByRole('button', { name: 'Continue with my Atlas account' })
    );

    expect(
      await screen.findByText(
        "You're all set — Nile Academy has been added to your Atlas account"
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        /You already use this Atlas account with Al-Nogoom Academy\./
      )
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Your courses, progress and certificates in each academy stay separate.'
      )
    ).toBeTruthy();
    expect(joinSummary).toHaveBeenCalledTimes(1);
    expect(
      screen
        .getByRole('link', { name: 'Go to my learning' })
        .getAttribute('href')
    ).toBe('/my');
  });

  it('can go back to creating a new account', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Join with it' }));
    await user.click(screen.getByRole('button', { name: 'Back to sign up' }));
    expect(screen.getByLabelText('Full Name')).toBeTruthy();
  });

  it('renders the join step in Arabic, right-to-left', async () => {
    const user = userEvent.setup();
    renderPage('ar');
    expect(screen.getByTestId('root').getAttribute('dir')).toBe('rtl');
    await user.click(screen.getByRole('button', { name: 'انضم به' }));
    expect(screen.getByText('انضم باستخدام حسابك على Atlas')).toBeTruthy();
    expect(
      screen.getByText('استخدم كلمة المرور التي تستخدمها بالفعل على Atlas.')
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'المتابعة بحسابي على Atlas' })
    ).toBeTruthy();
  });

  it('renders the existing-account step in Arabic, right-to-left, with the email locked', async () => {
    const user = userEvent.setup();
    renderPage('ar');
    await user.type(screen.getByLabelText('الاسم الكامل'), 'أحمد');
    await user.type(
      screen.getByLabelText('البريد الإلكتروني'),
      'ahmed@example.com'
    );
    await user.type(
      screen.getByLabelText('كلمة المرور'),
      'not-my-atlas-password'
    );
    await user.type(
      screen.getByLabelText('تأكيد كلمة المرور'),
      'not-my-atlas-password'
    );
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'إنشاء حساب' }));

    expect(await screen.findByText('لديك حساب على Atlas بالفعل')).toBeTruthy();
    expect(screen.getByText(/تعمل Nile Academy على منصة Atlas/)).toBeTruthy();
    const email = screen.getByLabelText(
      'البريد الإلكتروني'
    ) as HTMLInputElement;
    expect(email.readOnly).toBe(true);
    expect(email.getAttribute('dir')).toBe('ltr');
    expect(
      screen.getByRole('button', { name: 'تغيير البريد الإلكتروني' })
    ).toBeTruthy();
  });
});
