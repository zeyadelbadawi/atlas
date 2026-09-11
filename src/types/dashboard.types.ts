/**
 * Dashboard overview types (Phase 8) — mirror the backend's
 * `dashboard-overview.contract.ts` field-for-field.
 *
 * REVENUE — `revenue.tracked` is the field that matters most here, and it
 * is NOT "is revenue zero". Atlas only records revenue for Organizations
 * collecting through Atlas Payments; when an Organization uses its own
 * payment gateway, the money never passes through Atlas and Atlas
 * genuinely has no figure to report. `tracked: false` means exactly
 * that — "we don't know", not "you earned nothing" — and the UI must
 * render it as an explicit unavailable state, never as a `0` amount.
 */
import type { TenantUsage } from './tenant.types';

export type PaymentCollectionMode =
  'unconfigured' | 'atlas_payments' | 'organization_gateway';

export interface DashboardScope {
  readonly type: 'organization' | 'academy';
  readonly organizationId: string;
  readonly academyId?: string;
  readonly academyName?: string;
}

export interface DashboardCounts {
  readonly academies: number;
  readonly courses: number;
  readonly publishedCourses: number;
  readonly students: number;
  readonly instructors: number;
}

export interface DashboardRevenueTotal {
  readonly currency: string;
  readonly amountMinorUnits: number;
}

export interface DashboardRevenue {
  /** See this file's header comment — `false` means "not tracked", never "zero". */
  readonly tracked: boolean;
  readonly paymentCollectionMode: PaymentCollectionMode;
  readonly totals: readonly DashboardRevenueTotal[];
}

export interface DashboardActivityItem {
  readonly id: string;
  /** A dotted event name, e.g. `"course.published"` — rendered through a translation key, never shown raw. */
  readonly action: string;
  readonly targetType: string;
  readonly targetLabel?: string;
  readonly actorName: string;
  readonly actorRole?: string;
  readonly academyId?: string;
  readonly occurredAt: string;
}

export interface DashboardOverview {
  readonly scope: DashboardScope;
  readonly counts: DashboardCounts;
  readonly revenue: DashboardRevenue;
  /** `null` when the organization has no subscription yet, or usage has never been computed — an honest absence, never a zero-filled placeholder. */
  readonly usage: TenantUsage | null;
  readonly recentActivity: readonly DashboardActivityItem[];
}
