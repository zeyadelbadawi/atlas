/**
 * Principal-kind predicates (P64 Phase 1, AD-4).
 *
 * Shared rather than feature-local because the two consumers sit on
 * opposite sides of the app: `@features/auth` (the refusal screen, the
 * academy chooser) and `src/app/routes/guards/RouteGuard` (the
 * `/dashboard/*` boundary). A guard reaching into a feature's internals
 * is exactly what the cross-feature import rule forbids, and hanging
 * these off the `@features/auth` barrel instead would pull every auth
 * PAGE into the guard's chunk — and therefore into every route in the
 * product.
 *
 * NONE OF THIS IS THE CONTROL. The backend refuses a learner a management
 * session at sign-in and refuses learner tokens on every management
 * controller (`ManagementSurfaceGuard`). These predicates only stop the
 * product from rendering a workspace the API would refuse anyway.
 */
import type { CurrentUser, PrincipalKind } from '@types';

/** Principal kinds allowed to hold a management (`/dashboard/*`) session. */
export const MANAGEMENT_PRINCIPAL_KINDS: readonly PrincipalKind[] = [
  'platform_owner',
  'staff',
  'unaffiliated',
];

/**
 * Whether this account may use the management dashboard at all.
 *
 * `principalKind` is read defensively: an account whose `/users/me`
 * predates the field (no kind at all) is NOT treated as a learner — the
 * backend refuses learner sessions at sign-in and learner tokens on every
 * management controller regardless, so the only thing at stake here is
 * not locking a staff member out over a missing field.
 */
export function isManagementPrincipal(
  user: Pick<CurrentUser, 'principalKind'> | undefined | null
): boolean {
  if (!user) return false;
  const kind = user.principalKind as PrincipalKind | undefined;
  return kind === undefined || MANAGEMENT_PRINCIPAL_KINDS.includes(kind);
}

/**
 * True only for an account the backend classified as a pure learner AND
 * for whom the backend says the management-surface refusal is actually in
 * force.
 *
 * The second half matters during the `surface.enforce` staged rollout
 * (master plan Phase 1 §T): while the rollout has not reached a learner,
 * the backend still issues them a management session and still answers
 * their management calls, so routing them to the academy chooser here
 * would strand them in a product the server was willing to serve.
 * `managementSurfaceEnforced` is the server's own answer, never a guess;
 * a response that predates the field is read as enforced, which matches
 * the finished system and errs toward the learner's own academy.
 */
export function isLearnerPrincipal(
  user:
    | Pick<CurrentUser, 'principalKind' | 'managementSurfaceEnforced'>
    | undefined
    | null
): boolean {
  if (user?.principalKind !== 'learner') return false;
  return user.managementSurfaceEnforced !== false;
}
