/**
 * Route Guard.
 *
 * Protects routes by evaluating authentication and authorization requirements.
 * When a user lacks the required access, the guard either shows a fallback
 * (during restoration) or redirects to the appropriate entry point.
 */
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@hooks';
import { useSubscriptionLifecycleState } from '@features/tenant';
// From `@utils`, not the `@features/auth` barrel: a guard must not reach
// into a feature (the cross-feature lint rule), and that barrel
// statically imports every auth page, which would pull them into the
// guard's chunk for every route in the product.
import { isLearnerPrincipal } from '@utils';
import {
  AUTH_ROUTES,
  AUTHENTICATED_ENTRY_ROUTE,
  SYSTEM_ROUTES,
} from '../route-paths';

export interface RouteGuardProps {
  readonly children: ReactNode;

  /** Whether this route requires authentication. */
  readonly requireAuthentication?: boolean;

  /** Permissions required to access this route. */
  readonly requiredPermissions?: readonly string[];

  /** Roles required to access this route. */
  readonly requiredRoles?: readonly string[];

  /**
   * Phase 11 — this route leads to gated product functionality that
   * requires a working entitlement (an active plan or a live trial).
   *
   * WHY THE ROUTE AND NOT ONLY THE SIDEBAR. Removing a link is UX; it is
   * not a control. Before this existed, a customer whose trial had ended
   * could type the URL of any "hidden" screen and it rendered — the page
   * shell, the empty tables, the forms — and only failed when a write was
   * finally attempted. The API was never actually exposed (the backend
   * interceptor refuses those mutations regardless), but the product
   * cheerfully showed a workspace that could not be used and gave no
   * explanation. This sends the customer to the dashboard, which is where
   * the real explanation and the recovery action live.
   */
  readonly requiresEntitlement?: boolean;

  /**
   * P64 Phase 1 (AD-4 / AD-5, finding F1) — this route belongs to the
   * MANAGEMENT surface, which a `learner` principal never gets to see.
   *
   * Set once, at the `/dashboard` subtree root, so every nested route —
   * `/dashboard/platform`, `/dashboard/organization/create`,
   * `/dashboard/settings`, a deep link typed by hand — is covered without
   * each declaring it. A learner is not 403'd (they did nothing wrong)
   * but sent to `/academy-chooser`, which lists the academy websites they
   * actually learn on. `staff`, `platform_owner` and `unaffiliated` (a
   * new account that has not created an organization yet) all pass.
   *
   * THIS IS NOT THE CONTROL. The backend refuses a learner a management
   * session at sign-in and refuses learner tokens on every management
   * controller (`ManagementSurfaceGuard`); this only stops the product
   * from rendering a workspace the API would refuse anyway — the same
   * relationship `requiresEntitlement` has to the entitlement interceptor.
   */
  readonly requireManagementPrincipal?: boolean;

  /** Fallback shown while restoring the session. */
  readonly pendingFallback?: ReactNode;
}

