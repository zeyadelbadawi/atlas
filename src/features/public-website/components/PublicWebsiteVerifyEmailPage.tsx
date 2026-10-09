/**
 * `/verify-email?token=…` on an academy website (P64 Phase 1).
 *
 * The landing page for the verification email a student receives after
 * registering on this academy's site (the backend builds that link on the
 * academy's own host). Shares `useVerifyEmailFlow` with the management
 * host's page: the token is read once and removed from the address bar,
 * the referrer policy is `no-referrer` while the page is open, the token
 * is submitted exactly once, and the page says what actually happened —
 * verified, invalid, expired, already used, rate limited or unreachable.
 *
 * A signed-in learner whose link is missing, invalid or expired can send
 * a new one from here; a signed-out one is sent to this academy's sign-in
 * and brought back (`returnTo`), where the same button is waiting.
 *
 * A live link opened without its account's session (ATO F1 follow-up) is
 * not spent: the learner is asked to sign in on this academy and brought
 * back, where the kept token is submitted again. Signed in as someone
 * else, the page says the link belongs to a different account and offers
 * to sign out.
 */
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, MailCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@hooks';
import { useVerifyEmailFlow, VerifyEmailResend } from '@features/auth';
import type { VerifyEmailState } from '@features/auth';
import { ErrorState } from '@components/feedback';
import { LEARNER_ROUTES } from '@app/routes/route-paths';
import { PublicWebsiteAuthShell } from './PublicWebsiteAuthShell';
import { usePublicWebsiteLinkRenderer } from '../utils/public-website-link-renderer';
import type { PublicWebsiteLocale } from '@types';

export interface PublicWebsiteVerifyEmailPageProps {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
}

const PAGE_PATH = '/verify-email';
const KEYS = 'publicWebsite:auth.verifyEmail';

const FAILURE_COPY: Record<
  Exclude<VerifyEmailState, 'pending' | 'success' | 'signInRequired'>,
  { readonly title: string; readonly description: string }
> = {
  missing: {
    title: `${KEYS}.invalidTitle`,
    description: `${KEYS}.missingDescription`,
  },
  invalid: {
    title: `${KEYS}.invalidTitle`,
    description: `${KEYS}.invalidDescription`,
  },
  expired: {
    title: `${KEYS}.expiredTitle`,
    description: `${KEYS}.expiredDescription`,
  },
  used: { title: `${KEYS}.usedTitle`, description: `${KEYS}.usedDescription` },
  rateLimited: {
    title: `${KEYS}.rateLimitedTitle`,
    description: `${KEYS}.rateLimitedDescription`,
  },
  network: {
    title: `${KEYS}.networkTitle`,
    description: `${KEYS}.networkDescription`,
  },
};

/** States a new link would fix. */
const RESENDABLE: ReadonlySet<VerifyEmailState> = new Set([
  'missing',
  'invalid',
  'expired',
]);

export function PublicWebsiteVerifyEmailPage({
  lookupKey,
  locale,
}: PublicWebsiteVerifyEmailPageProps): JSX.Element {
  const { t } = useTranslation();
  const { isAuthenticated, signOut } = useAuth();
  const linkRenderer = usePublicWebsiteLinkRenderer(locale);
  const { state, requestId, canRetry, retry, outcomeRef } =
    useVerifyEmailFlow();

  const linkClass =
    'font-medium text-[var(--website-primary-solid)] hover:underline';
  const signInLink = linkRenderer({
    // Bare path; the renderer applies the locale prefix. Sign-in brings
    // the learner back here, where a new link can be requested (or a kept
    // one is confirmed).
    href: `/sign-in?returnTo=${encodeURIComponent(PAGE_PATH)}`,
    external: false,
    className: linkClass,
    children: t(`${KEYS}.goToSignIn`),
  });
  const proceed = isAuthenticated
    ? linkRenderer({
        href: LEARNER_ROUTES.root,
        external: false,
        className: linkClass,
        children: t(`${KEYS}.continue`),
      })
    : signInLink;

  return (
    <PublicWebsiteAuthShell
      lookupKey={lookupKey}
      locale={locale}
      path={PAGE_PATH}
      title={t(`${KEYS}.title`)}
    >
      {() => {
        if (state === 'pending') {
          return (
            <div
              className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground"
              role="status"
              data-testid="verify-email-pending"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t(`${KEYS}.verifying`)}
            </div>
          );
        }

        if (state === 'success') {
          return (
            <div
              className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center"
              role="status"
              data-testid="verify-email-success"
            >
              <CheckCircle2
                className="size-8 text-[var(--website-primary-solid)]"
                aria-hidden
              />
              <p
                ref={outcomeRef}
                tabIndex={-1}
                className="font-medium text-foreground focus-visible:outline-none"
              >
                {t(`${KEYS}.successTitle`)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  isAuthenticated
                    ? `${KEYS}.successDescriptionSignedIn`
                    : `${KEYS}.successDescription`
                )}
              </p>
              {proceed}
            </div>
          );
        }

        // A live link that only its own account can confirm. Signed out:
        // sign in and come back (the token is kept). Signed in: the wrong
        // account.
        if (state === 'signInRequired') {
          return (
            <div
              className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-6 text-center"
              data-testid="verify-email-sign-in-required"
              data-account={isAuthenticated ? 'other' : 'none'}
            >
              <ShieldCheck
                className="size-8 text-[var(--website-primary-solid)]"
                aria-hidden
              />
              <p
                ref={outcomeRef}
                tabIndex={-1}
                className="font-medium text-foreground focus-visible:outline-none"
              >
                {t(
                  isAuthenticated
                    ? `${KEYS}.otherAccountTitle`
                    : `${KEYS}.signInRequiredTitle`
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  isAuthenticated
                    ? `${KEYS}.otherAccountDescription`
                    : `${KEYS}.signInRequiredDescription`
                )}
              </p>
              {isAuthenticated ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void signOut().catch(() => undefined)}
                >
                  {t(`${KEYS}.signOutToSwitch`)}
                </Button>
              ) : (
                signInLink
              )}
            </div>
          );
        }

        if (state === 'missing' && isAuthenticated) {
          return (
            <div
              className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-6 text-center"
              data-testid="verify-email-request"
            >
              <MailCheck
                className="size-8 text-[var(--website-primary-solid)]"
                aria-hidden
              />
              <p
                ref={outcomeRef}
                tabIndex={-1}
                className="text-sm text-muted-foreground focus-visible:outline-none"
              >
                {t(`${KEYS}.requestDescription`)}
              </p>
              <VerifyEmailResend keyPrefix={`${KEYS}.resend`} />
            </div>
          );
        }

        const copy = FAILURE_COPY[state];
        return (
          <div
            ref={outcomeRef}
            tabIndex={-1}
            className="space-y-4 focus-visible:outline-none"
            data-testid="verify-email-error"
            data-state={state}
          >
            <ErrorState
              kind={
                state === 'rateLimited' || state === 'network'
                  ? state
                  : 'validation'
              }
              titleKey={copy.title}
              descriptionKey={copy.description}
              requestId={state === 'network' ? requestId : undefined}
              onRetry={canRetry ? retry : undefined}
            />
            {RESENDABLE.has(state) ? (
              isAuthenticated ? (
                <VerifyEmailResend keyPrefix={`${KEYS}.resend`} />
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  {t(`${KEYS}.signInToResend`)} {signInLink}
                </p>
              )
            ) : (
              <div className="text-center text-sm">{proceed}</div>
            )}
          </div>
        );
      }}
    </PublicWebsiteAuthShell>
  );
}
