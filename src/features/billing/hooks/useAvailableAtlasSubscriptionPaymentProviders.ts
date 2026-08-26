/**
 * useAvailableAtlasSubscriptionPaymentProviders hook. Platform Owner only —
 * the provider-selection dropdown's data source. Honestly short (today:
 * Manual Transfer only) — never padded with an unregistered gateway.
 */
import { useApiQuery } from '@/shared/hooks';
import { atlasSubscriptionPaymentProviderKeys } from '@services/query';
import { atlasSubscriptionPaymentProviderService } from '../services/AtlasSubscriptionPaymentProviderService';
import type { AvailableAtlasSubscriptionPaymentProvider } from '@types';
import type { ApiError } from '@api';

export function useAvailableAtlasSubscriptionPaymentProviders() {
  return useApiQuery<readonly AvailableAtlasSubscriptionPaymentProvider[], ApiError>({
    queryKey: atlasSubscriptionPaymentProviderKeys.availableProviders(),
    queryFn: () => atlasSubscriptionPaymentProviderService.getAvailableProviders(),
  });
}
