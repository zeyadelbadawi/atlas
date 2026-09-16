import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { platformDomainKeys, domainKeys } from '@services/query';
import type { ApiError } from '@api';
import type { PlatformDomainRow } from '@types';
import { platformDomainsService } from '../services/PlatformDomainsService';

/** P63 — operator "Check now". Invalidates every operations view plus the customer's own configuration query for that Academy, so both sides see the same fresh truth. */
export function useCheckPlatformDomain() {
  const { invalidate } = useInvalidate();

  return useApiMutation<PlatformDomainRow, string, ApiError>({
    mutationFn: (academyId) => platformDomainsService.check(academyId),
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
