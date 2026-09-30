/**
 * usePublishedWebsite hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicWebsiteKeys } from '@services/query';
// The early request `main.tsx` started, if any (Reports/LCP_ROOT_CAUSE.md).
import { prefetchKeys, publicWebsiteService, takePrefetched } from '@services';
import type { WebsiteConfiguration } from '@types';
import type { ApiError } from '@api';

export function usePublishedWebsite(academyId: string | undefined) {
  return useApiQuery<WebsiteConfiguration, ApiError>({
    queryKey: publicWebsiteKeys.configuration(academyId),
    queryFn: () =>
      takePrefetched<WebsiteConfiguration>(
        prefetchKeys.configuration(academyId!)
      ) ?? publicWebsiteService.getPublishedWebsite(academyId!),
    enabled: !!academyId,
  });
}
