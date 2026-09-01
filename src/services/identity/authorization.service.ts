/**
 * Authorization Service.
 *
 * Evaluates permissions, roles and policies. This service provides capability
 * checks that the UI and route guards use to enforce access control.
 */
import type {
  CurrentUser,
  OrganizationContext,
  AuthorizationRequest,
  AuthorizationResult,
  PermissionCheck,
  RoleCheck,
} from '@types';

export class AuthorizationService {
  /**
   * Checks whether a user has a specific permission.
   *
   * @param user The user to check.
   * @param permission Permission identifier.
   * @param organization Optional organization context.
   */
  public hasPermission(
    user: CurrentUser | undefined,
    permission: string,
    organization?: OrganizationContext
  ): boolean {
    if (!user) return false;

    // A permission is granted if EITHER the account's own base permissions
    // (e.g. `student.*`, granted to every authenticated user regardless of
    // organization affiliation) OR the active organization's role-based
    // permissions include it. Previously this checked only the
    // organization's permissions whenever one was active, never falling
    // back to the user's own — the same bug independently found and fixed
    // in `RouteGuard.tsx` (this service backs `usePermissions()`, used
    // across many feature pages, so the fix belongs here too, not only at
    // the route level).
    if (user.permissions.includes(permission)) {
      return true;
    }

    return organization ? organization.permissions.includes(permission) : false;
  }

  /**
   * Checks whether a user has all required permissions.
   *
   * @param user The user to check.
   * @param permissions Required permissions.
   * @param organization Optional organization context.
   */
  public hasAllPermissions(
    user: CurrentUser | undefined,
    permissions: readonly string[],
    organization?: OrganizationContext
  ): PermissionCheck {
    if (!user) {
      return { hasPermission: false, missingPermissions: [...permissions] };
    }

    const missing = permissions.filter(
      (permission) => !this.hasPermission(user, permission, organization)
    );

    return {
      hasPermission: missing.length === 0,
      missingPermissions: missing.length > 0 ? missing : undefined,
    };
  }

  /**
   * Checks whether a user has any of the required permissions.
   *
   * @param user The user to check.
   * @param permissions Required permissions.
   * @param organization Optional organization context.
   */
  public hasAnyPermission(
    user: CurrentUser | undefined,
    permissions: readonly string[],
    organization?: OrganizationContext
  ): boolean {
    if (!user) return false;

    return permissions.some((permission) =>
      this.hasPermission(user, permission, organization)
    );
  }

  /**
   * Checks whether a user has a specific role.
   *
   * @param user The user to check.
   * @param role Role identifier.
   * @param organization Optional organization context.
   */
  public hasRole(
    user: CurrentUser | undefined,
    role: string,
    organization?: OrganizationContext
  ): boolean {
    if (!user) return false;

    // Organization-scoped role check.
    if (organization) {
      return organization.role === role;
    }

    // Global role check.
    return user.roles.includes(role);
  }

  /**
   * Checks whether a user has all required roles.
   *
   * @param user The user to check.
   * @param roles Required roles.
   * @param organization Optional organization context.
   */
  public hasAllRoles(
    user: CurrentUser | undefined,
    roles: readonly string[],
    organization?: OrganizationContext
  ): RoleCheck {
    if (!user) {
      return { hasRole: false, missingRoles: [...roles] };
    }

    const missing = roles.filter(
      (role) => !this.hasRole(user, role, organization)
    );

    return {
      hasRole: missing.length === 0,
      missingRoles: missing.length > 0 ? missing : undefined,
    };
  }

  /**
   * Checks whether a user has any of the required roles.
   *
   * @param user The user to check.
   * @param roles Required roles.
   * @param organization Optional organization context.
   */
  public hasAnyRole(
    user: CurrentUser | undefined,
    roles: readonly string[],
    organization?: OrganizationContext
  ): boolean {
    if (!user) return false;

    return roles.some((role) => this.hasRole(user, role, organization));
  }

  /**
   * Evaluates an authorization policy.
   *
   * Future implementation will communicate with a policy service.
   * Current implementation delegates to permission checks.
   *
   * @param user The user to check.
   * @param request Authorization request.
   * @param organization Optional organization context.
   */
  public async evaluatePolicy(
    user: CurrentUser | undefined,
    request: AuthorizationRequest,
    organization?: OrganizationContext
  ): Promise<AuthorizationResult> {
    if (!user) {
      return { allowed: false, reason: 'unauthenticated' };
    }

    // Simple implementation: check if user has the action as a permission.
    const permission = `${request.resource}.${request.action}`;
    const allowed = this.hasPermission(user, permission, organization);

    return {
      allowed,
      reason: allowed ? undefined : 'insufficient_permissions',
    };
  }

  /**
   * Checks whether a user can view a resource.
   */
  public canView(
    user: CurrentUser | undefined,
    resource: string,
    organization?: OrganizationContext
  ): boolean {
    return this.hasPermission(user, `${resource}.view`, organization);
  }

  /**
   * Checks whether a user can edit a resource.
   */
  public canEdit(
    user: CurrentUser | undefined,
    resource: string,
    organization?: OrganizationContext
  ): boolean {
    return this.hasPermission(user, `${resource}.edit`, organization);
  }

  /**
   * Checks whether a user can delete a resource.
   */
  public canDelete(
    user: CurrentUser | undefined,
    resource: string,
    organization?: OrganizationContext
  ): boolean {
    return this.hasPermission(user, `${resource}.delete`, organization);
  }

  /**
   * Checks whether a user can manage a resource.
   */
  public canManage(
    user: CurrentUser | undefined,
    resource: string,
    organization?: OrganizationContext
  ): boolean {
    return this.hasPermission(user, `${resource}.manage`, organization);
  }
}

export const authorizationService = new AuthorizationService();