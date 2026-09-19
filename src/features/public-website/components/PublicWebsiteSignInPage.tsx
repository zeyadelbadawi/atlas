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
 *
 * Phase 6 — `locale` comes from `PublicWebsiteRouter`'s `/ar/...` prefix,
 * applies real `dir`/`lang` + the shared i18next instance's active
 * language (`usePublicWebsiteDocumentDirection`), and resolves the
 * Owner's optional heading-copy override (`authPages.signIn`, now
 * `LocalizedText`) to it.
 *
 * Locale-aware internal navigation goes through `usePublicWebsiteHrefBuilder`/
 * `usePublicWebsiteLinkRenderer` (`public-website-link-renderer.tsx`) —
 * see that file's own doc comment for the real "clicking a link while
 * browsing `/ar/...` silently returns English" bug this replaces a local
 * `withLocale` closure to fix.
 *
 * `SignInForm` is wrapped in `WebsiteBrandBridge` (`@features/website`) —
 * it's an ordinary dashboard component (predates any Academy website)
 * that reads Atlas's own generic `--primary` token, so without the
 * bridge its submit button rendered in Atlas's default accent color
 * instead of this Academy's real brand color even though the
 * surrounding `WebsiteChrome` was already correctly branded; see that
 * component's own doc comment for the full reasoning.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useAuth, useSignIn, useSignOut } from '@hooks';
import {
  WebsiteChrome,
  WebsiteBrandBridge,
  resolvePagePath,
  resolveLocalizedText,
  usePublicWebsiteDocumentDirection,
} from '@features/website';
import {
  SignInForm,
  TwoFactorChallengeForm,
  AUTH_ERROR_KEYS,
  isSafeReturnPath,
} from '@features/auth';
import type { TwoFactorChallenge } from '@types';
import { usePublicWebsiteData } from '../hooks/usePublicWebsiteData';
import { PublicWebsiteStatus } from './PublicWebsiteStatus';
import {
  usePublicWebsiteLinkRenderer,
  usePublicWebsiteHrefBuilder,
} from '../utils/public-website-link-renderer';
import { DEV_OVERRIDE_PARAM } from '../utils/hostname-resolution.utils';
import type { PublicWebsiteLocale } from '@types';

export interface PublicWebsiteSignInPageProps {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
}

