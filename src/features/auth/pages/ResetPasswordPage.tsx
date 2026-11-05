/**
 * Reset Password Page.
 *
 * Set new password after receiving reset link.
 *
 * B1 (UX audit, V10 / V37): a link that cannot be used — refused up front or
 * on submit — is one page state with a heading and the way on (request a
 * new link). A check that FAILED (server down, no connection) is not
 * reported as a dead link: it says what happened and offers a retry.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader } from '@components/layout';
import type { ApiError } from '@api';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { InvalidResetLink } from '../components/InvalidResetLink';
import { AuthFormAlert } from '../components/AuthFormAlert';
import { GoogleSignInOption } from '../google/GoogleSignInOption';
import { useValidatePasswordResetToken } from '../hooks';
import { useUrlCredentialToken } from '../hooks/useUrlCredentialToken';
import { useAuthFailureText } from '../utils/auth-error-text';

/** A failed CHECK, as opposed to an answer: asking again may work. */
const TRANSIENT_KINDS: ReadonlySet<ApiError['kind']> = new Set([
  'network',
  'timeout',
  'server',
  'rateLimited',
]);

export default function ResetPasswordPage(): JSX.Element {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  // Read once, then removed from the address bar (ATO review F12).
  const token = useUrlCredentialToken();
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
  const failureText = useAuthFailureText();
  // The link was refused on submit (expired while the person typed).
  const [refusedOnSubmit, setRefusedOnSubmit] = useState(false);
  const checkFailed =
    !!token &&
    validation.isError &&
    TRANSIENT_KINDS.has(
      (validation.error as ApiError | null)?.kind ?? 'unknown'
    );
  const tokenValid: boolean | null = !token
    ? false
    : validation.isPending
      ? null
      : validation.data === true;
  const variant = isSetup ? 'setup' : 'reset';

  if (checkFailed) {
    const error = validation.error as ApiError;
    return (
      <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div
          className="w-full max-w-md space-y-8"
          data-testid="reset-link-check-failed"
        >
          <div className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-pill bg-primary text-primary-foreground">
              <ShieldCheck className="size-6" strokeWidth={2} aria-hidden />
            </div>
            <PageHeader
              titleKey="auth:resetPassword.checkFailedTitle"
              className="mt-6"
            />
          </div>
          <AuthFormAlert
            message={failureText(error)}
            focusKey={error}
            requestId={error.kind === 'server' ? error.requestId : undefined}
          />
          <Button
            type="button"
            className="w-full"
            onClick={() => void validation.refetch()}
            disabled={validation.isFetching}
            aria-busy={validation.isFetching}
          >
            <RefreshCw className="me-2 size-4" aria-hidden />
            {t('common:actions.retry')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (tokenValid === null) {
    return (
      <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t('common:actions.loading')}</p>
        </div>
      </PageContainer>
    );
  }

  if (tokenValid === false || refusedOnSubmit) {
    return (
      <PageContainer className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <InvalidResetLink variant={variant} autoFocus={refusedOnSubmit} />
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
              isSetup
                ? 'auth:setPassword.subtitle'
                : 'auth:resetPassword.subtitle'
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

        <ResetPasswordForm
          token={token!}
          variant={variant}
          onInvalidToken={() => setRefusedOnSubmit(true)}
        />
      </div>
    </PageContainer>
  );
}
