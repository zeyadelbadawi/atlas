/**
 * useSignupOptions hook.
 *
 * New Customer Onboarding — the public sign-up options, read only by the
 * management sign-up page (`enabled: false` everywhere else, so the
 * academy-host learner sign-up never asks). A failure is not an error the
 * visitor sees: the form simply falls back to today's account-only
 * sign-up, which is exactly what the backend does with the flag off.
 */
import { useApiQuery } from '@/shared/hooks';
import { onboardingKeys } from '@services/query';
import type { ApiError } from '@api';
import type { SignupOptionsResponse } from '@types';
import { signupOptionsService } from '../services/SignupOptionsService';

export function useSignupOptions(options: { readonly enabled?: boolean } = {}) {
  return useApiQuery<SignupOptionsResponse, ApiError>({
    queryKey: onboardingKeys.signupOptions(),
    queryFn: () => signupOptionsService.getSignupOptions(),
    enabled: options.enabled ?? true,
    // One attempt: while it is in flight the account fields are already
    // usable, and on failure the page quietly stays account-only.
    retry: false,
  });
}
