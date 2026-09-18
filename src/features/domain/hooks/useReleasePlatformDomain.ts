import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { platformDomainKeys, domainKeys } from '@services/query';
import type { ApiError } from '@api';
import type { PlatformDomainRow } from '@types';
import { platformDomainsService } from '../services/PlatformDomainsService';

/** P63g — operator release of a held hostname. Invalidates the operations views and the Academy's own configuration query. */
export function useReleasePlatformDomain() {
  const { invalidate } = useInvalidate();

  return useApiMutation<PlatformDomainRow, string, ApiError>({
    mutationFn: (academyId) => platformDomainsService.release(academyId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, academyId) => {
      await Promise.all([
        invalidate(platformDomainKeys.all),
        invalidate(domainKeys.configuration(academyId)),
      ]);
    },
  });
}
