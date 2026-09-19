/**
 * useLearnerPurchases hook.
 *
 * `GET /course-orders` is scoped to the CALLER, not to a host: it answers
 * with this learner's orders at every academy they have ever bought from.
 * `/my/purchases` is one academy's branded page, so the academy filter
 * applied here is a TENANCY requirement — a receipt from a competitor
 * academy appearing on this one's dashboard is a leak the customer sees
 * before anyone else does.
 *
 * The filter is applied in the hook rather than in the page so there is
 * exactly one place it can be forgotten, and the page cannot accidentally
 * render the unfiltered list while it waits for something else.
 *
 * ON THE PAGE SIZE. The backend paginates this route and offers no
 * academy filter, so the request asks for one generous page and filters
 * it. A learner's own order history is small by nature — this is their
 * receipts, not the academy's sales — and paging a list that is then
 * filtered client-side would show the learner a page count that does not
 * match what they can see, which is worse than a bounded list. If a
 * learner ever legitimately exceeds this, the fix is an academy filter on
 * the endpoint, not a bigger number here.
 */
import { useMemo } from 'react';
import { useApiQuery, useAuth } from '@hooks';
import { courseOrderKeys } from '@services/query';
import type { CollectionQuery, CourseOrder, PaginatedResult } from '@types';
import { courseOrderService } from '../services/CourseOrderService';
import { useLearnerSurface } from '../context/LearnerSurface.context';

/** One page, sized for a person's own receipts — see this file's doc comment. */
const PURCHASES_PAGE_SIZE = 100;

export interface UseLearnerPurchasesOptions {
  readonly enabled?: boolean;
}

export interface UseLearnerPurchasesResult {
  /** This academy's orders only, newest first. */
  readonly orders: readonly CourseOrder[];
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly refetch: () => void;
}

export function useLearnerPurchases(
  options?: UseLearnerPurchasesOptions
): UseLearnerPurchasesResult {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();
  const { academyId } = useLearnerSurface();

  const query: CollectionQuery = useMemo(
    () => ({ pagination: { page: 1, pageSize: PURCHASES_PAGE_SIZE } }),
    []
  );

  const result = useApiQuery<PaginatedResult<CourseOrder>>({
    queryKey: courseOrderKeys.list(user?.id, query),
    queryFn: () => courseOrderService.getOrders(query),
    enabled: enabled && !!user?.id,
  });

  const orders = useMemo(() => {
    const items = result.data?.items ?? [];
    return items
      .filter((order) => order.academyId === academyId)
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [result.data, academyId]);

  return {
    orders,
    isLoading: result.isLoading,
    error: result.error ?? null,
    refetch: () => void result.refetch(),
  };
}
