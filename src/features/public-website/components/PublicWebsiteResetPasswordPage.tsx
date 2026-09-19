/**
 * `/reset-password?token=…` on an academy website (P64 Phase 1).
 *
 * The page an emailed reset link opens. The token is VALIDATED FIRST
 * (`POST /auth/password-reset/validate`): an expired or already-used link
 * says so before the visitor types a new password twice, rather than
 * after. On success the visitor is sent to THIS academy's own sign-in —
 * Atlas's `/auth/sign-in`, which `ResetPasswordForm` navigates to by
 * default, does not exist on this host.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  ResetPasswordForm,
  useValidatePasswordResetToken,
} from '@features/auth';
import { ErrorState } from '@components/feedback';
import { PublicWebsiteAuthShell } from './PublicWebsiteAuthShell';
import {
  usePublicWebsiteLinkRenderer,
  usePublicWebsiteHrefBuilder,
} from '../utils/public-website-link-renderer';
import type { PublicWebsiteLocale } from '@types';

export interface PublicWebsiteResetPasswordPageProps {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
}

export function PublicWebsiteResetPasswordPage({
  lookupKey,
  locale,
}: PublicWebsiteResetPasswordPageProps): JSX.Element {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const buildHref = usePublicWebsiteHrefBuilder(locale);
  const linkRenderer = usePublicWebsiteLinkRenderer(locale);
  const token = searchParams.get('token');

  const validation = useValidatePasswordResetToken(token);
  // A failed validation REQUEST is treated as "not valid": showing the
  // form on a guess would only move the same failure to the submit button,
  // after the visitor has typed a password twice.
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
      title={t('publicWebsite:auth.resetPassword.title')}
      subtitle={
        tokenValid === true
          ? t('publicWebsite:auth.resetPassword.subtitle')
          : undefined
      }
    >
      {() => {
        if (tokenValid === null) {
          return (
            <div
              className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground"
              data-testid="reset-password-checking"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t('publicWebsite:auth.resetPassword.checking')}
            </div>
          );
        }

        if (tokenValid === false) {
          return (
            <div className="space-y-4" data-testid="reset-password-invalid">
              <ErrorState
                kind="validation"
                titleKey="publicWebsite:auth.resetPassword.invalidTitle"
                descriptionKey="publicWebsite:auth.resetPassword.invalidDescription"
              />
              <div className="flex flex-col items-center gap-2 text-sm">
                {linkRenderer({
                  href: '/forgot-password',
                  external: false,
                  className:
                    'font-medium text-[var(--website-primary-solid)] hover:underline',
                  children: t(
                    'publicWebsite:auth.resetPassword.requestNewLink'
                  ),
                })}
                {linkRenderer({
                  href: '/sign-in',
                  external: false,
                  className: 'text-muted-foreground hover:underline',
                  children: t('publicWebsite:auth.resetPassword.goToSignIn'),
                })}
              </div>
            </div>
          );
        }

        return (
          <ResetPasswordForm
            token={token as string}
            onSuccess={() => navigate(buildHref('/sign-in'), { replace: true })}
          />
        );
      }}
    </PublicWebsiteAuthShell>
  );
}
