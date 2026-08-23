/**
 * RBAC (Roles & Permissions) types — Prompt 13.
 *
 * Atlas's authorization model (`authorization.service.ts`, Prompt 1) is a
 * FLAT STRING VOCABULARY: `CurrentUser.roles: readonly string[]` and
 * `CurrentUser.permissions: readonly string[]`, checked by membership
 * (`.includes(...)`), optionally narrowed to an `OrganizationMembership`.
 * There is no `Role` or `Permission` entity anywhere in the system — no
 * catalog, no description, no assignment mutation, no scope hierarchy
 * beyond "global" vs. "the caller's own membership in one organization."
 *
 * This file does NOT invent that entity model. It types the one thing
 * that genuinely exists and is genuinely inspectable: the CALLER'S OWN
 * effective grants, as already carried by `CurrentUser` /
 * `OrganizationMembership`. It introduces no new role or permission
 * *names* — every string surfaced through these types originates from
 * the same backend-issued `CurrentUser` the rest of the app already
 * trusts.
 *
 * UNRESOLVED RBAC BUSINESS RULES (documented per Prompt 13 §5D rather
 * than invented):
 *   1. There is no backend contract for a platform-wide Role/Permission
 *      CATALOG (e.g. "list every role that exists and what it grants").
 *   2. There is no backend contract for ROLE ASSIGNMENT (granting or
 *      revoking a role/permission for another user).
 *   3. There is no defined PERMISSION SCOPE hierarchy beyond "global" and
 *      "per-organization" — no academy-level or resource-level scope is
 *      specified.
 * Any UI that would require (1), (2), or (3) is out of scope until a
 * backend contract defines it — see `PlatformRolesPermissionsPage.tsx`'s
 * own documentation of this same boundary.
 */

/** Where one role/permission string was granted. */
export type RbacAssignmentScope = 'global' | 'organization';

/** One role, as effectively held by the caller — not a catalog entity. */
export interface EffectiveRoleAssignment {
  readonly role: string;
  readonly scope: RbacAssignmentScope;
  readonly organizationId?: string;
  readonly organizationName?: string;
}

/** One permission, as effectively held by the caller — not a catalog entity. */
export interface EffectivePermissionAssignment {
  readonly permission: string;
  readonly scope: RbacAssignmentScope;
  readonly organizationId?: string;
  readonly organizationName?: string;
}

/** The caller's complete effective RBAC view, derived from `CurrentUser` — never fetched separately. */
export interface EffectiveAccessSummary {
  readonly roles: readonly EffectiveRoleAssignment[];
  readonly permissions: readonly EffectivePermissionAssignment[];
}
