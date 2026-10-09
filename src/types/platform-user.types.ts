/**
 * Global User Directory types (Prompt 13).
 *
 * The Platform Owner's cross-tenant, read-only user directory — distinct
 * from `CurrentUser` (Prompt 1/2, the signed-in user's own profile).
 * Reuses `OrganizationMembership` (`identity.types.ts`) verbatim for
 * membership data rather than redeclaring it.
 *
 * Deliberately READ-ONLY and deliberately narrow: per the spec's own
 * caution ("Platform Owner user views must not expose unsupported
 * sensitive information" / "do not invent user-management mutations if
 * not supported"), this exposes account status, role/membership summary,
 * and coarse activity timestamps only — never credentials, tokens, raw
 * session data, or any field `CurrentUser` itself does not already
 * expose about a user to themselves.
 */
import type { OrganizationMembership } from './identity.types';

/**
 * A user account's platform-level status. An operational lifecycle concept,
 * not a permission/role — analogous to `AcademyStatus`/
 * `PlatformOrganizationStatus`.
 *
 * `deleted` was missing here until 26 Sep 2026, although the backend's
 * `UserAccountStatus` has carried it since Phase 10.6. A deleted account
 * therefore rendered an untranslated `platform:users.status.deleted` in the
 * directory and fell through the tone mapping to neutral. Irreversible, and
 * distinct from `suspended`, which an administrator can undo.
 */
export type PlatformUserAccountStatus =
  'active' | 'invited' | 'suspended' | 'deleted';

/** One row in the Platform Owner's user directory. */
export interface PlatformUserSummary {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly status: PlatformUserAccountStatus;
  readonly organizationCount: number;
  readonly createdAt: string;
  readonly lastSignInAt?: string;
  /** Phone number of an academy student (Platform Owner view only); `null` otherwise. */
  readonly phone?: { readonly e164: string; readonly country: string } | null;
}

/** The full detail view. `roles`/`permissions` are the same flat vocabulary `CurrentUser` already carries — see `rbac.types.ts` for why no richer `Role`/`Permission` entity exists yet. */
export interface PlatformUserDetail extends PlatformUserSummary {
  readonly roles: readonly string[];
  readonly organizationMemberships: readonly OrganizationMembership[];
}
