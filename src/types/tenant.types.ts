/**
 * Tenant domain types.
 *
 * "Tenant" is a SaaS-business term for the existing `Organization` — Atlas
 * does NOT introduce a parallel Tenant entity/context/store. Every type
 * below is scoped by `organizationId`, the same identifier
 * `IdentityProvider`/`PlatformProvider` already use. See
 * `Reports/ARCHITECTURE.md` (Prompt 6 section) for the full rationale.
 */
import type {
  AddOn,
  LimitValue,
  Plan,
  PlanFeatures,
  PlanResourceLimits,
} from './plan.types';
import type { SubscriptionBillingCycle } from './money.types';

/** An Organization's lifecycle state (backend `organization_status` enum — master plan §5.2). Soft-delete only: there is no delete capability, `'archived'` is the terminal state. */
export type OrganizationStatus = 'active' | 'suspended' | 'archived';

/**
 * The Organization/Tenant itself — its own identity, distinct from
 * `OrganizationContext`/`OrganizationMembership` (`identity.types.ts`),
 * which describe the *caller's relationship* to an organization (role,
 * permissions). This is the bare entity: `GET /organizations/:id`.
 */
export interface Organization {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: OrganizationStatus;
  readonly ownerUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** `POST /organizations` request (Phase P19). Slug is server-generated from `name` — no slug field here, matching the real backend contract (`CreateOrganizationDto`). */
export interface CreateOrganizationPayload {
  readonly name: string;
}

/** A tenant subscription's lifecycle state. Named distinctly from the Prompt 3A, user-scoped `SubscriptionStatus` that used to live in `billing.types.ts` — that legacy file was removed in Prompt 13 along with its only consumer, the fake `BillingPage`. */
export type TenantSubscriptionStatus =
  /**
   * Created, never chose a plan, never trialed — a NEW CUSTOMER.
   * Phase 11: previously this was represented as `expired`, which is why
   * a workspace created seconds earlier greeted its owner with "your
   * subscription has ended".
   */
  | 'no_plan'
  | 'trialing'
  /** A Free Trial ran its course. Distinct from `expired`: the recovery action is "continue with the plan you were trialing". */
  | 'trial_expired'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'grace_period'
  | 'cancelled'
  /** A PAID subscription lapsed. Only ever this — never a new customer. */
  | 'expired';

/**
 * The lifecycle state the product actually speaks about, computed by the
 * backend (`GET /organizations/:id/subscription/lifecycle`) and never
 * re-derived here.
 *
 * WHY THE FRONTEND NO LONGER DERIVES THIS. It used to, in
 * `useSubscriptionAccess`, faithfully mirroring the backend's status
 * interpretation — and faithfully reproducing its one mistake, because
 * two hand-synchronised copies of a rule agree about being wrong just as
 * reliably as about being right. One authority, read by everything.
 */
export type SubscriptionLifecycle =
  /** The account has no Organization at all — the very first step. */
  | 'no_organization'
  | 'no_plan'
  | 'trialing'
  | 'trial_expired'
  | 'active'
  /** Cancelled, but still working through the period already paid for. */
  | 'cancelled_active'
  | 'expired';

/** The authoritative lifecycle read. Display truth for dashboard, sidebar and recovery screens. */
export interface SubscriptionLifecycleState {
  readonly lifecycle: SubscriptionLifecycle;
  readonly hasAccess: boolean;
  readonly status?: TenantSubscriptionStatus;
  /** The plan being trialed/subscribed, or whose trial ended. Absent in `no_plan` — that row's plan is a placeholder, not a choice. */
  readonly plan?: Plan;
  readonly trialEndsAt?: string;
  /** Whole days left in an active trial. 0 on the final day, never negative. */
  readonly trialDaysRemaining?: number;
  readonly currentPeriodEnd?: string;
  /** Whether this ACCOUNT may still redeem its one lifetime Free Trial. Display only — the backend decides at redemption. */
  readonly trialAvailable: boolean;
}

/** A Tenant's (Organization's) subscription. Always tenant-scoped, never per-Academy. */
export interface TenantSubscription {
  readonly organizationId: string;
  readonly status: TenantSubscriptionStatus;
  readonly planId: string;
  readonly plan: Plan;
  /** Present only while `status` is `'trialing'`. */
  readonly trialEndsAt?: string;
  /** Present only while `status` is `'grace_period'`. */
  readonly graceEndsAt?: string;
  readonly currentPeriodStart?: string;
  readonly currentPeriodEnd?: string;
  readonly cancelAtPeriodEnd: boolean;
  /**
   * The billing cycle this subscription is on. Optional because a
   * subscription can exist before any real Checkout ever set one (e.g. a
   * trial seeded with no billing cycle yet) — added in Prompt 7 alongside
   * real Checkout; Prompt 6 had no commercial pricing contract that would
   * have populated it.
   */
  readonly billingCycle?: SubscriptionBillingCycle;
}

/** One resource's usage against its (possibly unlimited) limit. */
export interface UsageMetric {
  readonly used: number;
  readonly limit: LimitValue;
}

/** A Tenant's (Organization's) resource usage. Authoritative usage comes from the backend. */
export interface TenantUsage {
  readonly organizationId: string;
  readonly academies: UsageMetric;
  readonly students: UsageMetric;
  readonly instructors: UsageMetric;
  readonly staff: UsageMetric;
  readonly courses: UsageMetric;
  /** GB. */
  readonly generalStorage: UsageMetric;
  /** GB — tracked separately from general storage. */
  readonly videoStorage: UsageMetric;
  readonly updatedAt: string;
}

/** An Add-on currently active on a Tenant's subscription. */
export interface TenantAddOn {
  readonly id: string;
  readonly organizationId: string;
  readonly addOnId: string;
  readonly addOn: AddOn;
  readonly activatedAt: string;
}

/**
 * The result of combining a Plan's entitlements with the Tenant's active
 * Add-ons — what the Tenant can actually use right now. Always computed
 * through `computeEffectiveEntitlements` (see `tenant/utils`), never
 * duplicated inline in a component.
 */
export interface EffectiveEntitlements {
  readonly organizationId: string;
  readonly limits: PlanResourceLimits;
  readonly features: PlanFeatures;
}

/** The result of evaluating one resource limit against current usage. */
export type ResourceLimitStatus =
  'allowed' | 'limitReached' | 'unlimited' | 'unknown';

/**
 * What a Tenant would need to close an entitlement gap (a reached limit or
 * an unavailable feature): a full plan upgrade, or a compatible Add-on —
 * or `'none'` when there is no gap. Always computed through
 * `getLimitGapAction`/`getFeatureGapAction` (see `tenant/utils`), never
 * decided ad hoc inside a page. This is UX guidance only — the future
 * backend remains the authority on what a Tenant may actually do.
 */
export type EntitlementGapAction = 'upgradePlan' | 'addOn' | 'none';
