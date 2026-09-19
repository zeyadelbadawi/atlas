/**
 * `/forgot-password` on an academy website (P64 Phase 1).
 *
 * The academy-host counterpart of Atlas's own `/auth/forgot-password`,
 * which is NOT mounted on this host. Reuses `ForgotPasswordForm`
 * unmodified — the request is by email address alone, so there is nothing
 * academy-specific to pass; the academy identity in the reset email comes
 * from the request host, server-side.
 */
import { useTranslation } from 'react-i18next';
import { ForgotPasswordForm } from '@features/auth';
import { PublicWebsiteAuthShell } from './PublicWebsiteAuthShell';
import { usePublicWebsiteLinkRenderer } from '../utils/public-website-link-renderer';
import type { PublicWebsiteLocale } from '@types';

export interface PublicWebsiteForgotPasswordPageProps {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
}

export function PublicWebsiteForgotPasswordPage({
  lookupKey,
  locale,
}: PublicWebsiteForgotPasswordPageProps): JSX.Element {
  const { t } = useTranslation();
  const linkRenderer = usePublicWebsiteLinkRenderer(locale);

  return (
    <PublicWebsiteAuthShell
      lookupKey={lookupKey}
      locale={locale}
      path="/forgot-password"
      title={t('publicWebsite:auth.forgotPassword.title')}
      subtitle={undefined}
    >
      {({ academyName }) => (
        <div className="space-y-6">
          <p className="text-center text-sm text-muted-foreground">
            {t('publicWebsite:auth.forgotPassword.subtitle', { academyName })}
          </p>
          <ForgotPasswordForm />
          <div className="text-center text-sm">
            {linkRenderer({
              href: '/sign-in',
              external: false,
              className:
                'font-medium text-[var(--website-primary-solid)] hover:underline',
              children: t('publicWebsite:auth.forgotPassword.backToSignIn'),
            })}
          </div>
        </div>
      )}
    </PublicWebsiteAuthShell>
  );
}
