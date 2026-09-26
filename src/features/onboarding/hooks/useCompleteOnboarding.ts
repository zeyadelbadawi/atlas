/**
 * useCompleteOnboarding hook.
 *
 * "Finish" and "Finish for now" — `POST /organizations/:id/onboarding/complete`.
 *
 * THE SESSION MUST LEARN ABOUT IT. `onboardingPending` lives on the
 * session user's memberships and is only ever computed by the server, so
 * after the write the session is re-read (`refreshSession`: token refresh
 * + `GET /users/me`). Without that, the stale `onboardingPending: true`
 * would make `/dashboard` send the owner straight back here. The caller
 * awaits `mutateAsync` and navigates only afterwards.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useAuth } from '@/shared/hooks';
import { onboardingKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  CompleteOnboardingRequest,
  OnboardingStatusResponse,
} from '@types';
import { onboardingService } from '../services/OnboardingService';

export function useCompleteOnboarding() {
  const { organization, refreshSession } = useAuth();
  const queryClient = useQueryClient();

  return useApiMutation<
    OnboardingStatusResponse,
    CompleteOnboardingRequest['mode'],
    ApiError
  >({
    mutationFn: (mode) => onboardingService.complete(organization!.id, { mode }),
    onSuccess: async (status) => {
      queryClient.setQueryData(onboardingKeys.status(status.organizationId), status);
      // Awaited: `mutateAsync` resolves only once the session reflects the
      // completion, so the navigation that follows cannot bounce.
      await refreshSession();
    },
    showSuccessToast: false,
    showErrorToast: false,
  });
}
