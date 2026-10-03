/**
 * The academy website's `/verify-email` page — the destination of the
 * link a learner who signed up on this academy receives. Same contract
 * as the management host's page (`useVerifyEmailFlow`), rendered in the
 * academy's own shell, with the academy's sign-in (and `returnTo`) and
 * the `/ar` locale prefix on every link.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createApiError } from '@api';
import type { ApiError } from '@api';
import { PublicWebsiteVerifyEmailPage } from './components/PublicWebsiteVerifyEmailPage';

interface MutationState {
  isSuccess: boolean;
  isError: boolean;
  isPending: boolean;
  error: ApiError | null;
  mutate: ReturnType<typeof vi.fn>;
  reset: ReturnType<typeof vi.fn>;
}

const blank = (): MutationState => ({
  isSuccess: false,
  isError: false,
  isPending: false,
  error: null,
  mutate: vi.fn(),
  reset: vi.fn(),
});
let verify = blank();
let resend = blank();
const auth = { isAuthenticated: false, refreshSession: vi.fn(async () => {}) };

vi.mock('@/features/auth/hooks/useVerifyEmail', () => ({
  useVerifyEmail: () => verify,
}));
vi.mock('@/features/auth/hooks/useResendEmailVerification', () => ({
  useResendEmailVerification: () => resend,
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => auth,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
// The shell's own data loading and chrome are covered elsewhere; here it
// only has to render the page body it is handed.
vi.mock('./components/PublicWebsiteAuthShell', () => ({
  PublicWebsiteAuthShell: ({
    title,
    children,
  }: {
    title: ReactNode;
    children: (context: {
      academyId: string;
      academyName: string;
    }) => ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children({ academyId: 'aca-1', academyName: 'Falcon' })}
    </div>
  ),
}));

let currentSearch = '';
function LocationProbe(): null {
  currentSearch = useLocation().search;
  return null;
}

function renderAt(url: string, locale: 'en' | 'ar' = 'en') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PublicWebsiteVerifyEmailPage lookupKey="falcon" locale={locale} />
      <LocationProbe />
    </MemoryRouter>
  );
}

const KEYS = 'publicWebsite:auth.verifyEmail';
const errorState = () => screen.getByTestId('verify-email-error').dataset.state;

beforeEach(() => {
  verify = blank();
  resend = blank();
  auth.isAuthenticated = false;
  auth.refreshSession = vi.fn(async () => {});
});
afterEach(() => cleanup());

describe('PublicWebsiteVerifyEmailPage (academy host)', () => {
  it('submits the token once, strips it from the URL and sets no-referrer', () => {
    renderAt('/verify-email?token=tok-1');
    expect(verify.mutate).toHaveBeenCalledTimes(1);
    expect(verify.mutate.mock.calls[0][0]).toEqual({ token: 'tok-1' });
    expect(currentSearch).toBe('');
    expect(
      document.head.querySelector<HTMLMetaElement>('meta[name="referrer"]')
        ?.content
    ).toBe('no-referrer');
    expect(screen.getByTestId('verify-email-pending')).toBeTruthy();
  });

  it('success refreshes the session and shows the verified state', () => {
    verify.mutate = vi.fn((_vars, options?: { onSuccess?: () => void }) => {
      options?.onSuccess?.();
    });
    renderAt('/verify-email?token=tok-1');
    expect(auth.refreshSession).toHaveBeenCalledTimes(1);

    cleanup();
    verify = blank();
    verify.isSuccess = true;
    renderAt('/verify-email?token=tok-1');
    expect(screen.getByTestId('verify-email-success')).toBeTruthy();
  });

  it("signed out with a dead link: the academy's own sign-in, returning here, locale-prefixed", () => {
    verify.isError = true;
    verify.error = createApiError('validation', {
      messageKey: 'errors.auth.verificationTokenExpired',
    });
    renderAt('/ar/verify-email?token=tok-1', 'ar');
    expect(errorState()).toBe('expired');
    expect(screen.getByText(`${KEYS}.goToSignIn`).getAttribute('href')).toBe(
      '/ar/sign-in?returnTo=%2Fverify-email'
    );
    expect(screen.queryByTestId('verify-email-resend')).toBeNull();
  });

  it('signed in with an expired link: one click sends a new one', () => {
    auth.isAuthenticated = true;
    verify.isError = true;
    verify.error = createApiError('validation', {
      messageKey: 'errors.auth.verificationTokenExpired',
    });
    renderAt('/verify-email?token=tok-1');
    fireEvent.click(screen.getByText(`${KEYS}.resend.action`));
    expect(resend.mutate).toHaveBeenCalledTimes(1);
  });

  it('distinguishes invalid, used, rate limited and network failures', () => {
    const cases: Array<[ApiError, string]> = [
      [
        createApiError('validation', {
          messageKey: 'errors.auth.invalidVerificationToken',
        }),
        'invalid',
      ],
      [
        createApiError('validation', {
          messageKey: 'errors.auth.verificationTokenUsed',
        }),
        'used',
      ],
      [createApiError('rateLimited'), 'rateLimited'],
      [createApiError('network'), 'network'],
    ];
    for (const [error, expected] of cases) {
      verify = blank();
      verify.isError = true;
      verify.error = error;
      renderAt('/verify-email?token=tok-1');
      expect(errorState()).toBe(expected);
      cleanup();
    }
  });

  it('a signed-in learner opening the page without a link can request one', () => {
    auth.isAuthenticated = true;
    renderAt('/verify-email');
    expect(verify.mutate).not.toHaveBeenCalled();
    expect(screen.getByTestId('verify-email-request')).toBeTruthy();
    expect(screen.getByText(`${KEYS}.resend.action`)).toBeTruthy();
  });
});
