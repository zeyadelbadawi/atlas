/**
 * Entitlement / usage evaluation.
 *
 * Every place in the app that needs to know "what can this Tenant do" or
 * "has this Tenant hit a limit" reads through these functions — never
 * duplicated inline in a component, never re-derived per page.
 *
 * Authorization ("can this user perform this action") and entitlement
 * ("does this Tenant's subscription allow this capability") are DIFFERENT
 * concerns. Nothing here reads `usePermissions`/`AuthorizationService`, and
 * nothing in that layer reads Plan/Add-on data. A page must satisfy both,
 * independently, before granting access to a capability.
 */
import type {
  AddOn,
  EffectiveEntitlements,
  EntitlementGapAction,
  LimitValue,
  Plan,
  PlanFeatureKey,
  PlanFeatures,
  PlanLimitKey,
  PlanResourceLimits,
  ResourceLimitStatus,
  UsageMetric,
} from '@types';

/** Adds a limit amount on top of a base value. `'unlimited'` absorbs any addition. */
function addToLimit(base: LimitValue, amount: number): LimitValue {
  return base === 'unlimited' ? 'unlimited' : base + amount;
}

/**
 * Combines a Plan's entitlements with a Tenant's active Add-ons into the
 * single effective result the UI should render. This is the ONLY place
 * that performs this calculation.
 */
export function computeEffectiveEntitlements(
  organizationId: string,
  plan: Plan,
  activeAddOns: readonly AddOn[]
): EffectiveEntitlements {
  const limits: Record<PlanLimitKey, LimitValue> = { ...plan.limits };
  const features: Record<PlanFeatureKey, boolean> = { ...plan.features };

  for (const addOn of activeAddOns) {
    if (addOn.effect.type === 'limit') {
      const { limitKey, amount } = addOn.effect;
      limits[limitKey] = addToLimit(limits[limitKey], amount);
    } else {
      features[addOn.effect.featureKey] = true;
    }
  }

  return {
    organizationId,
    limits: limits as PlanResourceLimits,
    features: features as PlanFeatures,
  };
}

/** Whether a Plan's entitlements allow a specific feature. */
export function hasFeature(
  entitlements: Pick<EffectiveEntitlements, 'features'>,
  featureKey: PlanFeatureKey
): boolean {
  return entitlements.features[featureKey];
}

/**
 * Evaluates one resource limit against current usage.
 *
 * Never divides by zero, never treats `'unlimited'` as a number, and
 * returns `'unknown'` instead of guessing when either side is missing.
 */
export function getResourceLimitStatus(
  used: number | undefined,
  limit: LimitValue | undefined
): ResourceLimitStatus {
  if (limit === undefined || used === undefined) return 'unknown';
  if (limit === 'unlimited') return 'unlimited';
  return used >= limit ? 'limitReached' : 'allowed';
}

/** Convenience wrapper over `getResourceLimitStatus` for a `UsageMetric`. */
export function getUsageMetricStatus(
  metric: UsageMetric | undefined
): ResourceLimitStatus {
  return getResourceLimitStatus(metric?.used, metric?.limit);
}

/**
 * A safe 0–100 usage percentage, or `null` when a percentage wouldn't be
 * meaningful (unlimited, unknown, or a zero/undefined limit).
 */
export function getUsagePercentage(metric: UsageMetric | undefined): number | null {
  if (!metric) return null;
  if (metric.limit === 'unlimited') return null;
  if (metric.limit <= 0) return null;
  return Math.min(100, Math.round((metric.used / metric.limit) * 100));
}

/**
 * Formats a `LimitValue` for display — the single formatting rule every
 * Plan/Usage/entitlement surface uses, so "unlimited" and GB suffixes are
 * never reformatted ad hoc per page.
 */
export function formatLimitValue(
  value: LimitValue,
  isStorage: boolean,
  unlimitedLabel: string
): string {
  if (value === 'unlimited') return unlimitedLabel;
  return isStorage ? `${value} GB` : value.toString();
}

/**
 * Days remaining until an ISO timestamp, floored at 0. Used for trial/grace
 * countdowns — the countdown always reads the subscription's own
 * `trialEndsAt`/`graceEndsAt`, never re-derives it from `DEFAULT_TRIAL_POLICY`'s
 * duration (that constant is display/config only).
 */
export function getDaysRemaining(untilIso: string, now: Date = new Date()): number {
  const until = new Date(untilIso).getTime();
  const diffMs = until - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * What closing a reached resource limit would require: an Add-on if one in
 * the catalog both affects this limit and is compatible with the Tenant's
 * current plan, otherwise a full plan upgrade. `'none'` when the limit
 * hasn't actually been reached.
 *
 * This is the ONLY place that decides "upgrade vs. add-on" — pages read the
 * result, they never re-derive it from plan name or ad hoc conditionals
 * (see the "no hardcoded plan behavior" architecture rule).
 */
export function getLimitGapAction(
  limitKey: PlanLimitKey,
  status: ResourceLimitStatus,
  currentPlanKey: string,
  addOnCatalog: readonly AddOn[]
): EntitlementGapAction {
  if (status !== 'limitReached') return 'none';

  const coveredByAddOn = addOnCatalog.some(
    (addOn) =>
      addOn.effect.type === 'limit' &&
      addOn.effect.limitKey === limitKey &&
      addOn.compatiblePlanKeys.includes(currentPlanKey)
  );

  return coveredByAddOn ? 'addOn' : 'upgradePlan';
}

/**
 * What unlocking a missing feature would require. Mirrors `getLimitGapAction`
 * for `PlanFeatures` instead of `PlanResourceLimits`.
 */
export function getFeatureGapAction(
  featureKey: PlanFeatureKey,
  hasIt: boolean,
  currentPlanKey: string,
  addOnCatalog: readonly AddOn[]
): EntitlementGapAction {
  if (hasIt) return 'none';

  const coveredByAddOn = addOnCatalog.some(
    (addOn) =>
      addOn.effect.type === 'feature' &&
      addOn.effect.featureKey === featureKey &&
      addOn.compatiblePlanKeys.includes(currentPlanKey)
  );

  return coveredByAddOn ? 'addOn' : 'upgradePlan';
}
