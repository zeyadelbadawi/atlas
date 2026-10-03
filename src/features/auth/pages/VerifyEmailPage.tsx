/**
 * Email verification on the MANAGEMENT host (P64 Communications C0).
 *
 * The academy hosts have had `/verify-email` since Phase 10.1; the
 * platform host never did, so a verification link had nowhere to land for
 * an owner or staff member. Same contract as the academy page, both built
 * on `useVerifyEmailFlow`: the token comes from `?token=`, is removed from
 * the address bar, is submitted once, and the page states exactly what
 * happened — verified, invalid, expired, already used, rate limited or
 * unreachable. A reader who is signed in can send themselves a new link
 * from here; one who is not is sent to sign in and brought back.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { ErrorState } from '@components/feedback';
import { PageContainer } from '@components/layout';
import { useAuth } from '@hooks';
import {
  AUTHENTICATED_ENTRY_ROUTE,
  AUTH_ROUTES,
} from '@app/routes/route-paths';
import { useVerifyEmailFlow } from '../hooks';
import type { VerifyEmailState } from '../hooks';
import { VerifyEmailResend } from '../components/VerifyEmailResend';

/** Where sign-in returns to: this page, without the (already spent or cleaned) token. */
const SIGN_IN_AND_RETURN = `${AUTH_ROUTES.signIn}?redirect=${encodeURIComponent(
  AUTH_ROUTES.verifyEmail
)}`;

/** Failure states and their copy; `missing` is handled separately for a signed-in reader. */
const FAILURE_COPY: Record<
  Exclude<VerifyEmailState, 'pending' | 'success'>,
  { readonly title: string; readonly description: string }
> = {
  missing: {
    title: 'auth:verifyEmail.invalidTitle',
    description: 'auth:verifyEmail.missingDescription',
  },
  invalid: {
    title: 'auth:verifyEmail.invalidTitle',
    description: 'auth:verifyEmail.invalidDescription',
  },
  expired: {
    title: 'auth:verifyEmail.expiredTitle',
    description: 'auth:verifyEmail.expiredDescription',
  },
  used: {
    title: 'auth:verifyEmail.usedTitle',
    description: 'auth:verifyEmail.usedDescription',
  },
  rateLimited: {
    title: 'auth:verifyEmail.rateLimitedTitle',
    description: 'auth:verifyEmail.rateLimitedDescription',
  },
  network: {
    title: 'auth:verifyEmail.networkTitle',
    description: 'auth:verifyEmail.networkDescription',
  },
};

/** States a new link would fix. */
const RESENDABLE: ReadonlySet<VerifyEmailState> = new Set([
  'missing',
  'invalid',
  'expired',
]);

export default function VerifyEmailPage(): JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { state, requestId, canRetry, retry, outcomeRef } =
    useVerifyEmailFlow();

  const linkClass =
    'font-medium text-primary underline-offset-4 hover:underline';
  const signIn = (
    <Link to={SIGN_IN_AND_RETURN} className={linkClass}>
      {t('auth:verifyEmail.goToSignIn')}
    </Link>
  );
  const proceed = isAuthenticated ? (
    <Link to={AUTHENTICATED_ENTRY_ROUTE} className={linkClass}>
      {t('auth:verifyEmail.continue')}
    </Link>
  ) : (
    signIn
  );

  const shell = (body: JSX.Element) => (
    <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="w-full max-w-md">{body}</div>
    </PageContainer>
  );

  if (state === 'pending') {
    return shell(
      <div
        className="flex items-center justify-center gap-3 text-sm text-muted-foreground"
        role="status"
        data-testid="verify-email-pending"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {t('auth:verifyEmail.verifying')}
      </div>
    );
  }

  if (state === 'success') {
    return shell(
      <div
        className="flex flex-col items-center gap-3 text-center"
        role="status"
        data-testid="verify-email-success"
      >
        <CheckCircle2 className="size-8 text-primary" aria-hidden />
        <h1
          ref={outcomeRef}
          tabIndex={-1}
          className="text-2xl font-semibold text-foreground focus-visible:outline-none"
        >
          {t('auth:verifyEmail.successTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            isAuthenticated
              ? 'auth:verifyEmail.successDescriptionSignedIn'
              : 'auth:verifyEmail.successDescription'
          )}
        </p>
        {proceed}
      </div>
    );
  }

  // Opened without a link while signed in: not an error, just the place
  // to ask for one.
  if (state === 'missing' && isAuthenticated) {
    return shell(
      <div
        className="flex flex-col items-center gap-4 text-center"
        data-testid="verify-email-request"
      >
        <MailCheck className="size-8 text-primary" aria-hidden />
        <h1
          ref={outcomeRef}
          tabIndex={-1}
          className="text-2xl font-semibold text-foreground focus-visible:outline-none"
        >
          {t('auth:verifyEmail.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth:verifyEmail.requestDescription')}
        </p>
        <VerifyEmailResend keyPrefix="auth:verifyEmail.resend" />
      </div>
    );
  }

  const copy = FAILURE_COPY[state];
  return shell(
    <div
      ref={outcomeRef}
      tabIndex={-1}
      className="space-y-4 focus-visible:outline-none"
      data-testid="verify-email-error"
      data-state={state}
    >
      <h1 className="text-2xl font-semibold text-foreground">
        {t('auth:verifyEmail.title')}
      </h1>
      <ErrorState
        kind={
          state === 'rateLimited' || state === 'network' ? state : 'validation'
        }
        titleKey={copy.title}
        descriptionKey={copy.description}
        requestId={state === 'network' ? requestId : undefined}
        onRetry={canRetry ? retry : undefined}
      />
      {RESENDABLE.has(state) ? (
        isAuthenticated ? (
          <VerifyEmailResend keyPrefix="auth:verifyEmail.resend" />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {t('auth:verifyEmail.signInToResend')} {signIn}
          </p>
        )
      ) : (
        <p className="text-center text-sm">{proceed}</p>
      )}
    </div>
  );
}
