/**
 * Academy Course Orders Service — `academies/:id/course-orders[/:orderId]`,
 * the Organization Owner's read-only view of one academy's course sales.
 *
 * Two READS, no writes: approving and rejecting payments is the Platform
 * Owner's, refunds are the buyer's. Who may read is decided server-side —
 * Organization Owner only (`assertCanViewAcademyFinance`, the same rule as
 * the academy's revenue and payouts); a manager or instructor gets 403,
 * which the page renders as a permission state.
 *
 * Every filter, the search and the sort travel as flat query params and are
 * applied by the server before paging. Built with `resourcePath` so every
 * segment is encoded.
 */
import { BaseService, resourcePath, toCollectionParams } from '@services';
import type { ReadOptions } from '@services';
import type {
  AcademyCourseOrder,
  AcademyCourseOrderDetail,
  AcademyCourseOrderListQuery,
  PaginatedResult,
} from '@types';

export class AcademyCourseOrdersService extends BaseService {
  protected readonly resource = 'academies';

  /** A page of this academy's course orders (default: newest first). */
  async getOrders(
    academyId: string,
    query?: AcademyCourseOrderListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<AcademyCourseOrder>> {
    return this.client.get<PaginatedResult<AcademyCourseOrder>>(
      resourcePath('academies', academyId, 'course-orders'),
      {
        ...options,
        params: { ...toCollectionParams(query), ...options?.params },
      }
    );
  }

  /** One order with every payment attempt. 404 when it belongs to another academy. */
  async getOrder(
    academyId: string,
    orderId: string,
    options?: ReadOptions
  ): Promise<AcademyCourseOrderDetail> {
    return this.client.get<AcademyCourseOrderDetail>(
      resourcePath('academies', academyId, 'course-orders', orderId),
      options
    );
  }
}

export const academyCourseOrdersService = new AcademyCourseOrdersService();
