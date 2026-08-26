/**
 * useSetAtlasSubscriptionPaymentProviderEnabled hook. Platform Owner only —
 * backs both the Enable and Disable actions (same mutation, `enabled`
 * variable flips which endpoint is called — see the service).
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { atlasSubscriptionPaymentProviderKeys } from '@services/query';
import type { ApiError } from '@api';
import type { AtlasSubscriptionPaymentProviderConfig } from '@types';
import { atlasSubscriptionPaymentProviderService } from '../services/AtlasSubscriptionPaymentProviderService';

export function useSetAtlasSubscriptionPaymentProviderEnabled() {
  const { invalidate } = useInvalidate();

  return useApiMutation<AtlasSubscriptionPaymentProviderConfig, boolean, ApiError>({
    mutationFn: (enabled) => atlasSubscriptionPaymentProviderService.setEnabled(enabled),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(atlasSubscriptionPaymentProviderKeys.config());
    },
  });
}
