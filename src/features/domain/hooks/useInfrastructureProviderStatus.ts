/**
 * useInfrastructureProviderStatus hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { infrastructureKeys } from '@services/query';
import { infrastructureService } from '../services/InfrastructureService';
import type { InfrastructureProviderName, InfrastructureProviderStatus } from '@types';
import type { ApiError } from '@api';

export function useInfrastructureProviderStatus(provider: InfrastructureProviderName) {
  return useApiQuery<InfrastructureProviderStatus, ApiError>({
    queryKey: infrastructureKeys.providerStatus(provider),
    queryFn: () => infrastructureService.getProviderStatus(provider),
  });
}
