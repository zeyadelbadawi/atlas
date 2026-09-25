/**
 * Academy revenue & payouts (backend `course-commerce`, P13) — mirrors
 * `src/course-commerce/dto/academy-payout.contract.ts` field-for-field.
 *
 * Two reads, both scoped to ONE academy and both Organization-Owner-only
 * server-side (`assertCanViewAcademyFinance`: a manager or instructor gets
 * 403 `errors.tenancy.notAMember`):
 *
 *   - `GET academies/:id/payouts` — paginated payout history, newest first.
 *   - `GET academies/:id/payouts/revenue-summary` — the unsettled ledger
 *     balance grouped by currency, computed live. It is NET: sales minus
 *     Atlas's platform fee, minus refunds (plus reversed commission), so a
 *     currency's figure can legitimately be zero or negative.
 *
 * Only sales collected through Atlas Payments write ledger entries; a sale
 * through the organization's own gateway never reaches this ledger, which is
 * why an academy that sells only through its own gateway has no payouts.
 */
import type { Money } from './money.types';

export const ACADEMY_PAYOUT_STATUSES = [
  'pending',
  'processing',
  'paid',
  'failed',
] as const;
export type AcademyPayoutStatus = (typeof ACADEMY_PAYOUT_STATUSES)[number];

export interface AcademyPayout {
  readonly id: string;
  readonly academyId: string;
  readonly status: AcademyPayoutStatus;
  readonly money: Money;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly paidAt?: string;
  readonly providerReference?: string;
  readonly itemCount?: number;
  readonly createdAt: string;
}

export interface AcademyRevenueSummary {
  readonly academyId: string;
  readonly unsettled: readonly Money[];
}
