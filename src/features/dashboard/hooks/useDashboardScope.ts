/**
 * useDashboardScope (Phase 8).
 *
 * Resolves WHICH dashboard the signed-in user should be shown — the
 * Organization Owner's whole-organization view, or an Academy Manager's
 * single-academy view.
 *
 * The distinction is drawn from a REAL, already-existing permission, not
 * an invented rule and not a guess from the user's title: only an
 * Organization Owner holds `tenant.dashboard.view` (it is one of the
 * owner-exclusive `tenant.*` strings `ORGANIZATION_OWNER_PERMISSIONS`
 * adds on top of `ORGANIZATION_MANAGER_PERMISSIONS` — see that catalog's
 * own doc comment). A Manager deliberately never receives it.
 *
 * This is a presentation decision only. It selects which endpoint to
 * call; it is NEVER the security boundary. Both endpoints are
 * independently guarded server-side (`OrganizationMembershipGuard` /
 * `AcademyScopeGuard` plus RLS), so a user who reached the "wrong" one —
 * by a stale permission list, a hand-crafted request, or a bug here —
 * still gets only what the backend decides they may see.
 */
import { useMemo } from 'react';
import { usePlatform, useCurrentUser } from '@/shared/hooks';

const ORGANIZATION_DASHBOARD_PERMISSION = 'tenant.dashboard.view';

export type DashboardScopeSelection =
  | { readonly kind: 'organization'; readonly organizationId: string }
  | { readonly kind: 'academy'; readonly academyId: string }
  /** No organization/academy context resolved yet — the page renders its own honest empty state rather than calling an endpoint with an undefined id. */
  | { readonly kind: 'none' };

export function useDashboardScope(): DashboardScopeSelection {
  const user = useCurrentUser();
  const { activeOrganizationId, activeAcademyId } = usePlatform();

  return useMemo<DashboardScopeSelection>(() => {
    const membership = user?.organizations.find(
      (candidate) => candidate.organizationId === activeOrganizationId
    );
    const isOrganizationOwner =
      membership?.permissions.includes(ORGANIZATION_DASHBOARD_PERMISSION) ?? false;

    if (activeOrganizationId && isOrganizationOwner) {
      return { kind: 'organization', organizationId: activeOrganizationId };
    }
    if (activeAcademyId) {
      return { kind: 'academy', academyId: activeAcademyId };
    }
    // A member with an organization but no owner permission and no active
    // academy has no dashboard scope to read — honestly nothing, never a
    // silent fall back to the organization-wide view they are not
    // entitled to (the backend would refuse it anyway).
    return { kind: 'none' };
  }, [user, activeOrganizationId, activeAcademyId]);
}
