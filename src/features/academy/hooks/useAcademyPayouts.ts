/**
 * useAcademyPayouts / useAcademyRevenueSummary (backend P13).
 *
 * Organization-Owner-only reads for ONE academy, keyed by academy (and, for
 * the list, the page) under `academyPayoutKeys`. Both stay disabled until
 * the route supplies an academy id.
 *
 * ONE ACADEMY'S MONEY IS NEVER SHOWN UNDER ANOTHER'S NAME. The app-wide
 * query default keeps the previous result as placeholder data while a new
 * key loads (so paging does not collapse the table). That is right for
 * page 2 of the same academy and wrong for a different academy: switching
 * academy would briefly show the first academy's balances. The placeholder
 * is therefore kept only when the previous query was for the same academy.
 *
 * The app-wide retry policy only retries transient failures, so a 403 from
 * a non-owner reaches the page on its first answer.
 */
import type { Query } from '@tanstack/react-query';
import { useApiQuery } from '@/shared/hooks';
import { academyPayoutKeys } from '@services/query';
import { academyPayoutsService } from '../services/AcademyPayoutsService';
import type {
  AcademyPayout,
  AcademyRevenueSummary,
  CollectionQuery,
  PaginatedResult,
} from '@types';
import type { ApiError } from '@api';

/** Index of the academy id inside every `academyPayoutKeys` key. */
const ACADEMY_ID_KEY_INDEX = 2;

function sameAcademyPlaceholder<TData>(academyId: string) {
  return (
    previous: TData | undefined,
    previousQuery: Query<TData, ApiError, TData, readonly unknown[]> | undefined
  ): TData | undefined =>
    previousQuery?.queryKey[ACADEMY_ID_KEY_INDEX] === academyId
      ? previous
      : undefined;
}

export function useAcademyPayouts(academyId: string, query: CollectionQuery) {
  return useApiQuery<PaginatedResult<AcademyPayout>, ApiError>({
    queryKey: academyPayoutKeys.list(academyId || undefined, query),
    queryFn: () => academyPayoutsService.getPayouts(academyId, query),
    enabled: academyId.length > 0,
    placeholderData: sameAcademyPlaceholder(academyId),
  });
}

export function useAcademyRevenueSummary(academyId: string) {
  return useApiQuery<AcademyRevenueSummary, ApiError>({
    queryKey: academyPayoutKeys.revenueSummary(academyId || undefined),
    queryFn: () => academyPayoutsService.getRevenueSummary(academyId),
    enabled: academyId.length > 0,
    placeholderData: sameAcademyPlaceholder(academyId),
  });
}
