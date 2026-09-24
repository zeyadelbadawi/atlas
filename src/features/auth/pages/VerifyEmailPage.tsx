/**
 * Email verification on the MANAGEMENT host (P64 Communications C0).
 *
 * The academy hosts have had `/verify-email` since Phase 10.1; the
 * platform host never did, so a verification link had nowhere to land for
 * an owner or staff member. Same contract as the academy page: the token
 * comes from `?token=`, is submitted once, and the three honest states are
 * verifying / verified / failed (no token counts as failed).
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { ErrorState } from '@components/feedback';
import { PageContainer } from '@components/layout';
import { AUTH_ROUTES } from '@app/routes/route-paths';
import { useVerifyEmail } from '../hooks';

export default function VerifyEmailPage(): JSX.Element {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const verifyEmail = useVerifyEmail();
  const { mutate } = verifyEmail;
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;
    mutate({ token });
  }, [token, mutate]);

  const signIn = (
    <Link
      to={AUTH_ROUTES.signIn}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {t('auth:verifyEmail.goToSignIn')}
    </Link>
  );

  const shell = (body: JSX.Element) => (
    <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="w-full max-w-md">{body}</div>
    </PageContainer>
  );

  if (!token || verifyEmail.isError) {
    return shell(
      <div className="space-y-4" data-testid="verify-email-error">
        <h1 className="text-2xl font-semibold text-foreground">
          {t('auth:verifyEmail.title')}
        </h1>
        <ErrorState
          kind={verifyEmail.error?.kind ?? 'validation'}
          titleKey="auth:verifyEmail.errorTitle"
          descriptionKey="auth:verifyEmail.errorDescription"
          requestId={verifyEmail.error?.requestId}
        />
        <p className="text-center text-sm">{signIn}</p>
      </div>,
    );
  }

  if (verifyEmail.isSuccess) {
    return shell(
      <div
        className="flex flex-col items-center gap-3 text-center"
        data-testid="verify-email-success"
      >
        <CheckCircle2 className="size-8 text-primary" aria-hidden />
        <h1 className="text-2xl font-semibold text-foreground">
          {t('auth:verifyEmail.successTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth:verifyEmail.successDescription')}
        </p>
        {signIn}
      </div>,
    );
  }

  return shell(
    <div
      className="flex items-center justify-center gap-3 text-sm text-muted-foreground"
      role="status"
      data-testid="verify-email-pending"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {t('auth:verifyEmail.verifying')}
    </div>,
  );
}
