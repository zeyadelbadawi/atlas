/**
 * Keeps `usePlatform().activeAcademyId` honest OUTSIDE the academy scope.
 *
 * W5: inside `/dashboard/academy/:academyId/*` the URL is the only truth and
 * `AcademyScopeProvider` mirrors it — this hook stays out of the way there.
 * On every other dashboard screen the sidebar still needs an academy to
 * build its academy links from, so it is seeded from the "last academy"
 * preference (per user + organization) and reconciled against the
 * academies the server lists for the caller — which, since W5, are only
 * the academies they staff. A remembered id that is not among them
 * (another account's academy, one since archived, one whose access was
 * revoked) is replaced by the first reachable academy, or cleared.
 *
 * Mounted once, in the dashboard layout. With no active organization the
 * list query is disabled and this does nothing.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth, usePlatform } from '@hooks';
import { useAcademies } from './useAcademies';
import { reconcileActiveAcademy } from '../utils/active-academy.utils';
import { academyIdFromPath } from '../scope/academy-scope-path';
import { readLastAcademy } from '../scope/last-academy';

export function useActiveAcademyReconciliation(): void {
  const { activeAcademyId, setActiveAcademy } = usePlatform();
  const { user, organization } = useAuth();
  const { pathname } = useLocation();
  const urlAcademyId = academyIdFromPath(pathname);
  const { data } = useAcademies();
  const academies = data?.items;

  useEffect(() => {
    if (urlAcademyId) return;
    const remembered =
      activeAcademyId ??
      readLastAcademy({ userId: user?.id, organizationId: organization?.id });
    const next = reconcileActiveAcademy(remembered, academies);
    if (next.academyId !== activeAcademyId) {
      setActiveAcademy(next.academyId);
    }
  }, [
    urlAcademyId,
    activeAcademyId,
    academies,
    setActiveAcademy,
    user?.id,
    organization?.id,
  ]);
}
