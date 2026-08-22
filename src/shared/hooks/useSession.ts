/**
 * useSession hook.
 *
 * Provides access to the current session state.
 */
import { useAuth } from './useAuth';
import type { Session } from '@types';

export function useSession(): Session {
  const { session } = useAuth();
  return session;
}