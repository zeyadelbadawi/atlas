/**
 * The retired academy onboarding wizard's address.
 *
 * `/dashboard/academy/:academyId/onboarding` used to render a client-side
 * checklist whose progress lived in `localStorage` — so it disagreed with
 * the server, with other browsers, and with the owner's actual academy.
 * New Customer Onboarding replaced it with one server-driven setup shell.
 * Old links (bookmarks, emails, history) still arrive here, and are
 * forwarded rather than 404'd:
 *
 *   - the owner of an organization whose setup is still open → `/onboarding`,
 *     which resumes at the next open step;
 *   - anyone else → that academy's overview, where they were headed anyway
 *     (W5: addressed by the URL, the single source of truth for the academy).
 *
 * `replace`, so the dead address never sits in history.
 */
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@hooks';
import { isOnboardingPendingForActiveOrganization } from '@utils';
import { DASHBOARD_ROUTES, ONBOARDING_ROUTES, buildPath } from './route-paths';

export function LegacyAcademyOnboardingRedirect(): JSX.Element {
  const { academyId } = useParams<{ academyId: string }>();
  const { user, organization } = useAuth();

  if (isOnboardingPendingForActiveOrganization(user, organization)) {
    return <Navigate to={ONBOARDING_ROUTES.root} replace />;
  }

  return (
    <Navigate
      to={
        academyId
          ? buildPath(DASHBOARD_ROUTES.academyOverview, { academyId })
          : DASHBOARD_ROUTES.academy
      }
      replace
    />
  );
}
