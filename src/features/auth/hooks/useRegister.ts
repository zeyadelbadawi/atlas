/**
 * useRegister hook.
 *
 * Wraps `authenticationService.register` — `RegistrationForm` used to
 * fake-succeed via `setTimeout` (Prompt 3A).
 */
import { useApiMutation } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import { INLINE_ERRORS_META } from '@services/query';
import type { ApiError } from '@api';
import type { RegistrationRequest, RegistrationResult } from '@types';

export function useRegister() {
  return useApiMutation<RegistrationResult, RegistrationRequest, ApiError>({
    mutationFn: (request) => authenticationService.register(request),
    showSuccessToast: false,
    showErrorToast: false,
    // `RegistrationForm` renders every failure inline — and on an academy
    // website turns "this email is registered" into the join step, which a
    // global "try signing in instead" toast would contradict.
    meta: { [INLINE_ERRORS_META]: true },
  });
}
