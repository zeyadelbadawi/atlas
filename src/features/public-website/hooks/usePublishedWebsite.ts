/**
 * usePublishedWebsite hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { INLINE_ERRORS_META, publicWebsiteKeys } from '@services/query';
// The early request `main.tsx` started, if any (Reports/LCP_ROOT_CAUSE.md).
import { prefetchKeys, publicWebsiteService, takePrefetched } from '@services';
import type { WebsiteConfiguration } from '@types';
import type { ApiError } from '@api';

/** B9 (UX audit) — the public site draws its own state for a failed read; the app-wide toast would only repeat it. */
const PUBLIC_READ_META = { [INLINE_ERRORS_META]: true } as const;

export function usePublishedWebsite(academyId: string | undefined) {
  return useApiQuery<WebsiteConfiguration, ApiError>({
    meta: PUBLIC_READ_META,
    queryKey: publicWebsiteKeys.configuration(academyId),
    queryFn: () =>
      takePrefetched<WebsiteConfiguration>(
        prefetchKeys.configuration(academyId!)
      ) ?? publicWebsiteService.getPublishedWebsite(academyId!),
    enabled: !!academyId,
  });
}
