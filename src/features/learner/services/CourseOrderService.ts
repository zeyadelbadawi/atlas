/**
 * A learner's own course purchases — `course-orders` (backend P13).
 *
 * NOT `features/billing`. That feature is the TENANT's billing: an
 * organization's subscription, its invoices and its payments, every route
 * nested under `organizations/:id/...` and reachable only by a management
 * member. This is the other side of the product entirely — a student's
 * receipts for courses they bought — and the two have no endpoint, no
 * guard and no page in common. Putting a learner read into the tenant
 * billing service would be the first step toward a learner page calling
 * an organization-scoped route and getting a 403 nobody expected.
 *
 * `GET /course-orders` is RLS-scoped to the CALLER, not to a host, so it
 * answers with this learner's orders across every academy they have ever
 * bought from. `/my/purchases` is academy-scoped by construction, so the
 * page filters on `academyId` before it renders anything — see
 * `LearnerPurchasesPage` for why that filter is a tenancy requirement
 * rather than a tidy-up.
 */
import { BaseService } from '@services';
import type { ReadOptions } from '@services';
import type { CollectionQuery, CourseOrder, PaginatedResult } from '@types';

export class CourseOrderService extends BaseService {
  protected readonly resource = 'course-orders';

  /** Retrieves a page of the current learner's own course orders. */
  async getOrders(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<CourseOrder>> {
    return this.fetchCollection<CourseOrder>(query, options);
  }
}

/** Singleton instance following the Atlas service pattern. */
export const courseOrderService = new CourseOrderService();
