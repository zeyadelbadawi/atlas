/**
 * useRoles hook.
 *
 * Provides role checks for the current user.
 */
import { useCallback, useMemo } from 'react';
import { authorizationService } from '@services/identity';
import { useAuth } from './useAuth';

export interface UseRolesResult {
  /** Checks whether the user has a specific role. */
  readonly hasRole: (role: string) => boolean;

  /** Checks whether the user has all required roles. */
  readonly hasAllRoles: (roles: readonly string[]) => boolean;

  /** Checks whether the user has any of the required roles. */
  readonly hasAnyRole: (roles: readonly string[]) => boolean;
}

export function useRoles(): UseRolesResult {
  const { user, organization } = useAuth();

  const hasRole = useCallback(
    (role: string): boolean => {
      return authorizationService.hasRole(user, role, organization);
    },
    [user, organization]
  );

  const hasAllRoles = useCallback(
    (roles: readonly string[]): boolean => {
      const result = authorizationService.hasAllRoles(
        user,
        roles,
        organization
      );
      return result.hasRole;
    },
    [user, organization]
  );

  const hasAnyRole = useCallback(
    (roles: readonly string[]): boolean => {
      return authorizationService.hasAnyRole(user, roles, organization);
    },
    [user, organization]
  );

  return useMemo(
    () => ({
      hasRole,
      hasAllRoles,
      hasAnyRole,
    }),
    [hasRole, hasAllRoles, hasAnyRole]
  );
}