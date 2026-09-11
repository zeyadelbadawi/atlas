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
    const memberships = user?.organizations ?? [];

    // `activeOrganizationId` is only ever set by an explicit organization
    // SWITCH (`PlatformProvider` deliberately does not restore it on
    // mount), so it is undefined for every user who simply signed in and
    // never switched — which is every user with exactly one organization.
    // Falling back to their real primary membership (else their first) is
    // the same resolution `SessionService.selectPrimaryOrganization`
    // already uses, reused rather than reinvented; without it the
    // dashboard showed a "no workspace selected" empty state to an owner
    // who plainly had one (found in real production browser testing).
    const membership = activeOrganizationId
      ? memberships.find(
          (candidate) => candidate.organizationId === activeOrganizationId
        )
      : (memberships.find((candidate) => candidate.isPrimary) ??
        memberships[0]);

    const isOrganizationOwner =
      membership?.permissions.includes(ORGANIZATION_DASHBOARD_PERMISSION) ??
      false;

    if (membership && isOrganizationOwner) {
      return {
        kind: 'organization',
        organizationId: membership.organizationId,
      };
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
