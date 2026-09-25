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
  /**
   * The paid period ended and payment has not arrived, but the site is
   * STILL ONLINE for a bounded window. Distinct from `expired` in the one
   * way that matters to the customer: they can still fix it, and nothing
   * of theirs is switched off yet.
   */
  | 'grace_period'
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
  /**
   * Expiry enforcement — the status the row WOULD have if the sweep had
   * run this instant, which is what `lifecycle` is derived from. Differs
   * from `status` only between a dated transition and the next tick.
   */
  readonly effectiveStatus?: string;
  /**
   * End of the grace window: present while `lifecycle` is `grace_period`,
   * and on an `expired` row that went through grace — so the recovery
   * screen can say when access actually ended rather than guessing.
   */
  readonly graceEndsAt?: string;
  /** When access ends if nothing changes. The date the customer must act by. */
  readonly accessEndsAt?: string;
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

// ---------------------------------------------------------------------------
// Hosted-video retention (P64 Communications C6 — plan §31/§32)
// ---------------------------------------------------------------------------

/**
 * What this organization's hosted video is facing, decided by the backend
 * (`GET /organizations/:id/retention`) and never re-derived here.
 *
 * The same rule `SubscriptionLifecycle` above documents applies with more
 * force: the dates on this page decide whether a customer believes their
 * content is about to be destroyed, and a second local copy of the
 * retention arithmetic would eventually disagree with the sweep that
 * actually performs the deletion.
 */
export type TenantRetentionState =
  /** No retention window is open — nothing is scheduled. */
  | 'not_scheduled'
  /** A window is open and a date exists, but no warning has been sent yet. */
  | 'scheduled'
  /** At least one of W1–W4 has actually been sent. */
  | 'warning'
  /** A legal hold or an open support case is freezing the clock. */
  | 'held'
  /** The deletion date has passed. */
  | 'elapsed';

/** The platform-wide retention mode. `off` means nothing is scheduled anywhere. */
export type TenantRetentionMode = 'off' | 'warn_only' | 'on';

/** Why the clock is frozen. */
export type TenantRetentionHoldReason = 'legal_hold' | 'support_case';

/** The four warnings of §31, in the order the owner receives them. */
export type TenantRetentionWarningStepId =
  | 'retention_warning_30d'
  | 'retention_warning_14d'
  | 'retention_warning_7d'
  | 'retention_warning_24h';

/** One row of the W1 → W2 → W3 → W4 timeline. */
export interface TenantRetentionWarningStep {
  readonly step: TenantRetentionWarningStepId;
  readonly dueAt: string;
  /** Whether the warning was genuinely sent — outbox evidence, not a guess. */
  readonly sent: boolean;
}

/** One course that would lose hosted video. */
export interface TenantRetentionCourse {
  readonly id: string;
  readonly title: string;
  readonly videoCount: number;
  readonly storedMinutes: number;
}

export interface TenantRetentionVideoTally {
  readonly assetCount: number;
  readonly storedMinutes: number;
  /** BigInt as a decimal string — JSON cannot carry one. */
  readonly storedBytes: string;
  /** `0` is the fact the page leads with: nothing has been deleted. */
  readonly deletedAssetCount: number;
  readonly lastDeletedAt: string | null;
}

/** The authoritative retention read behind `/dashboard/tenant/retention`. */
export interface TenantRetention {
  readonly organizationId: string;
  readonly state: TenantRetentionState;
  readonly mode: TenantRetentionMode;
  readonly windowOpen: boolean;
  /** `trial` → 90 days, `paid` → 180 days. */
  readonly origin: 'trial' | 'paid' | null;
  readonly windowDays: number | null;
  readonly anchorAt: string | null;
  readonly deletionAt: string | null;
  readonly daysUntilDeletion: number | null;
  readonly warnings: readonly TenantRetentionWarningStep[];
  readonly hold: {
    readonly held: boolean;
    readonly reason: TenantRetentionHoldReason | null;
  };
  readonly video: TenantRetentionVideoTally;
  readonly courses: readonly TenantRetentionCourse[];
  readonly coursesTruncated: boolean;
  readonly generatedAt: string;
}
