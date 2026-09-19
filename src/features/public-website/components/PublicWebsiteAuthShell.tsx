/**
 * Public Website Auth Shell (P64 Phase 1).
 *
 * The chrome every SECONDARY academy-website auth page renders inside —
 * forgot password, reset password, verify email. Sign in and sign up keep
 * their own page components because both resolve Owner-authored heading
 * copy (`configuration.header.authPages`) that these three have no
 * equivalent of; everything else (fetch this academy's website data,
 * render the real `WebsiteChrome`, mirror the signed-in visitor's state,
 * switch locale without losing the dev-override param, bridge the brand
 * color onto the reused dashboard form components) is identical, and is
 * here exactly once.
 *
 * Why these pages exist at all: an academy website is a different origin
 * with its own session, and Atlas's own `/auth/*` tree is NOT mounted on
 * an academy host (`AppRouter` swaps the whole route tree). Before P64,
 * "Forgot password?" on an academy sign-in page pointed at
 * `/auth/forgot-password`, which on that host resolved to the CMS
 * catch-all — a student who forgot their password got a 404-shaped
 * "page not found" instead of a reset email, and an emailed reset link
 * could not be opened on the academy host at all.
 */
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  WebsiteChrome,
  WebsiteBrandBridge,
  resolvePagePath,
  usePublicWebsiteDocumentDirection,
} from '@features/website';
import { useAuth, useSignOut } from '@hooks';
import { usePublicWebsiteData } from '../hooks/usePublicWebsiteData';
import { PublicWebsiteStatus } from './PublicWebsiteStatus';
import {
  usePublicWebsiteLinkRenderer,
  usePublicWebsiteHrefBuilder,
} from '../utils/public-website-link-renderer';
import type { PublicWebsiteLocale } from '@types';

export interface PublicWebsiteAuthShellProps {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
  /** This page's own BARE path (e.g. `/forgot-password`) — the language switcher rebuilds the same page in the other locale from it. */
  readonly path: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly children: (context: {
    readonly academyId: string;
    readonly academyName: string;
  }) => ReactNode;
}

export function PublicWebsiteAuthShell({
  lookupKey,
  locale,
  path,
  title,
  subtitle,
  children,
}: PublicWebsiteAuthShellProps): JSX.Element {
  usePublicWebsiteDocumentDirection(locale);
  const data = usePublicWebsiteData(lookupKey);
  const { session } = useAuth();
  const { signOut } = useSignOut();
  const linkRenderer = usePublicWebsiteLinkRenderer(locale);
  const buildHref = usePublicWebsiteHrefBuilder(locale);
  const [searchParams] = useSearchParams();

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

  const onNavigate = (pageId: string) => {
    const target = pages.find((candidate) => candidate.id === pageId);
    const targetPath = target ? resolvePagePath(target) : undefined;
    if (targetPath) window.location.assign(buildHref(targetPath));
  };

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
        // The token/`returnTo` this page was opened with must survive a
        // language switch — a reset link opened in the wrong language and
        // then switched would otherwise arrive with no token at all.
        const preserved = new URLSearchParams(searchParams);
        const base = `${target === 'en' ? '' : '/ar'}${path}`;
        const query = preserved.toString();
        window.location.assign(query ? `${base}?${query}` : base);
      }}
      authState={authState}
    >
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center px-4 py-16">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        <WebsiteBrandBridge>
          {children({
            academyId: academy.academyId,
            academyName: academy.academyName,
          })}
        </WebsiteBrandBridge>
      </div>
    </WebsiteChrome>
  );
}
