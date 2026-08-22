/**
 * usePlatformDomainConfiguration hook.
 *
 * Seeded with `DEFAULT_PLATFORM_DOMAIN_CONFIGURATION` as `initialData`
 * (marked stale from the start) so the admin page renders immediately
 * rather than flashing a skeleton — the exact same idiom
 * `useTrialPolicy` established for `DEFAULT_TRIAL_POLICY`.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformDomainKeys } from '@services/query';
import { platformDomainService } from '../services/PlatformDomainService';
import { DEFAULT_PLATFORM_DOMAIN_CONFIGURATION } from '../constants/domain.constants';
import type { PlatformDomainConfiguration } from '@types';
import type { ApiError } from '@api';

export function usePlatformDomainConfiguration() {
  return useApiQuery<PlatformDomainConfiguration, ApiError>({
    queryKey: platformDomainKeys.configuration(),
    queryFn: () => platformDomainService.getPlatformDomainConfiguration(),
    initialData: DEFAULT_PLATFORM_DOMAIN_CONFIGURATION,
    initialDataUpdatedAt: 0,
  });
}
