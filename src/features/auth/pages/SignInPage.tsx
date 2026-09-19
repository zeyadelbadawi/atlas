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
import type { RefusedSignInAcademy, TwoFactorChallenge } from '@types';
import type { ApiError } from '@api';
import {
  AUTHENTICATED_ENTRY_ROUTE,
  AUTH_ROUTES,
} from '@app/routes/route-paths';
import { PageContainer, PageHeader } from '@components/layout';
import { SignInForm } from '../components/SignInForm';
import { StudentSignInRefusal } from '../components/StudentSignInRefusal';
import {
  AUTH_ERROR_KEYS,
  readRefusedAcademies,
} from '../utils/academy-surface.utils';

/**
 * P64 Phase 1 (AD-5) — this page is Atlas's own sign-in, so every sign-in
 * it makes is for the MANAGEMENT surface. A learner is refused here by the
 * backend and shown the way to their academy website instead.
 */
const SURFACE = 'management' as const;

export default function SignInPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { signIn, completeTwoFactor, isLoading, error, clearError } =
    useSignIn();
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  // The academies a refused learner can sign in to; `null` while the form
  // is the thing on screen.
  const [refusedAcademies, setRefusedAcademies] = useState<
    readonly RefusedSignInAcademy[] | null
  >(null);

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
      const result = await signIn({
        email,
        password,
        rememberMe,
        surface: SURFACE,
      });
      // Phase 10.3 — a challenge means the password was correct but the
      // account requires a second factor. No session exists yet, so the
      // navigation effect above will not fire; the code step below takes
      // over instead.
      if (result) {
        setChallenge(result);
      }
      // Otherwise navigation happens automatically via the effect above.
    } catch (caught) {
      // Error is already set by useSignIn. One failure is not an error to
      // retry but an answer: the password was right and the account is a
      // learner, who has no management session to be given (AD-5). That
      // gets its own screen, with the academies the backend named.
      const apiError = caught as ApiError;
      if (apiError?.messageKey === AUTH_ERROR_KEYS.studentUseAcademySignIn) {
        clearError();
        setRefusedAcademies(readRefusedAcademies(apiError));
      }
    }
  };

  const handleVerify = async (input: {
    token?: string;
    recoveryCode?: string;
  }) => {
    if (!challenge) return;
    clearError();
    try {
      await completeTwoFactor({
        challengeId: challenge.challengeId,
        ...input,
        // The same surface the sign-in was for — the challenge id alone
        // does not remember it, and the backend mints the session here.
        surface: SURFACE,
      });
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

        {refusedAcademies ? (
          <StudentSignInRefusal
            academies={refusedAcademies}
            onBack={() => {
              setRefusedAcademies(null);
              clearError();
            }}
          />
        ) : challenge ? (
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

        {refusedAcademies ? null : (
          <div className="space-y-1 text-center text-sm">
            <div>
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
            {/* D2 — students never sign in here; say so before they try. */}
            <p className="text-xs text-muted-foreground">
              {t('auth:signIn.studentHint')}
            </p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
