/**
 * useSupportCases hook.
 */
import { useApiQuery } from '@/shared/hooks';
import { LIVE_LIST_QUERY_OPTIONS } from '@config';
import { supportKeys } from '@services/query';
import { supportService } from '../services/SupportService';
import type {
  CollectionQuery,
  PaginatedResult,
  SupportCaseSummary,
} from '@types';
import type { ApiError } from '@api';

export interface UseSupportCasesOptions {
  readonly query?: CollectionQuery;
}

export function useSupportCases(options?: UseSupportCasesOptions) {
  return useApiQuery<PaginatedResult<SupportCaseSummary>, ApiError>({
    queryKey: supportKeys.list(options?.query),
    queryFn: () => supportService.getCases(options?.query),
    // The operator queue fills from tenants' tickets — poll while shown.
    ...LIVE_LIST_QUERY_OPTIONS,
  });
}
