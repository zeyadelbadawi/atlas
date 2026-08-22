/**
 * Sign In Hook.
 *
 * Provides sign-in functionality with error handling.
 */
import { useState, useCallback } from 'react';
import { authenticationService } from '@services/identity';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      await authenticationService.signIn(credentials);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

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