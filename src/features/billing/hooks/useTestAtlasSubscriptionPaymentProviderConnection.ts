/**
 * useTestAtlasSubscriptionPaymentProviderConnection hook. Platform Owner
 * only. Not auto-retried — a connectivity check the Platform Owner
 * explicitly repeats on failure, never silently replayed.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { atlasSubscriptionPaymentProviderKeys } from '@services/query';
import type { ApiError } from '@api';
import type { AtlasSubscriptionPaymentProviderConfig } from '@types';
import { atlasSubscriptionPaymentProviderService } from '../services/AtlasSubscriptionPaymentProviderService';

export function useTestAtlasSubscriptionPaymentProviderConnection() {
  const { invalidate } = useInvalidate();

  return useApiMutation<AtlasSubscriptionPaymentProviderConfig, void, ApiError>({
    mutationFn: () => atlasSubscriptionPaymentProviderService.testConnection(),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(atlasSubscriptionPaymentProviderKeys.config());
    },
  });
}
