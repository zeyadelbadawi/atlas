/**
 * Reset Password Page.
 *
 * Set new password after receiving reset link.
 */
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { AUTH_ROUTES } from '@app/routes/route-paths';
import { PageContainer, PageHeader } from '@components/layout';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { GoogleSignInOption } from '../google/GoogleSignInOption';
import { useValidatePasswordResetToken } from '../hooks';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ResetPasswordPage(): JSX.Element {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  /*
    `setup=1` marks a link from an account-setup email — somebody whose
    academy created the account for them. Same token, same endpoint, same
    rules; only the words change, because "Reset your password" is wrong
    for a person who has never had one and did not ask for this.
  */
  const isSetup = searchParams.get('setup') === '1';

  // P64 Phase 1 — a real check against `POST /auth/password-reset/validate`
  // (this used to accept any non-empty token and only find out on submit).
  // A failed validation request is treated as "not valid": showing the
  // form on a guess would only move the same failure to the submit button.
  const validation = useValidatePasswordResetToken(token);
  const tokenValid: boolean | null = !token
    ? false
    : validation.isPending
      ? null
      : validation.data === true;

  if (tokenValid === null) {
    return (
      <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t('common:actions.loading')}</p>
        </div>
      </PageContainer>
    );
  }

  if (tokenValid === false) {
    return (
      <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          <Alert variant="destructive">
            <AlertDescription>
              {t(
                isSetup
                  ? 'auth:setPassword.errors.invalidToken'
                  : 'auth:resetPassword.errors.invalidToken',
              )}
            </AlertDescription>
          </Alert>
          <div className="text-center">
            <Link
              to={AUTH_ROUTES.forgotPassword}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t(
                isSetup
                  ? 'auth:setPassword.requestNewLink'
                  : 'auth:resetPassword.requestNewLink',
              )}
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-pill bg-primary text-primary-foreground">
            <ShieldCheck className="size-6" strokeWidth={2} aria-hidden />
          </div>
          <PageHeader
            titleKey={
              isSetup ? 'auth:setPassword.title' : 'auth:resetPassword.title'
            }
            descriptionKey={
              isSetup ? 'auth:setPassword.subtitle' : 'auth:resetPassword.subtitle'
            }
            className="mt-6"
          />
        </div>

        {/* Google Identity — an account somebody created for this person
            can use Google instead of a password. Only on the setup link,
            never on a password reset (that person asked for a password). */}
        {isSetup ? (
          <GoogleSignInOption
            intent="setup"
            surface="management"
            setupToken={token!}
          />
        ) : null}

        <ResetPasswordForm token={token!} />
      </div>
    </PageContainer>
  );
}
