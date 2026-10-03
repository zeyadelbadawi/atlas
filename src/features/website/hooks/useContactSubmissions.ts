/**
 * useContactSubmissions hook — one page of the Academy's website messages.
 *
 * Search, status/date filters, sort and paging are all server-side; the
 * query object is embedded in the key so every distinct combination is
 * its own cache entry.
 */
import { keepPreviousData } from '@tanstack/react-query';
import { useApiQuery } from '@/shared/hooks';
import { LIVE_LIST_QUERY_OPTIONS } from '@config';
import { websiteKeys } from '@services/query';
import type { ApiError } from '@api';
import type {
  ContactSubmission,
  ContactSubmissionListQuery,
  PaginatedResult,
} from '@types';
import { contactSubmissionService } from '../services/ContactSubmissionService';

export interface UseContactSubmissionsOptions {
  readonly query?: ContactSubmissionListQuery;
  readonly enabled?: boolean;
}

export function useContactSubmissions(
  academyId: string,
  options?: UseContactSubmissionsOptions
) {
  const { query, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<ContactSubmission>, ApiError>({
    queryKey: websiteKeys.contactSubmissions(academyId, query),
    queryFn: () => contactSubmissionService.getSubmissions(academyId, query),
    enabled: enabled && !!academyId,
    // Typing in the search box or flipping a filter keeps the previous
    // rows on screen instead of collapsing the table to a skeleton.
    placeholderData: keepPreviousData,
    // Visitors send messages from the public site; poll while shown.
    ...LIVE_LIST_QUERY_OPTIONS,
  });
}
