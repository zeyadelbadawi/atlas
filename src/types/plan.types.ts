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
