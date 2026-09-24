/**
 * Trusted device hooks (P66).
 *
 * A trusted device is a browser the account chose to remember at an
 * email-code step ("Remember this device"). It is NOT a session: it is
 * not signed in and holds no token, it is merely allowed to skip the
 * emailed code until it expires. Forgetting one therefore signs nothing
 * out — the next sign-in from that browser simply asks for a code again.
 *
 * Like `useSessions`, there is no user-id parameter anywhere here: the
 * backend resolves the owner from the access token.
 */
import { useApiMutation, useApiQuery, useInvalidate } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import { authKeys } from '@services/query';
import type { ApiError } from '@api';
import type { TrustedDevice } from '@types';

export const TRUSTED_DEVICES_QUERY_KEY = authKeys.trustedDevices();

export function useTrustedDevices() {
  return useApiQuery<readonly TrustedDevice[], ApiError>({
    queryKey: TRUSTED_DEVICES_QUERY_KEY,
    queryFn: () => authenticationService.listTrustedDevices(),
    staleTime: 30_000,
  });
}

/** Forgets one remembered browser. Outcomes are surfaced inline by the card. */
export function useRevokeTrustedDevice() {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, { readonly deviceId: string }, ApiError>({
    mutationFn: ({ deviceId }) =>
      authenticationService.revokeTrustedDevice(deviceId),
    onSuccess: async () => {
      await invalidate(TRUSTED_DEVICES_QUERY_KEY);
    },
    showSuccessToast: false,
    showErrorToast: false,
  });
}

/** Forgets every remembered browser except this one. */
export function useRevokeOtherTrustedDevices() {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, void, ApiError>({
    mutationFn: () => authenticationService.revokeOtherTrustedDevices(),
    onSuccess: async () => {
      await invalidate(TRUSTED_DEVICES_QUERY_KEY);
    },
    showSuccessToast: false,
    showErrorToast: false,
  });
}
