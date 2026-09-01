/**
 * Route Guard.
 *
 * Protects routes by evaluating authentication and authorization requirements.
 * When a user lacks the required access, the guard either shows a fallback
 * (during restoration) or redirects to the appropriate entry point.
 */
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@hooks";
import {
  AUTH_ROUTES,
  AUTHENTICATED_ENTRY_ROUTE,
  SYSTEM_ROUTES,
} from "../route-paths";

export interface RouteGuardProps {
  readonly children: ReactNode;

  /** Whether this route requires authentication. */
  readonly requireAuthentication?: boolean;

  /** Permissions required to access this route. */
  readonly requiredPermissions?: readonly string[];

  /** Roles required to access this route. */
  readonly requiredRoles?: readonly string[];

  /** Fallback shown while restoring the session. */
  readonly pendingFallback?: ReactNode;
}

export function RouteGuard({
  children,
  requireAuthentication = false,
  requiredPermissions = [],
  requiredRoles = [],
  pendingFallback = null,
}: RouteGuardProps): JSX.Element {
  const location = useLocation();
  const { isAuthenticated, isRestoring, user, organization } = useAuth();

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
      return organization ? organization.permissions.includes(permission) : false;
    });

    if (!hasPermissions) {
      return <Navigate to={SYSTEM_ROUTES.forbidden} replace />;
    }
  }

  // Check required roles.
  // FAIL CLOSED: if roles are required but user is missing, deny access.
  if (requiredRoles.length > 0) {
    if (!user) {
      return <Navigate to={SYSTEM_ROUTES.forbidden} replace />;
    }

    const hasRoles = requiredRoles.every((role) => {
      if (organization) {
        return organization.role === role;
      }
      return user.roles.includes(role);
    });

    if (!hasRoles) {
      return <Navigate to={SYSTEM_ROUTES.forbidden} replace />;
    }
  }

  return <>{children}</>;
}
