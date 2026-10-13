/**
 * B0-ANL-04 — read and set an organization's operator-only flags. Setting
 * the flag refreshes the flags and the subscriptions overview (MRR leaves
 * internal organizations out).
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import {
  platformOrganizationKeys,
  platformSubscriptionKeys,
} from '@services/query';
import {
  platformOrganizationFlagsService,
  type OrganizationPlatformFlags,
} from '../services/PlatformOrganizationFlagsService';
import type { ApiError } from '@api';

export function useOrganizationPlatformFlags(organizationId: string) {
  return useApiQuery<OrganizationPlatformFlags, ApiError>({
    queryKey: platformOrganizationKeys.flags(organizationId),
    queryFn: () => platformOrganizationFlagsService.get(organizationId),
    enabled: !!organizationId,
  });
}

export function useSetOrganizationInternal(organizationId: string) {
  const queryClient = useQueryClient();
  return useApiMutation<OrganizationPlatformFlags, boolean, ApiError>({
    mutationFn: (isInternal) =>
      platformOrganizationFlagsService.setInternal(organizationId, isInternal),
    onSuccess: (flags) => {
      queryClient.setQueryData(
        platformOrganizationKeys.flags(organizationId),
        flags
      );
      void queryClient.invalidateQueries({
        queryKey: platformSubscriptionKeys.overview(),
      });
    },
    showSuccessToast: false,
    showErrorToast: false,
  });
}
