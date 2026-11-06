/**
 * usePublishedPage hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { INLINE_ERRORS_META, publicWebsiteKeys } from '@services/query';
import { publicWebsiteService } from '@services';
import type { WebsitePage } from '@types';
import type { ApiError } from '@api';

/** B9 (UX audit) — the public site draws its own state for a failed read; the app-wide toast would only repeat it. */
const PUBLIC_READ_META = { [INLINE_ERRORS_META]: true } as const;

export function usePublishedPage(academyId: string | undefined, slug: string) {
  return useApiQuery<WebsitePage | null, ApiError>({
    meta: PUBLIC_READ_META,
    queryKey: publicWebsiteKeys.page(academyId, slug),
    queryFn: () => publicWebsiteService.getPublishedPage(academyId!, slug),
    enabled: !!academyId && !!slug,
  });
}