export function PublicWebsiteSignInPage({
  lookupKey,
  locale,
}: PublicWebsiteSignInPageProps): JSX.Element {
  const { t } = useTranslation();
  usePublicWebsiteDocumentDirection(locale);
  const data = usePublicWebsiteData(lookupKey);
  const { session } = useAuth();
  const { signIn, completeTwoFactor, isLoading, error, clearError } =
    useSignIn();
  const { signOut } = useSignOut();
  // P64 Phase 1 — a correct password on an account with 2FA enabled
  // returns a CHALLENGE, not a session. Before this, the academy site
  // dropped the challenge on the floor: the form simply cleared and the
  // visitor stayed signed out with no error and no way forward.
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const linkRenderer = usePublicWebsiteLinkRenderer(locale);
  const buildHref = usePublicWebsiteHrefBuilder(locale);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Set by `PublicWebsiteLearningRoute` (and any other authenticated-only
  // public-website surface) redirecting an unauthenticated visitor here —
  // a real, on-site path within THIS Academy's own website only (never a
  // caller-supplied absolute URL/host), so signing in returns the visitor
  // to what they actually came here to do instead of stranding them on a
  // generic "you're signed in" card. Already bare/unprefixed — the
  // redirecting page builds it that way (see `PublicWebsiteLearningRoute`).
  const returnTo = searchParams.get('returnTo');

  // P64 Phase 1 — `returnTo` is checked with the shared `isSafeReturnPath`
  // (same-site relative path only, never `//host` or a scheme), and a
  // session with nowhere in particular to go now lands on `/my-learning`
  // instead of sitting on a "you're signed in" card. `startsWith('/')`
  // alone let `//evil.example` through, which is an absolute URL to
  // another origin as far as the browser is concerned.
  useEffect(() => {
    if (session.status !== 'authenticated') return;
    navigate(buildHref(isSafeReturnPath(returnTo) ? returnTo : '/my-learning'), {
      replace: true,
    });
  }, [session.status, returnTo, navigate, buildHref]);
  const authState =
    session.status === 'authenticated' && session.user
      ? {
          name: session.user.name,
          onSignOut: () => void signOut(),
          // Bare path — `linkRenderer`/`WebsiteHeader` apply the locale
          // prefix; pre-applying it here too would double it.
          myLearningHref: '/my-learning',
        }
      : undefined;

  if (data.status !== 'ready') {
    return <PublicWebsiteStatus state={data} />;
  }

  const { academy, configuration, pages } = data;

  // P64 Phase 1 (AD-5) — every sign-in from an academy website is for the
  // ACADEMY surface, carrying this host's own resolved academy id (from
  // the same trusted `resolveHostname` lookup every other public page
  // uses, never a client guess). The backend re-verifies that the id
  // belongs to the request host and refuses otherwise.
  const handleSubmit = async (
    email: string,
    password: string,
    rememberMe: boolean
  ) => {
    clearError();
    try {
      const result = await signIn({
        email,
        password,
        rememberMe,
        surface: 'academy',
        academyId: academy.academyId,
      });
      if (result) setChallenge(result);
      // Otherwise the session exists and the effect above navigates.
    } catch {
      // Error state is already surfaced by `useSignIn` — nothing further to do.
    }
  };

  const handleVerify = async (input: {
    token?: string;
    recoveryCode?: string;
  }) => {
    if (!challenge) return;
    clearError();
    try {
      await completeTwoFactor({
        challengeId: challenge.challengeId,
        ...input,
        // The ORIGINAL sign-in's surface — the challenge id alone does not
        // remember it, and the session is minted here.
        surface: 'academy',
        academyId: academy.academyId,
      });
    } catch {
      // Error is already set by `useSignIn`; the visitor can retry with a
      // fresh code.
    }
  };

  // `errors.auth.notAMemberOfAcademy` is the one sign-in failure with a
  // real next step that is not "try again": this academy does not accept
  // open sign-in joins, so the way in is its sign-up page.
  const showSignUpRecovery =
    error?.messageKey === AUTH_ERROR_KEYS.notAMemberOfAcademy;

  const onNavigate = (pageId: string) => {
    const target = pages.find((candidate) => candidate.id === pageId);
    const path = target ? resolvePagePath(target) : undefined;
    if (path) window.location.assign(buildHref(path));
  };

  const title =
    resolveLocalizedText(
      configuration.header.authPages?.signIn?.title,
      locale
    ) ||
    t('publicWebsite:auth.signIn.title', { academyName: academy.academyName });
  const subtitle =
    resolveLocalizedText(
      configuration.header.authPages?.signIn?.subtitle,
      locale
    ) || t('publicWebsite:auth.signIn.subtitle');

  return (
    <WebsiteChrome
      academyName={academy.academyName}
      academyLogo={academy.academyLogo}
      configuration={configuration}
      pages={pages}
      onNavigate={onNavigate}
      linkRenderer={linkRenderer}
      locale={locale}
      onLocaleChange={(target) => {
        const base = `${target === 'en' ? '' : '/ar'}/sign-in`;
        const devSlug = searchParams.get(DEV_OVERRIDE_PARAM);
        window.location.assign(
          devSlug
            ? `${base}?${DEV_OVERRIDE_PARAM}=${encodeURIComponent(devSlug)}`
            : base
        );
      }}
      authState={authState}
    >
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center px-4 py-16">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {session.status === 'authenticated' ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center">
            <CheckCircle2
              className="size-8 text-[var(--website-primary-solid)]"
              aria-hidden
            />
            <p className="font-medium text-foreground">
              {t('publicWebsite:auth.signIn.success', {
                name: session.user?.name ?? '',
              })}
            </p>
          </div>
        ) : challenge ? (
          <WebsiteBrandBridge>
            <TwoFactorChallengeForm
              onSubmit={(input) => void handleVerify(input)}
              onCancel={() => {
                setChallenge(null);
                clearError();
              }}
              isLoading={isLoading}
              error={error}
            />
          </WebsiteBrandBridge>
        ) : (
          <WebsiteBrandBridge>
            <SignInForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              error={error}
              // Atlas's own `/auth/forgot-password` is not mounted on an
              // academy host — this site has its own.
              forgotPasswordHref={buildHref('/forgot-password')}
            />
          </WebsiteBrandBridge>
        )}

        {showSignUpRecovery ? (
          <div className="mt-4 text-center text-sm">
            {linkRenderer({
              href: '/sign-up',
              external: false,
              className:
                'font-medium text-[var(--website-primary-solid)] hover:underline',
              children: t('publicWebsite:auth.signIn.notAMemberCta'),
            })}
          </div>
        ) : null}

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            {t('publicWebsite:auth.signIn.noAccount')}{' '}
          </span>
          {linkRenderer({
            href: '/sign-up',
            external: false,
            className:
              'font-medium text-[var(--website-primary-solid)] hover:underline',
            children: t('publicWebsite:auth.signIn.signUp'),
          })}
        </div>
      </div>
    </WebsiteChrome>
  );
}
