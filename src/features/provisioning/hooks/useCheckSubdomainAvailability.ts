/**
 * useCheckSubdomainAvailability hook.
 *
 * Debounced so it doesn't check on every keystroke. Not organization-scoped
 * — a subdomain is unique across all of Atlas.
 */
import { useApiQuery, useDebounce } from '@/shared/hooks';
import { subdomainKeys } from '@services/query';
import { provisioningService } from '../services/ProvisioningService';
import { SUBDOMAIN_REGEX } from '../constants/provisioning.constants';
import type { SubdomainAllocation } from '@types';
import type { ApiError } from '@api';

export function useCheckSubdomainAvailability(subdomain: string) {
  const debouncedSubdomain = useDebounce(subdomain, 500);
  const isWellFormed = SUBDOMAIN_REGEX.test(debouncedSubdomain);

  return useApiQuery<SubdomainAllocation, ApiError>({
    queryKey: subdomainKeys.availability(debouncedSubdomain),
    queryFn: () => provisioningService.checkSubdomainAvailability(debouncedSubdomain),
    enabled: isWellFormed,
  });
}
