/**
 * useCurrentUser hook.
 *
 * Provides direct access to the authenticated user. Returns undefined when
 * the user is not signed in.
 */
import { useAuth } from './useAuth';
import type { CurrentUser } from '@types';

export function useCurrentUser(): CurrentUser | undefined {
  const { user } = useAuth();
  return user;
}