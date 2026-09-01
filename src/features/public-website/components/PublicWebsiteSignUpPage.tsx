/**
 * Public Website Sign Up Page (Phase 1, Extended Scope, Decision 11,
 * dependencies C and D).
 *
 * A real, reachable Sign Up page inside the Academy's own public website
 * — a separate page from Sign In (per the confirmed product requirement),
 * rendered inside the exact same branded shell every other public page
 * uses. Reuses `RegistrationForm` (the exact same component/mutation the
 * internal app's own registration page uses) with its new `academyId`
 * prop (dependency D) — this is the one real, concrete thing that makes
 * "Academy A's website registers into Academy A" true: the resolved
 * Academy's own id, from the SAME trusted `resolveHostname` lookup every
 * other public page already relies on, never a client-guessed or
 * Organization-level value.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { WebsiteChrome, resolvePagePath } from '@features/website';
import { RegistrationForm } from '@features/auth';
import { usePublicWebsiteData } from '../hooks/usePublicWebsiteData';
import { PublicWebsiteStatus } from './PublicWebsiteStatus';
import { usePublicWebsiteLinkRenderer } from '../utils/public-website-link-renderer';

export interface PublicWebsiteSignUpPageProps {
  readonly lookupKey: string;
}

export function PublicWebsiteSignUpPage({ lookupKey }: PublicWebsiteSignUpPageProps): JSX.Element {
  const { t } = useTranslation();
  const data = usePublicWebsiteData(lookupKey);
  const [registered, setRegistered] = useState(false);
  const linkRenderer = usePublicWebsiteLinkRenderer();

  if (data.status !== 'ready') {
    return <PublicWebsiteStatus state={data} />;
  }

  const { academy, configuration, pages } = data;

  const onNavigate = (pageId: string) => {
    const target = pages.find((candidate) => candidate.id === pageId);
    const path = target ? resolvePagePath(target) : undefined;
    if (path) window.location.assign(path);
  };

  return (
    <WebsiteChrome
      academyName={academy.academyName}
      academyLogo={academy.academyLogo}
      configuration={configuration}
      pages={pages}
      onNavigate={onNavigate}
      linkRenderer={linkRenderer}
    >
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center px-4 py-16">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t('publicWebsite:auth.signUp.title', { academyName: academy.academyName })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('publicWebsite:auth.signUp.subtitle', { academyName: academy.academyName })}
          </p>
        </div>

        {registered ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center">
            <CheckCircle2 className="size-8 text-[var(--website-primary-solid)]" aria-hidden />
            <p className="font-medium text-foreground">{t('publicWebsite:auth.signUp.success')}</p>
            {linkRenderer({
              href: '/sign-in',
              external: false,
              className: 'font-medium text-[var(--website-primary-solid)] hover:underline',
              children: t('publicWebsite:auth.signUp.goToSignIn'),
            })}
          </div>
        ) : (
          <>
            <RegistrationForm academyId={academy.academyId} onSuccess={() => setRegistered(true)} />
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">{t('publicWebsite:auth.signUp.hasAccount')} </span>
              {linkRenderer({
                href: '/sign-in',
                external: false,
                className: 'font-medium text-[var(--website-primary-solid)] hover:underline',
                children: t('publicWebsite:auth.signUp.signIn'),
              })}
            </div>
          </>
        )}
      </div>
    </WebsiteChrome>
  );
}
