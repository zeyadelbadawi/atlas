/**
 * Plan (catalog) domain types.
 *
 * A Plan is a catalog entry — it belongs to Atlas, not to any one tenant.
 * `TenantSubscription` (in `tenant.types.ts`) is what links a specific
 * Organization/Tenant to one of these plans. Final commercial pricing is
 * NOT finalized here — `pricing` is display metadata only, and the actual
 * checkout/payment flow belongs to a future prompt.
 */

/** A resource limit value. Explicit `'unlimited'` — never a magic number like 999999999. */
export type LimitValue = number | 'unlimited';

/** The resource limits every Plan (and Add-on effect) can express. */
export type PlanLimitKey =
  | 'academies'
  | 'students'
  | 'instructors'
  | 'staff'
  | 'courses'
  | 'generalStorage'
  | 'videoStorage';

/** Resource limits granted by a Plan. Storage values are in GB. */
export interface PlanResourceLimits {
  readonly academies: LimitValue;
  readonly students: LimitValue;
  readonly instructors: LimitValue;
  readonly staff: LimitValue;
  readonly courses: LimitValue;
  /** General storage (images, documents, attachments), in GB. */
  readonly generalStorage: LimitValue;
  /** Video storage (course/lesson video media), in GB — tracked separately from general storage. */
  readonly videoStorage: LimitValue;
}

/** The feature entitlements every Plan (and Add-on effect) can express. */
export type PlanFeatureKey =
  | 'cms'
  | 'seo'
  | 'seoAdvanced'
  | 'marketing'
  | 'marketingAdvanced'
  | 'analytics'
  | 'analyticsAdvanced'
  | 'customDomain'
  | 'themes'
  | 'multipleThemes'
  | 'backup';

/** Feature availability granted by a Plan. A capability switch, not a quota. */
export interface PlanFeatures {
  readonly cms: boolean;
  readonly seo: boolean;
  readonly seoAdvanced: boolean;
  readonly marketing: boolean;
  readonly marketingAdvanced: boolean;
  readonly analytics: boolean;
  readonly analyticsAdvanced: boolean;
  readonly customDomain: boolean;
  readonly themes: boolean;
  readonly multipleThemes: boolean;
  readonly backup: boolean;
}

/** A Plan's lifecycle/catalog visibility state. */
export type PlanStatus = 'active' | 'archived';

/**
 * Display-only pricing metadata.
 *
 * NOT a commercial pricing contract — no checkout/payment reads this.
 * Prompt 7 (Pricing + Checkout + Payment) owns the real pricing strategy.
 */
export interface PlanPricingMetadata {
  readonly amount?: number;
  readonly currency?: string;
  readonly billingCycle?: 'monthly' | 'yearly';
}

/** A catalog Plan. */
export interface Plan {
  readonly id: string;
  /** Stable identifier used by Subscription/Add-on compatibility — never hardcoded in UI logic. */
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly status: PlanStatus;
  readonly displayOrder: number;
  readonly limits: PlanResourceLimits;
  readonly features: PlanFeatures;
  readonly pricing?: PlanPricingMetadata;
}

/** What kind of thing an Add-on affects. */
export type AddOnEffectType = 'limit' | 'feature';

/** An Add-on that increases a resource limit by a fixed amount. */
export interface AddOnLimitEffect {
  readonly type: 'limit';
  readonly limitKey: PlanLimitKey;
  /** Amount added on top of the base plan's limit. Meaningless when the base limit is already 'unlimited'. */
  readonly amount: number;
}

/** An Add-on that turns on a feature the base plan doesn't include. */
export interface AddOnFeatureEffect {
  readonly type: 'feature';
  readonly featureKey: PlanFeatureKey;
}

export type AddOnEffect = AddOnLimitEffect | AddOnFeatureEffect;

/** A catalog Add-on. */
export interface AddOn {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly effect: AddOnEffect;
  /** Plan keys this Add-on may be attached to. An empty list means "not currently offered". */
  readonly compatiblePlanKeys: readonly string[];
  readonly pricing?: PlanPricingMetadata;
}