export function RouteGuard({
  children,
  requireAuthentication = false,
  requiredPermissions = [],
  requiredRoles = [],
  requiresEntitlement = false,
  requireManagementPrincipal = false,
  pendingFallback = null,
}: RouteGuardProps): JSX.Element {
  const location = useLocation();
  const { isAuthenticated, isRestoring, user, organization } = useAuth();
  // Only consulted for entitlement-gated routes, but hooks cannot be
  // called conditionally; the query itself is disabled without an
  // organization, so this costs nothing on the routes that ignore it.
  const { state: lifecycle, isLoading: isLifecycleLoading } =
    useSubscriptionLifecycleState();

  // Show fallback while session restoration is in progress.
  if (isRestoring) {
    return <>{pendingFallback}</>;
  }

  // If authentication is required but user is not signed in, redirect to sign-in.
  if (requireAuthentication && !isAuthenticated) {
    return (
      <Navigate to={AUTH_ROUTES.signIn} state={{ from: location }} replace />
    );
  }

  // If authentication is explicitly not required and user is signed in,
  // redirect to the authenticated entry point.
  if (requireAuthentication === false && isAuthenticated) {
    return <Navigate to={AUTHENTICATED_ENTRY_ROUTE} replace />;
  }

  // Management surface (P64 Phase 1) — see `requireManagementPrincipal`.
  // Evaluated before permissions/roles on purpose: a learner's own base
  // `student.*` permissions would otherwise let them through a
  // permission-gated learner route inside the dashboard.
  if (requireManagementPrincipal && isAuthenticated && isLearnerPrincipal(user)) {
    return <Navigate to={AUTH_ROUTES.academyChooser} replace />;
  }

  // Check required permissions.
  // FAIL CLOSED: if permissions are required but user is missing, deny access.
  if (requiredPermissions.length > 0) {
    if (!user) {
      return <Navigate to={SYSTEM_ROUTES.forbidden} replace />;
    }

    // A permission is granted if EITHER the account's own base permissions
    // (e.g. `student.*`, granted to every authenticated user regardless of
    // organization affiliation) OR the active organization's role-based
    // permissions include it. Previously this checked only one or the
    // other based on whether an organization happened to be set, which
    // meant any org-affiliated account (Owner/Manager/Instructor) who was
    // ALSO enrolled as a student in some course failed every `student.*`
    // check the moment an organization context was active, since no
    // organization permission set contains any `student.*` string. This
    // never grants an organization-scoped permission the user doesn't
    // already have — it only stops suppressing the user's own base
    // permissions while an organization context is present.
    const hasPermissions = requiredPermissions.every((permission) => {
      if (user.permissions.includes(permission)) {
        return true;
      }
      return organization
        ? organization.permissions.includes(permission)
        : false;
    });

    if (!hasPermissions) {
      return <Navigate to={SYSTEM_ROUTES.forbidden} replace />;
    }
  }

  // Check required roles.
  // FAIL CLOSED: if roles are required but user is missing, deny access.
  // A role is granted if EITHER the account's own global roles (e.g.
  // `platform_owner`, which can never appear as an organization-scoped
  // role) OR the active organization's own role matches. Previously this
  // checked only the organization's role whenever one was active, never
  // falling back to the user's own global roles — the same bug already
  // found and fixed for `requiredPermissions` just above (see that
  // block's own comment), left unfixed here. This meant a real Platform
  // Owner who also holds (or creates) any Organization membership — a
  // real, legitimate combination, not a corrupted account — lost every
  // `platform_owner`-gated route the moment that organization became
  // their active context, since `organization.role` is always
  // `owner`/`manager`/`instructor`, never `platform_owner`.
  if (requiredRoles.length > 0) {
    if (!user) {
      return <Navigate to={SYSTEM_ROUTES.forbidden} replace />;
    }

    const hasRoles = requiredRoles.every((role) => {
      if (user.roles.includes(role)) {
        return true;
      }
      return organization ? organization.role === role : false;
    });

    if (!hasRoles) {
      return <Navigate to={SYSTEM_ROUTES.forbidden} replace />;
    }
  }

  /*
    Entitlement requirement (Phase 11).

    Deliberately the LAST check, and deliberately not a 403. Being without
    a plan is not a permission failure — the customer is perfectly
    entitled to be here, they simply have nothing active yet — so sending
    them to `forbidden` would be both wrong and a dead end. The dashboard
    is where the lifecycle is explained and where "choose a plan" /
    "continue with <plan>" actually live, so that is where they go.

    Waits for a definite answer rather than guessing: redirecting a paying
    customer away from their own screens for the moment the read is in
    flight would be far worse than rendering a beat early, and the API
    refuses the writes either way.
  */
  if (requiresEntitlement && !isLifecycleLoading && lifecycle?.hasAccess === false) {
    return <Navigate to={AUTHENTICATED_ENTRY_ROUTE} replace />;
  }

  return <>{children}</>;
}
