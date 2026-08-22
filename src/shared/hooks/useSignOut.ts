/**
 * useSignOut hook.
 *
 * Provides a mutation-style interface for signing out.
 */
import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface UseSignOutResult {
  /** Signs out the current user. */
  readonly signOut: () => Promise<void>;

  /** True while the sign-out request is in flight. */
  readonly isLoading: boolean;
}

export function useSignOut(): UseSignOutResult {
  const { signOut: signOutFromContext } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const signOut = useCallback(async () => {
    setIsLoading(true);

    try {
      await signOutFromContext();
    } finally {
      setIsLoading(false);
    }
  }, [signOutFromContext]);

  return {
    signOut,
    isLoading,
  };
}