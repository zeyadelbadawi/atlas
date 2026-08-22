/**
 * useAddCustomDomain hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { domainKeys } from '@services/query';
import type { ApiError } from '@api';
import type { AcademyDomainConfiguration, AddCustomDomainPayload } from '@types';
import { domainService } from '../services/DomainService';

export interface AddCustomDomainVariables {
  readonly academyId: string;
  readonly payload: AddCustomDomainPayload;
}

export function useAddCustomDomain() {
  const { invalidate } = useInvalidate();

  return useApiMutation<AcademyDomainConfiguration, AddCustomDomainVariables, ApiError>({
    mutationFn: ({ academyId, payload }) => domainService.addCustomDomain(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, variables) => {
      await invalidate(domainKeys.configuration(variables.academyId));
    },
  });
}
