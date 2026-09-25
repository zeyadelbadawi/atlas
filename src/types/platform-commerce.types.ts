/**
 * Platform Owner commerce management — course-order payment review,
 * academy payouts and the commission hierarchy.
 *
 * Mirrors the backend contracts exactly:
 *   - `course-commerce/dto/academy-payout.contract.ts`
 *   - `course-commerce/dto/create-academy-payout.dto.ts`
 *   - `course-commerce/dto/mark-academy-payout-paid.dto.ts`
 *   - `billing/dto/commission.contract.ts` and its three update DTOs
 *
 * Every rate is an integer in BASIS POINTS (1% = 100 bp, 0..10000) — never a
 * float on the wire. Converting to and from a percentage for display lives
 * in one place (`features/platform-commerce/utils/commission.utils.ts`).
 */
import type { Money } from './money.types';

/** Prisma `AcademyPayoutStatus`. */
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

/** `POST /platform-academy-payouts` request. Both dates are ISO 8601. */
export interface CreateAcademyPayoutPayload {
  readonly academyId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
}

/** `POST /platform-academy-payouts/:id/mark-paid` request. */
export interface MarkAcademyPayoutPaidPayload {
  readonly providerReference?: string;
}

/** Prisma `OrganizationCommissionMode`. */
export const ORGANIZATION_COMMISSION_MODES = [
  'default',
  'custom',
  'exempt',
] as const;
export type OrganizationCommissionMode =
  (typeof ORGANIZATION_COMMISSION_MODES)[number];

/** `GET/PATCH /platform-commission/global`. `null` = never configured. */
export interface AtlasCommissionConfig {
  readonly defaultCommissionBasisPoints: number | null;
  readonly updatedAt: string;
}

export interface UpdateAtlasCommissionConfigPayload {
  readonly defaultCommissionBasisPoints: number;
}

/** `GET/PATCH /platform-commission/plans/:planKey`. `null` = no plan override. */
export interface PlanCommission {
  readonly planKey: string;
  readonly commissionBasisPoints: number | null;
  readonly updatedAt: string | null;
}

export interface UpdatePlanCommissionPayload {
  readonly commissionBasisPoints: number;
}

/** §4.2's resolution result — never a silent fallback value. */
export type EffectiveCommissionResolution =
  | {
      readonly resolved: true;
      readonly basisPoints: number;
      readonly source: 'custom' | 'exempt' | 'plan' | 'default';
    }
  | { readonly resolved: false };

/** `GET/PATCH /platform-commission/organizations/:organizationId`. */
export interface OrganizationCommission {
  readonly organizationId: string;
  readonly commissionMode: OrganizationCommissionMode;
  readonly customPercentageBasisPoints: number | null;
  readonly planCommissionBasisPoints: number | null;
  readonly effective: EffectiveCommissionResolution;
}

/** `customPercentageBasisPoints` is required exactly when `commissionMode === 'custom'`. */
export interface UpdateOrganizationCommissionPayload {
  readonly commissionMode: OrganizationCommissionMode;
  readonly customPercentageBasisPoints?: number;
}
