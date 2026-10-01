/**
 * usePublishedPages hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { publicWebsiteKeys } from '@services/query';
// The early request `main.tsx` started, if any (Reports/LCP_ROOT_CAUSE.md).
import { prefetchKeys, publicWebsiteService, takePrefetched } from '@services';
import type { WebsitePage } from '@types';
import type { ApiError } from '@api';

export function usePublishedPages(academyId: string | undefined) {
  return useApiQuery<readonly WebsitePage[], ApiError>({
    queryKey: publicWebsiteKeys.pages(academyId),
    queryFn: () =>
      takePrefetched<readonly WebsitePage[]>(prefetchKeys.pages(academyId!)) ??
      publicWebsiteService.getPublishedPages(academyId!),
    enabled: !!academyId,
  });
}
