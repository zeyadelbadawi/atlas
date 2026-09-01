/**
 * Public Website Sign In Page (Phase 1, Extended Scope, Decision 11,
 * dependency C).
 *
 * A real, reachable Sign In page inside the Academy's own public website
 * — rendered inside the exact same branded shell (`WebsiteChrome`) every
 * other public page uses, reusing the exact same `SignInForm`/`useSignIn`
 * mechanism the internal app's own Sign In page already relies on (see
 * that hook's own doc comment: it is the ONLY path that actually
 * establishes a real session — token storage, `IdentityContext` update —
 * never a second, parallel auth mechanism).
 *
 * Deliberately does not attempt to navigate into `/dashboard` on success:
 * that route tree is not mounted here at all (`AppRouter`'s mode-switch
 * excludes it whenever the current hostname resolves to an Academy
 * website) — redirecting a signed-in student from an Academy's own
 * domain into the internal app's dashboard is a real, separate
 * cross-origin/SSO question this phase does not invent an answer to.
 * What this page guarantees is narrower and correct: signing in here
 * always authenticates against the session backing THIS Academy's own
 * identity — never a different Academy, never an Organization-level
 * fallback — because the backend account this credential belongs to
 * already carries its own real Academy membership (dependency D).
 */
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { useAuth, useSignIn } from '@hooks';
import { WebsiteChrome, resolvePagePath } from '@features/website';
import { SignInForm } from '@features/auth';
import { usePublicWebsiteData } from '../hooks/usePublicWebsiteData';
import { PublicWebsiteStatus } from './PublicWebsiteStatus';
import { usePublicWebsiteLinkRenderer } from '../utils/public-website-link-renderer';

export interface PublicWebsiteSignInPageProps {
  readonly lookupKey: string;
}

export function PublicWebsiteSignInPage({ lookupKey }: PublicWebsiteSignInPageProps): JSX.Element {
  const { t } = useTranslation();
  const data = usePublicWebsiteData(lookupKey);
  const { session } = useAuth();
  const { signIn, isLoading, error } = useSignIn();
  const linkRenderer = usePublicWebsiteLinkRenderer();

  if (data.status !== 'ready') {
    return <PublicWebsiteStatus state={data} />;
  }

  const { academy, configuration, pages } = data;

  const handleSubmit = async (email: string, password: string, rememberMe: boolean) => {
    try {
      await signIn({ email, password, rememberMe });
    } catch {
      // Error state is already surfaced by `useSignIn` — nothing further to do.
    }
  };

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
            {t('publicWebsite:auth.signIn.title', { academyName: academy.academyName })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('publicWebsite:auth.signIn.subtitle')}
          </p>
        </div>

        {session.status === 'authenticated' ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center">
            <CheckCircle2 className="size-8 text-[var(--website-primary-solid)]" aria-hidden />
            <p className="font-medium text-foreground">
              {t('publicWebsite:auth.signIn.success', { name: session.user?.name ?? '' })}
            </p>
          </div>
        ) : (
          <SignInForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
        )}

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">{t('publicWebsite:auth.signIn.noAccount')} </span>
          {linkRenderer({
            href: '/sign-up',
            external: false,
            className: 'font-medium text-[var(--website-primary-solid)] hover:underline',
            children: t('publicWebsite:auth.signIn.signUp'),
          })}
        </div>
      </div>
    </WebsiteChrome>
  );
}
