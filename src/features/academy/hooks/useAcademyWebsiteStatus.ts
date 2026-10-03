/**
 * useAcademyWebsiteStatus — the Academy website's publish state, the
 * status an Academy Owner actually acts on (Task 1).
 *
 * The Academy's own lifecycle status (draft/active/suspended/archived) is
 * an internal, platform-operated record: draft and active gate nothing,
 * and only the Platform Owner (or archiving) changes the others. What
 * tells an owner whether their academy is reachable is whether the site
 * is published, so that is what the dashboard shows. Shares the website
 * feature's cache entry (`websiteKeys.configuration`).
 */
import { useApiQuery } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { WebsiteConfiguration } from '@types';
import { academyService } from '../services/AcademyService';

export function useAcademyWebsiteStatus(
  academyId: string | undefined,
  options: { readonly enabled?: boolean } = {}
) {
  const { enabled = true } = options;
  const query = useApiQuery<WebsiteConfiguration, ApiError>({
    queryKey: websiteKeys.configuration(academyId),
    queryFn: () => academyService.getWebsiteConfiguration(academyId!),
    enabled: enabled && !!academyId,
  });
  return { ...query, status: query.data?.status };
}
