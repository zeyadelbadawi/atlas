/**
 * usePublishedPages hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { INLINE_ERRORS_META, publicWebsiteKeys } from '@services/query';
// The early request `main.tsx` started, if any (Reports/LCP_ROOT_CAUSE.md).
import { prefetchKeys, publicWebsiteService, takePrefetched } from '@services';
import type { WebsitePage } from '@types';
import type { ApiError } from '@api';

/** B9 (UX audit) — the public site draws its own state for a failed read; the app-wide toast would only repeat it. */
const PUBLIC_READ_META = { [INLINE_ERRORS_META]: true } as const;

export function usePublishedPages(academyId: string | undefined) {
  return useApiQuery<readonly WebsitePage[], ApiError>({
    meta: PUBLIC_READ_META,
    queryKey: publicWebsiteKeys.pages(academyId),
    queryFn: () =>
      takePrefetched<readonly WebsitePage[]>(prefetchKeys.pages(academyId!)) ??
      publicWebsiteService.getPublishedPages(academyId!),
    enabled: !!academyId,
  });
}
