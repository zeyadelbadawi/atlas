/**
 * Navigation utilities.
 *
 * Filters navigation items based on authentication, permissions, roles and
 * feature flags. Route guards remain responsible for actual authorization;
 * navigation filtering only affects visibility.
 */
import type { CurrentUser, OrganizationContext, NavigationItem } from '@types';

export interface NavigationFilterContext {
  readonly isAuthenticated: boolean;
  readonly user?: CurrentUser;
  readonly organization?: OrganizationContext;
  readonly isFeatureEnabled: (flagKey: string) => boolean;
}

/**
 * Filters navigation items based on the current context.
 *
 * @param items Navigation items to filter.
 * @param context Filter context.
 * @returns Filtered navigation items.
 */
export function filterNavigationItems(
  items: readonly NavigationItem[],
  context: NavigationFilterContext
): NavigationItem[] {
  return items
    .filter((item) => shouldShowNavigationItem(item, context))
    .map((item) => {
      if (!item.children || item.children.length === 0) {
        return item;
      }

      return {
        ...item,
        children: filterNavigationItems(item.children, context),
      };
    });
}

/**
 * Reports whether a navigation item should be shown.
 *
 * @param item The navigation item.
 * @param context Filter context.
 */
function shouldShowNavigationItem(
  item: NavigationItem,
  context: NavigationFilterContext
): boolean {
  const { isAuthenticated, user, organization, isFeatureEnabled } = context;

  // Authentication requirement.
  if (item.requiresAuth !== undefined) {
    if (item.requiresAuth && !isAuthenticated) {
      return false;
    }
    if (!item.requiresAuth && isAuthenticated) {
      return false;
    }
  }

  // Feature flag requirement.
  if (item.featureFlag && !isFeatureEnabled(item.featureFlag)) {
    return false;
  }

  // Permission requirement.
  // FAIL CLOSED: if permissions are required but user is missing, hide item.
  if (item.requiredPermissions && item.requiredPermissions.length > 0) {
    if (!user) {
      return false;
    }

    const hasPermissions = item.requiredPermissions.every((permission) => {
      if (organization) {
        return organization.permissions.includes(permission);
      }
      return user.permissions.includes(permission);
    });

    if (!hasPermissions) {
      return false;
    }
  }

  // Role requirement.
  // FAIL CLOSED: if roles are required but user is missing, hide item.
  if (item.requiredRoles && item.requiredRoles.length > 0) {
    if (!user) {
      return false;
    }

    const hasRoles = item.requiredRoles.every((role) => {
      if (organization) {
        return organization.role === role;
      }
      return user.roles.includes(role);
    });

    if (!hasRoles) {
      return false;
    }
  }

  return true;
}