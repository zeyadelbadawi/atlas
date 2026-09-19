/**
 * `/verify-email?token=…` on an academy website (P64 Phase 1).
 *
 * The landing page for the verification email a new student receives
 * after registering on this academy's site. Fires once on arrival — the
 * token IS the credential, and the recipient is by definition not signed
 * in yet — then points them at this academy's own sign-in.
 *
 * The effect is guarded by a ref rather than by the mutation's own
 * `isIdle`: React 18's StrictMode double-invokes effects in development,
 * and a verification token is single-use, so the second call would report
 * "already used" for a link that had just worked.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useVerifyEmail } from '@features/auth';
import { ErrorState } from '@components/feedback';
import { PublicWebsiteAuthShell } from './PublicWebsiteAuthShell';
import { usePublicWebsiteLinkRenderer } from '../utils/public-website-link-renderer';
import type { PublicWebsiteLocale } from '@types';

export interface PublicWebsiteVerifyEmailPageProps {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
}

export function PublicWebsiteVerifyEmailPage({
  lookupKey,
  locale,
}: PublicWebsiteVerifyEmailPageProps): JSX.Element {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const linkRenderer = usePublicWebsiteLinkRenderer(locale);
  const token = searchParams.get('token');
  const verifyEmail = useVerifyEmail();

  const { mutate } = verifyEmail;
  const requested = useRef(false);
  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;
    mutate({ token });
  }, [token, mutate]);

  const signInLink = linkRenderer({
    href: '/sign-in',
    external: false,
    className:
      'font-medium text-[var(--website-primary-solid)] hover:underline',
    children: t('publicWebsite:auth.verifyEmail.goToSignIn'),
  });

  const failed = !token || verifyEmail.isError;

  return (
    <PublicWebsiteAuthShell
      lookupKey={lookupKey}
      locale={locale}
      path="/verify-email"
      title={t('publicWebsite:auth.verifyEmail.title')}
    >
      {() => {
        if (failed) {
          return (
            <div className="space-y-4" data-testid="verify-email-error">
              <ErrorState
                kind={verifyEmail.error?.kind ?? 'validation'}
                titleKey="publicWebsite:auth.verifyEmail.errorTitle"
                descriptionKey="publicWebsite:auth.verifyEmail.errorDescription"
                requestId={verifyEmail.error?.requestId}
              />
              <div className="text-center text-sm">{signInLink}</div>
            </div>
          );
        }

        if (verifyEmail.isSuccess) {
          return (
            <div
              className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center"
              data-testid="verify-email-success"
            >
              <CheckCircle2
                className="size-8 text-[var(--website-primary-solid)]"
                aria-hidden
              />
              <p className="font-medium text-foreground">
                {t('publicWebsite:auth.verifyEmail.successTitle')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('publicWebsite:auth.verifyEmail.successDescription')}
              </p>
              {signInLink}
            </div>
          );
        }

        return (
          <div
            className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground"
            data-testid="verify-email-pending"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t('publicWebsite:auth.verifyEmail.verifying')}
          </div>
        );
      }}
    </PublicWebsiteAuthShell>
  );
}
