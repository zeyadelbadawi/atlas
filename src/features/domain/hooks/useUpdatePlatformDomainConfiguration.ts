/**
 * useUpdatePlatformDomainConfiguration hook.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { platformDomainKeys } from '@services/query';
import type { ApiError } from '@api';
import { platformDomainService } from '../services/PlatformDomainService';
import type { PlatformDomainConfiguration, UpdatePlatformDomainConfigurationPayload } from '@types';

export function useUpdatePlatformDomainConfiguration() {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    PlatformDomainConfiguration,
    UpdatePlatformDomainConfigurationPayload,
    ApiError
  >({
    mutationFn: (payload) => platformDomainService.updatePlatformDomainConfiguration(payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(platformDomainKeys.configuration());
    },
  });
}