/**
 * The Atlas Platform Owner's free-trial configuration.
 *
 * This is platform-level SaaS configuration — the same catalog scope as
 * `Plan`/`AddOn` — never tenant-owned. It is READ from
 * `PlanService.getTrialPolicy` and, for the Platform Owner only, WRITTEN
 * through `PlanService.updateTrialPolicy`.
 *
 * Deliberately NOT a hardcoded business rule: `durationDays` is only
 * meaningful reference data once `enabled` is true, and `enabled: false`
 * (equivalently `durationDays: 0`) is a fully supported "no trial" policy.
 * `DEFAULT_TRIAL_POLICY` in `features/tenant/constants` supplies the
 * *initial* value only — every read goes through this contract, never a
 * scattered numeric literal.
 */
export interface TrialPolicy {
  readonly enabled: boolean;
  /** Meaningless (and ignored) while `enabled` is `false`; `0` means no trial. */
  readonly durationDays: number;
}

/**
 * Closed vocabulary for why a customer cancelled — mirrors the backend's
 * `CANCELLATION_REASONS` exactly, and is validated server-side.
 *
 * Deliberately a fixed list rather than free text: it is what makes the
 * admin dashboard able to aggregate reasons at all. Anything the customer
 * wants to say in their own words goes in the optional `feedback` field.
 */
export const CANCELLATION_REASONS = [
  'too_expensive',
  'missing_features',
  'not_using_it',
  'too_difficult',
  'switching_provider',
  'temporary_pause',
  'other',
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];

/** `POST /organizations/:id/subscription/trial` request. */
export interface StartTrialRequest {
  /** Always `true` — the backend rejects anything else. See `TenantService.startTrial`. */
  readonly confirm: true;
  /** The plan chosen on the Plans page. Omitted falls back to the default trial tier. */
  readonly planId?: string;
}

export interface StartTrialResult {
  /** `false` is a normal outcome, not an error — read this rather than relying on a thrown error. */
  readonly started: boolean;
  /** Why it was refused. `already_redeemed` means this person has used their one trial. */
  readonly reason?: 'already_redeemed' | 'already_has_subscription';
  readonly trialEndsAt?: string;
}

export interface CancelSubscriptionRequestInput {
  readonly reason: CancellationReason;
  /** Optional. Never required to cancel. */
  readonly feedback?: string;
}

export interface CancelSubscriptionRequest extends CancelSubscriptionRequestInput {
  readonly confirm: true;
}

export interface CancellationResult {
  readonly cancelled: boolean;
  /** True when a prior cancellation already existed — the request was a safe no-op. */
  readonly alreadyCancelled: boolean;
  /** When access actually ends: immediate for a trial, end of the paid period for a paid subscription. */
  readonly effectiveAt: string;
}

/**
 * Platform-admin subscription/trial operations view — mirrors the
 * backend's `AdminSubscriptionOverview` exactly.
 *
 * `revenue.tracked` is `false` because Atlas genuinely does not track
 * subscription revenue. The UI must say so rather than render a zero that
 * a reader would mistake for a measurement.
 */
export interface AdminCancellationRow {
  readonly id: string;
  readonly kind: 'trial' | 'paid';
  readonly reason: string;
  readonly feedback?: string;
  readonly cancelledAt: string;
  readonly effectiveAt: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly cancelledByUserId?: string;
  readonly cancelledByName?: string;
}

export interface AdminPlanDistributionRow {
  readonly planId: string;
  readonly planKey: string;
  readonly planName: string;
  readonly subscriptions: number;
}

export interface AdminSubscriptionOverview {
  readonly organizations: number;
  readonly subscriptions: {
    readonly byStatus: Record<string, number>;
    readonly activePaid: number;
  };
  readonly trials: {
    readonly everRedeemed: number;
    readonly active: number;
    readonly cancelled: number;
    readonly convertedToPaid: number;
  };
  readonly cancellations: {
    readonly trials: number;
    readonly paid: number;
    readonly byReason: Record<string, number>;
    readonly recent: readonly AdminCancellationRow[];
  };
  readonly plans: readonly AdminPlanDistributionRow[];
  /** Atlas does not track subscription revenue — reported, never fabricated. */
  readonly revenue: { readonly tracked: false };
  readonly generatedAt: string;
}
