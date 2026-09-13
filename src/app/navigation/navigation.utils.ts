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
  /**
   * Phase 11 — whether the tenant currently holds a working entitlement
   * (an active plan or a live trial). Items marked `requiresEntitlement`
   * are hidden when this is false.
   *
   * OPTIONAL, AND UNDEFINED MEANS "DO NOT FILTER". While the lifecycle
   * read is still in flight the answer is genuinely unknown, and guessing
   * `false` would make the whole product area flicker out of the sidebar
   * and back in on every page load for a paying customer. Guessing `true`
   * is equally wrong in the other direction but costs only a moment of
   * over-showing, which the route guard and the API both catch anyway —
   * so undefined is treated as "not yet known, leave it alone".
   */
  readonly hasEntitlement?: boolean;
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
  const { isAuthenticated, user, organization, isFeatureEnabled, hasEntitlement } =
    context;

  /*
    Entitlement requirement (Phase 11).

    Hides gated PRODUCT areas from a customer with no plan, an ended trial
    or a lapsed subscription — while deliberately leaving every recovery
    path visible, because no item on the way out of that state carries
    this flag (see `NavigationItem.requiresEntitlement`).

    THIS IS NOT THE CONTROL. `RouteGuard` independently refuses the route
    and the API independently refuses the write; removing a link is only
    how the product stops advertising a locked door.

    `undefined` is not `false`: it means the lifecycle read has not
    answered yet, and filtering on a guess would flicker the sidebar.
  */
  if (item.requiresEntitlement && hasEntitlement === false) {
    return false;
  }

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
  // A permission is granted if EITHER the account's own base permissions
  // (e.g. `platform_owner`'s global grants, held regardless of any active
  // organization) OR the active organization's role-based permissions
  // include it — never one exclusively based on whether an organization
  // happens to be active. Matches the fix already applied to
  // `RouteGuard.tsx`'s equivalent check (see that file's own doc comment);
  // this was the same bug, independently present here too.
  if (item.requiredPermissions && item.requiredPermissions.length > 0) {
    if (!user) {
      return false;
    }

    const hasPermissions = item.requiredPermissions.every((permission) => {
      if (user.permissions.includes(permission)) {
        return true;
      }
      return organization
        ? organization.permissions.includes(permission)
        : false;
    });

    if (!hasPermissions) {
      return false;
    }
  }

  // Role requirement.
  // FAIL CLOSED: if roles are required but user is missing, hide item.
  // Same additive rule as permissions above: a global role (e.g.
  // `platform_owner`, which can never appear as an organization-scoped
  // role) must never be suppressed just because an organization context
  // also happens to be active.
  if (item.requiredRoles && item.requiredRoles.length > 0) {
    if (!user) {
      return false;
    }

    const hasRoles = item.requiredRoles.every((role) => {
      if (user.roles.includes(role)) {
        return true;
      }
      return organization ? organization.role === role : false;
    });

    if (!hasRoles) {
      return false;
    }
  }

  return true;
}
