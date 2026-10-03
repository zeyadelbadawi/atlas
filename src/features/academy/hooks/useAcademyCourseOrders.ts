/**
 * useAcademyCourseOrders / useAcademyCourseOrder — the Organization Owner's
 * read-only course orders for ONE academy, keyed by academy (and, for the
 * list, the full query) under `academyCourseOrderKeys`. Both stay disabled
 * until the route supplies the ids.
 *
 * ONE ACADEMY'S ORDERS ARE NEVER SHOWN UNDER ANOTHER'S NAME — the same rule
 * as `useAcademyPayouts`: the previous result is kept as placeholder data
 * while a new page/filter loads only when it was for the same academy.
 *
 * The app-wide retry policy only retries transient failures, so a 403 (not
 * the owner) or 404 (another academy's order) reaches the page at once.
 */
import type { Query } from '@tanstack/react-query';
import { useApiQuery } from '@/shared/hooks';
import { academyCourseOrderKeys } from '@services/query';
import { academyCourseOrdersService } from '../services/AcademyCourseOrdersService';
import type {
  AcademyCourseOrder,
  AcademyCourseOrderDetail,
  AcademyCourseOrderListQuery,
  PaginatedResult,
} from '@types';
import type { ApiError } from '@api';

/** Index of the academy id inside every `academyCourseOrderKeys` key. */
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

export function useAcademyCourseOrders(
  academyId: string,
  query: AcademyCourseOrderListQuery
) {
  return useApiQuery<PaginatedResult<AcademyCourseOrder>, ApiError>({
    queryKey: academyCourseOrderKeys.list(academyId || undefined, query),
    queryFn: () => academyCourseOrdersService.getOrders(academyId, query),
    enabled: academyId.length > 0,
    placeholderData: sameAcademyPlaceholder(academyId),
  });
}

export function useAcademyCourseOrder(academyId: string, orderId: string) {
  return useApiQuery<AcademyCourseOrderDetail, ApiError>({
    queryKey: academyCourseOrderKeys.detail(academyId || undefined, orderId),
    queryFn: () => academyCourseOrdersService.getOrder(academyId, orderId),
    enabled: academyId.length > 0 && orderId.length > 0,
  });
}
