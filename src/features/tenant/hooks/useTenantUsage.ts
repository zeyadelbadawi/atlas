/**
 * useTenantUsage hook.
 *
 * Fetches the active organization's (the Tenant's) current resource usage.
 * Usage is authoritative backend data — never calculated on the frontend
 * from arbitrary local state.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { tenantKeys } from '@services/query';
import { tenantService } from '../services/TenantService';
import type { TenantUsage } from '@types';
import type { ApiError } from '@api';

export function useTenantUsage() {
  const { organization } = useAuth();

  return useApiQuery<TenantUsage, ApiError>({
    queryKey: tenantKeys.usage(organization?.id),
    queryFn: () => tenantService.getUsage(organization!.id),
    enabled: !!organization?.id,
  });
}
