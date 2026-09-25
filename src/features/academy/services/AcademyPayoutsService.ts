/**
 * Academy Payouts Service (backend P13) — the money an academy has earned
 * through Atlas Payments and the payouts Atlas has made to it.
 *
 * Two READS mirroring `academies/:id/payouts*`. There is no write here: a
 * payout row is created and marked paid by the Platform Owner only.
 *
 * Who may read them is decided server-side — Organization Owner only
 * (`assertCanViewAcademyFinance`); a manager or instructor gets 403. The
 * route and nav entry are gated on `tenant.billing.view` to match, but that
 * is presentation: this service is never the boundary, and the page renders
 * the 403 as a permission state.
 *
 * Built with `resourcePath` like `AcademyReportsService`, so every segment
 * goes through its per-segment encoding.
 */
import { BaseService, resourcePath, toCollectionParams } from '@services';
import type { ReadOptions } from '@services';
import type {
  AcademyPayout,
  AcademyRevenueSummary,
  CollectionQuery,
  PaginatedResult,
} from '@types';

export class AcademyPayoutsService extends BaseService {
  protected readonly resource = 'academies';

  /** A page of this academy's payouts, newest first (server order). */
  async getPayouts(
    academyId: string,
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<AcademyPayout>> {
    return this.client.get<PaginatedResult<AcademyPayout>>(
      resourcePath('academies', academyId, 'payouts'),
      {
        ...options,
        params: { ...toCollectionParams(query), ...options?.params },
      }
    );
  }

  /** The unsettled (not yet paid out) net balance, one entry per currency. */
  async getRevenueSummary(
    academyId: string,
    options?: ReadOptions
  ): Promise<AcademyRevenueSummary> {
    return this.client.get<AcademyRevenueSummary>(
      resourcePath('academies', academyId, 'payouts', 'revenue-summary'),
      options
    );
  }
}

export const academyPayoutsService = new AcademyPayoutsService();
