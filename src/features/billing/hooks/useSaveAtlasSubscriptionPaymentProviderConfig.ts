/**
 * useSaveAtlasSubscriptionPaymentProviderConfig hook. Platform Owner only.
 * Saving invalidates the disabled/unverified state implicitly — the
 * backend resets `enabled`/`status` on every credential change, so
 * refetching the config after this mutation always reflects that.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { atlasSubscriptionPaymentProviderKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  AtlasSubscriptionPaymentProviderConfig,
  SaveAtlasSubscriptionPaymentProviderConfigPayload,
} from '@types';
import { atlasSubscriptionPaymentProviderService } from '../services/AtlasSubscriptionPaymentProviderService';

export function useSaveAtlasSubscriptionPaymentProviderConfig() {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    AtlasSubscriptionPaymentProviderConfig,
    SaveAtlasSubscriptionPaymentProviderConfigPayload,
    ApiError
  >({
    mutationFn: (payload) => atlasSubscriptionPaymentProviderService.saveConfig(payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(atlasSubscriptionPaymentProviderKeys.config());
    },
  });
}
