/**
 * useAtlasSubscriptionPaymentProviderConfig hook. Platform Owner only.
 */
import { useApiQuery } from '@/shared/hooks';
import { atlasSubscriptionPaymentProviderKeys } from '@services/query';
import { atlasSubscriptionPaymentProviderService } from '../services/AtlasSubscriptionPaymentProviderService';
import type { AtlasSubscriptionPaymentProviderConfig } from '@types';
import type { ApiError } from '@api';

export function useAtlasSubscriptionPaymentProviderConfig() {
  return useApiQuery<AtlasSubscriptionPaymentProviderConfig, ApiError>({
    queryKey: atlasSubscriptionPaymentProviderKeys.config(),
    queryFn: () => atlasSubscriptionPaymentProviderService.getConfig(),
  });
}
