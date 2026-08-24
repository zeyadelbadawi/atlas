/**
 * Sign In Hook.
 *
 * Provides sign-in functionality with loading/error state, delegating the
 * actual sign-in to `useAuth().signIn` — never to `authenticationService`
 * directly (see the fix history below). `AuthenticationService.signIn` only
 * calls the backend and returns the raw response; it never stores tokens
 * (`tokenService.store`) or updates `IdentityContext`'s session state
 * (`setSession`). Only `IdentityProvider`'s own `signIn` (exposed via
 * `useAuth()`) does the full `sessionService.signIn` → store tokens →
 * `setSession` sequence that `isAuthenticated` and every redirect
 * (`RouteGuard`, `SignInPage`'s own effect) actually depend on.
 *
 * Fix history: this hook previously called `authenticationService.signIn`
 * directly. The backend call succeeded (200, real tokens returned) but
 * nothing downstream ever ran — no token persisted to localStorage, no
 * session state update — so `isAuthenticated` stayed `false` forever and
 * the user remained stuck on the sign-in page after an apparently
 * successful sign-in (manual test `ORG-MANUAL-001`, see
 * `Reports/MANUAL_TEST_RUNBOOK.md`'s retest history for this test).
 */
import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { ApiError } from '@api';

export interface SignInCredentials {
  readonly email: string;
  readonly password: string;
  readonly rememberMe: boolean;
}

export interface UseSignInResult {
  readonly signIn: (credentials: SignInCredentials) => Promise<void>;
  readonly isLoading: boolean;
  readonly error: ApiError | null;
  readonly clearError: () => void;
}

/**
 * Hook for signing in users.
 *
 * Wraps the authentication service sign-in method with state management.
 */
export function useSignIn(): UseSignInResult {
  const { signIn: establishSession } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const signIn = useCallback(
    async (credentials: SignInCredentials) => {
      setIsLoading(true);
      setError(null);

      try {
        await establishSession(credentials);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError);
        throw apiError;
      } finally {
        setIsLoading(false);
      }
    },
    [establishSession],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signIn,
    isLoading,
    error,
    clearError,
  };
}