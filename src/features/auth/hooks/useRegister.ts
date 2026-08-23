/**
 * useRegister hook.
 *
 * Wraps `authenticationService.register` — `RegistrationForm` used to
 * fake-succeed via `setTimeout` (Prompt 3A).
 */
import { useApiMutation } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import type { ApiError } from '@api';
import type { RegistrationRequest } from '@types';

export function useRegister() {
  return useApiMutation<void, RegistrationRequest, ApiError>({
    mutationFn: (request) => authenticationService.register(request),
    showSuccessToast: false,
    showErrorToast: false,
  });
}
