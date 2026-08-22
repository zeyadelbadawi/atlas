/**
 * useWebsiteTestimonialEntries hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import { websiteContentService } from '../services/WebsiteContentService';
import type { CollectionQuery, PaginatedResult, WebsiteTestimonialEntry } from '@types';
import type { ApiError } from '@api';

export interface UseWebsiteTestimonialEntriesOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useWebsiteTestimonialEntries(
  academyId: string,
  options?: UseWebsiteTestimonialEntriesOptions
) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<WebsiteTestimonialEntry>, ApiError>({
    queryKey: websiteKeys.testimonialEntries(academyId, query),
    queryFn: () => websiteContentService.getTestimonialEntries(academyId, query),
    enabled: enabled && !!academyId,
  });
}
