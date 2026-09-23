/**
 * Public Website Guest Route (Issue B).
 *
 * The route-level counterpart to `PublicWebsiteLearningRoute`: where that
 * guard sends an UNauthenticated visitor away from the learner surface to
 * Sign In, this one sends an already-AUTHENTICATED visitor away from the
 * credential-entry routes (Sign In / Sign Up) to where an authenticated
 * learner belongs — this Academy's own learner dashboard, or the safe
 * `returnTo` they arrived with.
 *
 * It wraps the `sign-in` and `sign-up` routes in `PublicWebsiteRouter`, so
 * the redirect happens during render (via `<Navigate replace>`), before
 * the auth page mounts. That makes it deterministic for every way the
 * route can be reached — a directly typed URL, a refresh, back/forward, an
 * in-app link — rather than a link the UI merely hides, and it holds even
 * if a page-level effect is skipped. The backend remains the authority on
 * every request regardless of what the client renders; this is the
 * client-side routing half of that same rule.
 *
 * Deliberately NOT applied to `forgot-password`, `reset-password` or
 * `verify-email`: those are account-recovery / verification surfaces
 * reached from an emailed link and must keep working whatever the current
 * session is. Only the two routes that exist to START a new session are
 * guarded — the same set the issue names (sign-in / sign-up / login /
 * register / create-account are all "get a session" entry points).
 *
 * An unauthenticated invitee opening an invitation Sign Up link is passed
 * straight through (only an authenticated session is redirected), so
 * invitation redemption and first-time account creation are untouched.
 */
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@hooks';
import { isSafeReturnPath } from '@features/auth';
import { LEARNER_ROUTES } from '@app/routes/route-paths';
import { usePublicWebsiteHrefBuilder } from '../utils/public-website-link-renderer';
import type { PublicWebsiteLocale } from '@types';

export interface PublicWebsiteGuestRouteProps {
  readonly locale: PublicWebsiteLocale;
  readonly children: React.ReactNode;
}

export function PublicWebsiteGuestRoute({
  locale,
  children,
}: PublicWebsiteGuestRouteProps): JSX.Element {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const buildHref = usePublicWebsiteHrefBuilder(locale);

  // Only a fully-resolved authenticated session redirects. While the
  // session is still `restoring` (and, of course, when it is
  // `unauthenticated`) the auth page renders normally — an unauthenticated
  // visitor must always be able to reach Sign In / Sign Up.
  if (session.status === 'authenticated') {
    const returnTo = searchParams.get('returnTo');
    // `returnTo` is honoured only when it is a same-site relative path
    // (`isSafeReturnPath`), never a caller-supplied absolute URL / `//host`
    // — the same open-redirect guard the Sign In page's landing uses.
    return (
      <Navigate
        to={buildHref(
          isSafeReturnPath(returnTo) ? returnTo : LEARNER_ROUTES.root
        )}
        replace
      />
    );
  }

  return <>{children}</>;
}
