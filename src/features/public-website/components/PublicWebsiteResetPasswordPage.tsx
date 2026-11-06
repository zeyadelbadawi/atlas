/**
 * `/reset-password?token=…` on an academy website (P64 Phase 1).
 *
 * The page an emailed reset link opens. The token is VALIDATED FIRST
 * (`POST /auth/password-reset/validate`): an expired or already-used link
 * says so before the visitor types a new password twice, rather than
 * after. On success the visitor is sent to THIS academy's own sign-in —
 * Atlas's `/auth/sign-in`, which `ResetPasswordForm` navigates to by
 * default, does not exist on this host.
 *
 * `setup=1` marks the account-setup link a learner gets when the academy
 * created their account (`academy.learner.invited`): same token and flow,
 * but every line says "set your password", never "reset".
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  ResetPasswordForm,
  useUrlCredentialToken,
  useValidatePasswordResetToken,
} from '@features/auth';
import { ErrorState } from '@components/feedback';
import { PublicWebsiteAuthShell } from './PublicWebsiteAuthShell';
import {
  usePublicWebsiteLinkRenderer,
  usePublicWebsiteHrefBuilder,
} from '../utils/public-website-link-renderer';
import type { PublicWebsiteLocale } from '@types';
import type { ApiError } from '@api';

/** A failed CHECK, as opposed to an answer about the link: asking again may work. */
const TRANSIENT_CHECK_FAILURES: ReadonlySet<ApiError['kind']> = new Set([
  'network',
  'timeout',
  'server',
  'rateLimited',
]);

export interface PublicWebsiteResetPasswordPageProps {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
}

export function PublicWebsiteResetPasswordPage({
  lookupKey,
  locale,
}: PublicWebsiteResetPasswordPageProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const buildHref = usePublicWebsiteHrefBuilder(locale);
  const linkRenderer = usePublicWebsiteLinkRenderer(locale);
  // Read once, then removed from the address bar (ATO review F12).
  const token = useUrlCredentialToken();
  const [searchParams] = useSearchParams();
  const isSetup = searchParams.get('setup') === '1';
  const copy = isSetup
    ? 'publicWebsite:auth.setPassword'
    : 'publicWebsite:auth.resetPassword';

  const validation = useValidatePasswordResetToken(token);
  // B9 (UX audit) V09 — a CHECK that failed (the server's fault, the
  // connection, a rate limit) is not an answer about the link: it says so
  // and offers Try again, as on the platform's own reset page. Only the
  // API's "not valid" reads "invalid or has expired".
  const checkFailureKind = validation.isError
    ? ((validation.error as ApiError | null)?.kind ?? 'unknown')
    : undefined;
  const checkFailed =
    !!token &&
    checkFailureKind !== undefined &&
    TRANSIENT_CHECK_FAILURES.has(checkFailureKind);
  // Any other failed validation request is treated as "not valid": showing
  // the form on a guess would only move the same failure to the submit
  // button, after the visitor has typed a password twice.
  const tokenValid: boolean | null = !token
    ? false
    : validation.isPending
      ? null
      : validation.data === true;

  return (
    <PublicWebsiteAuthShell
      lookupKey={lookupKey}
      locale={locale}
      path="/reset-password"
      title={t(`${copy}.title`)}
      subtitle={
        tokenValid === true
          ? t(`${copy}.subtitle`)
          : undefined
      }
    >
      {() => {
        if (checkFailed) {
          const error = validation.error as ApiError;
          return (
            <div data-testid="reset-password-check-failed">
              <ErrorState
                kind={error.kind}
                titleKey={`${copy}.checkFailedTitle`}
                descriptionKey={
                  error.kind === 'network' || error.kind === 'timeout'
                    ? 'publicWebsite:auth.linkCheck.network'
                    : error.kind === 'rateLimited'
                      ? 'publicWebsite:auth.linkCheck.rateLimited'
                      : 'publicWebsite:auth.linkCheck.server'
                }
                requestId={
                  error.kind === 'server' ? error.requestId : undefined
                }
                onRetry={
                  validation.isFetching
                    ? undefined
                    : () => void validation.refetch()
                }
                // Under the page's h1 (V19 heading order).
                headingLevel="h2"
              />
            </div>
          );
        }

        if (tokenValid === null) {
          return (
            <div
              className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground"
              data-testid="reset-password-checking"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t(`${copy}.checking`)}
            </div>
          );
        }

        if (tokenValid === false) {
          return (
            <div className="space-y-4" data-testid="reset-password-invalid">
              <ErrorState
                kind="validation"
                titleKey={`${copy}.invalidTitle`}
                descriptionKey={`${copy}.invalidDescription`}
                headingLevel="h2"
              />
              <div className="flex flex-col items-center gap-2 text-sm">
                {linkRenderer({
                  href: '/forgot-password',
                  external: false,
                  className:
                    'font-medium text-[var(--website-primary-solid)] hover:underline',
                  children: t(
                    `${copy}.requestNewLink`
                  ),
                })}
                {linkRenderer({
                  href: '/sign-in',
                  external: false,
                  className: 'text-muted-foreground hover:underline',
                  children: t(`${copy}.goToSignIn`),
                })}
              </div>
            </div>
          );
        }

        return (
          <ResetPasswordForm
            token={token as string}
            variant={isSetup ? 'setup' : 'reset'}
            onSuccess={() => navigate(buildHref('/sign-in'), { replace: true })}
          />
        );
      }}
    </PublicWebsiteAuthShell>
  );
}
