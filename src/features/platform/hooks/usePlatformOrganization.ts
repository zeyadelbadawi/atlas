/**
 * usePlatformOrganization hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { platformOrganizationKeys } from '@services/query';
import { platformOrganizationService } from '../services/PlatformOrganizationService';
import type { PlatformOrganizationDetail } from '@types';
import type { ApiError } from '@api';

export function usePlatformOrganization(organizationId: string) {
  return useApiQuery<PlatformOrganizationDetail, ApiError>({
    queryKey: platformOrganizationKeys.detail(organizationId),
    queryFn: () => platformOrganizationService.getOrganization(organizationId),
    enabled: !!organizationId,
  });
}
