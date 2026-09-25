/**
 * Platform Academy Payout Service.
 *
 * `/platform-academy-payouts*` — the ONLY route tree that can create or
 * mark-paid an `AcademyPayout`. `PlatformOwnerGuard`-gated server-side.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  AcademyPayout,
  CollectionQuery,
  CreateAcademyPayoutPayload,
  MarkAcademyPayoutPaidPayload,
  PaginatedResult,
} from '@types';

export class PlatformAcademyPayoutService extends BaseService {
  protected readonly resource = 'platform-academy-payouts';

  async getPayouts(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<AcademyPayout>> {
    return this.fetchCollection<AcademyPayout>(query, options);
  }

  /**
   * Computes the academy's unsettled balance for the period and records ONE
   * payout per currency. Returns an EMPTY array — not an error — when
   * nothing is owed; callers must surface that as "nothing to pay out".
   */
  async createPayout(
    payload: CreateAcademyPayoutPayload,
    options?: WriteOptions
  ): Promise<readonly AcademyPayout[]> {
    return this.createOne<readonly AcademyPayout[], CreateAcademyPayoutPayload>(
      payload,
      options
    );
  }

  /** Records that the money was sent. Idempotent server-side for an already-paid payout. */
  async markPaid(
    payoutId: string,
    payload: MarkAcademyPayoutPaidPayload,
    options?: WriteOptions
  ): Promise<AcademyPayout> {
    return this.client.post<AcademyPayout, MarkAcademyPayoutPaidPayload>(
      this.path(payoutId, 'mark-paid'),
      payload,
      options
    );
  }
}

export const platformAcademyPayoutService = new PlatformAcademyPayoutService();
