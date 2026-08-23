/**
 * Derives the caller's `EffectiveAccessSummary` from `CurrentUser` — a
 * pure projection, never a separate fetch. There is no RBAC catalog
 * endpoint to call (see `rbac.types.ts`); the only real source of truth
 * for "what can I do" is the already-authenticated `CurrentUser`.
 */
import type { CurrentUser, EffectiveAccessSummary } from '@types';

export function deriveEffectiveAccessSummary(user: CurrentUser): EffectiveAccessSummary {
  const globalRoles = user.roles.map((role) => ({ role, scope: 'global' as const }));
  const globalPermissions = user.permissions.map((permission) => ({
    permission,
    scope: 'global' as const,
  }));

  const orgRoles = user.organizationMemberships.map((membership) => ({
    role: membership.role,
    scope: 'organization' as const,
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
  }));

  const orgPermissions = user.organizationMemberships.flatMap((membership) =>
    membership.permissions.map((permission) => ({
      permission,
      scope: 'organization' as const,
      organizationId: membership.organizationId,
      organizationName: membership.organizationName,
    }))
  );

  return {
    roles: [...globalRoles, ...orgRoles],
    permissions: [...globalPermissions, ...orgPermissions],
  };
}
