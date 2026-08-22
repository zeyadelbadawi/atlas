/**
 * useWebsiteTestimonialEntry hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import { websiteContentService } from '../services/WebsiteContentService';
import type { WebsiteTestimonialEntry } from '@types';
import type { ApiError } from '@api';

export function useWebsiteTestimonialEntry(academyId: string, entryId: string) {
  return useApiQuery<WebsiteTestimonialEntry, ApiError>({
    queryKey: websiteKeys.testimonialEntry(academyId, entryId),
    queryFn: () => websiteContentService.getTestimonialEntry(academyId, entryId),
    enabled: !!academyId && !!entryId,
  });
}
