/**
 * Sign In Page.
 *
 * Authenticates users with email and password using the existing
 * SessionService and AuthenticationService infrastructure.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'lucide-react';
import { useAuth, useSignIn } from '@hooks';
import { TwoFactorChallengeForm } from '../components/TwoFactorChallengeForm';
import type { TwoFactorChallenge } from '@types';
import {
  AUTHENTICATED_ENTRY_ROUTE,
  AUTH_ROUTES,
} from '@app/routes/route-paths';
import { PageContainer, PageHeader } from '@components/layout';
import { SignInForm } from '../components/SignInForm';

export default function SignInPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { signIn, completeTwoFactor, isLoading, error, clearError } =
    useSignIn();
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);

  // Redirect authenticated users
  useEffect(() => {
    if (session.status === 'authenticated') {
      const redirectTo =
        searchParams.get('redirect') || AUTHENTICATED_ENTRY_ROUTE;
      navigate(redirectTo, { replace: true });
    }
  }, [session.status, navigate, searchParams]);

  const handleSignIn = async (
    email: string,
    password: string,
    rememberMe: boolean
  ) => {
    clearError();
    try {
      const result = await signIn({ email, password, rememberMe });
      // Phase 10.3 — a challenge means the password was correct but the
      // account requires a second factor. No session exists yet, so the
      // navigation effect above will not fire; the code step below takes
      // over instead.
      if (result) {
        setChallenge(result);
      }
      // Otherwise navigation happens automatically via the effect above.
    } catch {
      // Error is already set by useSignIn
    }
  };

  const handleVerify = async (input: {
    token?: string;
    recoveryCode?: string;
  }) => {
    if (!challenge) return;
    clearError();
    try {
      await completeTwoFactor({ challengeId: challenge.challengeId, ...input });
      // Session now exists — the effect above navigates.
    } catch {
      // Error is already set by useSignIn; the user can retry with a new
      // code without starting the whole sign-in over.
    }
  };

  if (session.status === 'authenticated') {
    return <></>;
  }

  return (
    <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-pill bg-primary text-primary-foreground">
            <LogIn className="size-6" strokeWidth={2} aria-hidden />
          </div>
          <PageHeader
            titleKey="auth:signIn.title"
            descriptionKey="auth:signIn.subtitle"
            values={{ product: t('common:product.name') }}
            className="mt-6"
          />
        </div>

        {challenge ? (
          <TwoFactorChallengeForm
            onSubmit={handleVerify}
            onCancel={() => {
              // Abandoning the challenge returns to the password step.
              // The challenge itself simply expires server-side.
              setChallenge(null);
              clearError();
            }}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <SignInForm
            onSubmit={handleSignIn}
            isLoading={isLoading}
            error={error}
          />
        )}

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            {t('auth:signIn.noAccount')}{' '}
          </span>
          <Link
            to={AUTH_ROUTES.register}
            className="font-medium text-primary hover:underline"
          >
            {t('auth:signIn.signUp')}
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
