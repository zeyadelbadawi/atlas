/**
 * useOnboardingStatus hook.
 *
 * The one read behind the onboarding shell AND the dashboard card, so the
 * two always agree. Enabled only for the OWNER of the active organization
 * (the endpoint is owner-only; asking as anyone else would only earn a
 * 403 per page load).
 *
 * Refetches on window focus — an owner who went to publish the website in
 * another tab comes back to a current screen — and polls while the server
 * is still working on something they are waiting for (provisioning, a
 * payment awaiting confirmation), stopping the moment it is not.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { onboardingKeys } from '@services/query';
import { isActiveOrganizationOwner } from '@utils';
import type { ApiError } from '@api';
import type { OnboardingStatusResponse } from '@types';
import { onboardingService } from '../services/OnboardingService';
import { ONBOARDING_STATUS_POLL_INTERVAL_MS } from '../constants/onboarding.constants';
import { isAwaitingServer } from '../utils/onboarding-status.utils';

export interface UseOnboardingStatusOptions {
  readonly enabled?: boolean;
}

export function useOnboardingStatus(options: UseOnboardingStatusOptions = {}) {
  const { user, organization } = useAuth();
  const isOwner = isActiveOrganizationOwner(user, organization);

  const query = useApiQuery<OnboardingStatusResponse, ApiError>({
    queryKey: onboardingKeys.status(organization?.id),
    queryFn: () => onboardingService.getStatus(organization!.id),
    enabled: (options.enabled ?? true) && isOwner && !!organization?.id,
    refetchOnWindowFocus: true,
    refetchInterval: (activeQuery) =>
      isAwaitingServer(activeQuery.state.data)
        ? ONBOARDING_STATUS_POLL_INTERVAL_MS
        : false,
  });

  return { ...query, isOwner };
}
