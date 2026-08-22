/**
 * useRemoveCustomDomain hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { domainKeys } from '@services/query';
import type { ApiError } from '@api';
import type { AcademyDomainConfiguration } from '@types';
import { domainService } from '../services/DomainService';

export function useRemoveCustomDomain() {
  const { invalidate } = useInvalidate();

  return useApiMutation<AcademyDomainConfiguration, string, ApiError>({
    mutationFn: (academyId) => domainService.removeCustomDomain(academyId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, academyId) => {
      await invalidate(domainKeys.configuration(academyId));
    },
  });
}
