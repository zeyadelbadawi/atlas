/**
 * New Customer Onboarding — reading the session for setup routing.
 *
 * Shared rather than feature-local for the same reason as
 * `principal.utils.ts`: the consumers sit on both sides of the app —
 * `DashboardIndexRoute` and the legacy-route redirect in `src/app`, and
 * the onboarding, academy and provisioning features. A route reaching
 * into a feature is what the cross-feature import rule forbids.
 *
 * NONE OF THIS IS THE CONTROL. `onboardingPending` is computed by the
 * backend on every session read, and the onboarding API itself is
 * owner-only (403 for anyone else). These helpers only decide where the
 * product sends someone, never what they may do.
 */
import type {
  CurrentUser,
  OrganizationContext,
  OrganizationMembership,
} from '@types';

/**
 * The membership behind the ACTIVE organization — the one the session's
 * `organization` context points at — or `undefined` when there is none.
 * Matched by id rather than taking the primary membership, so an owner
 * who switched to another organization is judged by that one.
 */
export function findActiveMembership(
  user: Pick<CurrentUser, 'organizations'> | undefined | null,
  organization: Pick<OrganizationContext, 'id'> | undefined | null
): OrganizationMembership | undefined {
  if (!user || !organization) return undefined;
  return (user.organizations ?? []).find(
    (membership) => membership.organizationId === organization.id
  );
}

/** Whether the signed-in user OWNS the active organization. */
export function isActiveOrganizationOwner(
  user: Pick<CurrentUser, 'organizations'> | undefined | null,
  organization: Pick<OrganizationContext, 'id'> | undefined | null
): boolean {
  return findActiveMembership(user, organization)?.role === 'owner';
}

/**
 * Whether the active organization's owner still has setup open — the one
 * condition under which `/dashboard` hands over to `/onboarding`.
 * Strictly `=== true`: a session that predates the field is never routed.
 */
export function isOnboardingPendingForActiveOrganization(
  user: Pick<CurrentUser, 'organizations'> | undefined | null,
  organization: Pick<OrganizationContext, 'id'> | undefined | null
): boolean {
  const membership = findActiveMembership(user, organization);
  return membership?.role === 'owner' && membership.onboardingPending === true;
}

/**
 * Whether a `returnTo` value is a safe way back into the onboarding shell:
 * a same-site path under `/onboarding` and nothing else. Used by pages the
 * shell hands the owner to (checkout) to offer "Back to setup" without
 * becoming an open redirect.
 */
export function isOnboardingReturnPath(
  value: string | null | undefined
): value is string {
  if (!value) return false;
  if (value.startsWith('//') || value.includes('\\')) return false;
  return value === '/onboarding' || value.startsWith('/onboarding/') || value.startsWith('/onboarding?');
}
