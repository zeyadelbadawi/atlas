/**
 * The signed-in account's own phone number (docs/USER_PHONE.md). No user id
 * anywhere: the backend resolves the owner from the access token.
 *
 * NEVER OFFLINE. `userKeys.phone()` sits under the `user` root, which the
 * offline persistence allowlist does not include — the number is personal
 * data and is not written to the device. The cache is cleared at sign-out
 * with every other query.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { currentUserService } from '@services/identity';
import { INLINE_ERRORS_META, userKeys } from '@services/query';
import type { ApiError } from '@api';
import type { UpdatePhoneRequest, UserPhone } from '@types';

export const USER_PHONE_QUERY_KEY = userKeys.phone();

export function useUserPhone(options: { readonly enabled?: boolean } = {}) {
  return useApiQuery<UserPhone, ApiError>({
    queryKey: USER_PHONE_QUERY_KEY,
    queryFn: ({ signal }) => currentUserService.getPhone({ signal }),
    staleTime: 60_000,
    enabled: options.enabled ?? true,
    // Belt and braces with the allowlist: never persisted.
    meta: { persistOffline: false },
  });
}

/** Sets or replaces the number; the response replaces the cached value. Errors are shown by the form. */
export function useUpdatePhone() {
  const queryClient = useQueryClient();
  return useApiMutation<UserPhone, UpdatePhoneRequest, ApiError>({
    mutationFn: (input) => currentUserService.updatePhone(input),
    onSuccess: (data) => {
      queryClient.setQueryData(USER_PHONE_QUERY_KEY, data);
    },
    showSuccessToast: false,
    showErrorToast: false,
    meta: { [INLINE_ERRORS_META]: true },
  });
}

export function useRemovePhone() {
  const queryClient = useQueryClient();
  return useApiMutation<UserPhone, void, ApiError>({
    mutationFn: () => currentUserService.removePhone(),
    onSuccess: (data) => {
      queryClient.setQueryData(USER_PHONE_QUERY_KEY, data);
    },
    showSuccessToast: false,
    showErrorToast: false,
    meta: { [INLINE_ERRORS_META]: true },
  });
}
