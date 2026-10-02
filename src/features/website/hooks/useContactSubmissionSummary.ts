/**
 * useContactSubmissionSummary hook — whole-academy message counts by
 * status (`total`/`new`/`read`/`archived`), independent of list filters.
 */
import { useApiQuery } from '@/shared/hooks';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type { ContactSubmissionSummary } from '@types';
import { contactSubmissionService } from '../services/ContactSubmissionService';

export interface UseContactSubmissionSummaryOptions {
  readonly enabled?: boolean;
}

export function useContactSubmissionSummary(
  academyId: string,
  options?: UseContactSubmissionSummaryOptions
) {
  const { enabled = true } = options ?? {};

  return useApiQuery<ContactSubmissionSummary, ApiError>({
    queryKey: websiteKeys.contactSubmissionSummary(academyId),
    queryFn: () => contactSubmissionService.getSummary(academyId),
    enabled: enabled && !!academyId,
  });
}
