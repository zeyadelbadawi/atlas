/**
 * useAcademyDomain hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { domainKeys } from '@services/query';
import { domainService } from '../services/DomainService';
import type { AcademyDomainConfiguration } from '@types';
import type { ApiError } from '@api';

export function useAcademyDomain(academyId: string) {
  return useApiQuery<AcademyDomainConfiguration, ApiError>({
    queryKey: domainKeys.configuration(academyId),
    queryFn: () => domainService.getDomainConfiguration(academyId),
    enabled: !!academyId,
  });
}
