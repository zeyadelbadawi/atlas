/**
 * usePermissions hook.
 *
 * Provides permission checks for the current user. Returns functions that
 * evaluate whether the user has specific permissions.
 */
import { useCallback, useMemo } from 'react';
import { authorizationService } from '@services/identity';
import { useAuth } from './useAuth';

export interface UsePermissionsResult {
  /** Checks whether the user has a specific permission. */
  readonly hasPermission: (permission: string) => boolean;

  /** Checks whether the user has all required permissions. */
  readonly hasAllPermissions: (permissions: readonly string[]) => boolean;

  /** Checks whether the user has any of the required permissions. */
  readonly hasAnyPermission: (permissions: readonly string[]) => boolean;

  /** Checks whether the user can view a resource. */
  readonly canView: (resource: string) => boolean;

  /** Checks whether the user can edit a resource. */
  readonly canEdit: (resource: string) => boolean;

  /** Checks whether the user can delete a resource. */
  readonly canDelete: (resource: string) => boolean;

  /** Checks whether the user can manage a resource. */
  readonly canManage: (resource: string) => boolean;
}

export function usePermissions(): UsePermissionsResult {
  const { user, organization } = useAuth();

  const hasPermission = useCallback(
    (permission: string): boolean => {
      return authorizationService.hasPermission(user, permission, organization);
    },
    [user, organization]
  );

  const hasAllPermissions = useCallback(
    (permissions: readonly string[]): boolean => {
      const result = authorizationService.hasAllPermissions(
        user,
        permissions,
        organization
      );
      return result.hasPermission;
    },
    [user, organization]
  );

  const hasAnyPermission = useCallback(
    (permissions: readonly string[]): boolean => {
      return authorizationService.hasAnyPermission(
        user,
        permissions,
        organization
      );
    },
    [user, organization]
  );

  const canView = useCallback(
    (resource: string): boolean => {
      return authorizationService.canView(user, resource, organization);
    },
    [user, organization]
  );

  const canEdit = useCallback(
    (resource: string): boolean => {
      return authorizationService.canEdit(user, resource, organization);
    },
    [user, organization]
  );

  const canDelete = useCallback(
    (resource: string): boolean => {
      return authorizationService.canDelete(user, resource, organization);
    },
    [user, organization]
  );

  const canManage = useCallback(
    (resource: string): boolean => {
      return authorizationService.canManage(user, resource, organization);
    },
    [user, organization]
  );

  return useMemo(
    () => ({
      hasPermission,
      hasAllPermissions,
      hasAnyPermission,
      canView,
      canEdit,
      canDelete,
      canManage,
    }),
    [
      hasPermission,
      hasAllPermissions,
      hasAnyPermission,
      canView,
      canEdit,
      canDelete,
      canManage,
    ]
  );
}