import { useApiQuery } from '@/shared/hooks';
import { platformDomainKeys } from '@services/query';
import { platformDomainService } from '../services/PlatformDomainService';
import type { PlatformDomainReadiness } from '@types';
import type { ApiError } from '@api';

/** P63 — Platform Owner only; each call is a live round of provider checks and probes, so it is not refetched on every focus. */
export function usePlatformDomainReadiness() {
  return useApiQuery<PlatformDomainReadiness, ApiError>({
    queryKey: platformDomainKeys.readiness(),
    queryFn: () => platformDomainService.getReadiness(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
