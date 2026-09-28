/**
 * Google Identity — the signed-in account's own sign-in methods
 * (`/users/me/sign-in-methods`). No user id anywhere: the backend resolves
 * the owner from the access token.
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import { authKeys } from '@services/query';
import type { ApiError } from '@api';
import type { SignInMethods } from '@types';

export const SIGN_IN_METHODS_QUERY_KEY = authKeys.signInMethods();

export function useSignInMethods() {
  return useApiQuery<SignInMethods, ApiError>({
    queryKey: SIGN_IN_METHODS_QUERY_KEY,
    queryFn: () => authenticationService.signInMethods(),
    staleTime: 30_000,
  });
}

/** Disconnects Google, re-proving the account with its password. Outcomes are shown by the card. */
export function useUnlinkGoogle() {
  const { invalidate } = useInvalidate();
  return useApiMutation<void, { readonly currentPassword: string }, ApiError>({
    mutationFn: ({ currentPassword }) =>
      authenticationService.unlinkGoogle(currentPassword),
    onSuccess: async () => {
      await invalidate(SIGN_IN_METHODS_QUERY_KEY);
    },
    showSuccessToast: false,
    showErrorToast: false,
  });
}
