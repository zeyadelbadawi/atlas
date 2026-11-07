/**
 * Plan management (atlas-backend#112) — the small rules the plan list and
 * its dialogs share.
 *
 * Visibility is derived exactly as the server derives it: an archived plan
 * is archived; an active plan with `displayOrder > 0` is listed (customers
 * see it, at that position); an active plan at 0 is hidden (not offered,
 * still buyable by key — founding price locks, for example).
 */
import { PLAN_FEATURE_KEYS, PLAN_LIMIT_KEYS } from '@features/tenant';
import type {
  CreatePlanPayload,
  Plan,
  PlanFeatures,
  PlanResourceLimits,
  PlanVisibility,
} from '@types';
import { PLAN_POSITION_MAX } from '../schemas/plan-editor.schema';

/** Backend message keys the plan dialogs place themselves. */
export const PLAN_ERROR_KEYS = {
  keyTaken: 'errors.plan.keyTaken',
  alreadyArchived: 'errors.plan.alreadyArchived',
  notArchived: 'errors.plan.notArchived',
  lastListedPlan: 'errors.plan.lastListedPlan',
} as const;

export function planVisibility(
  plan: Pick<Plan, 'status' | 'displayOrder'>
): PlanVisibility {
  if (plan.status === 'archived') return 'archived';
  return (plan.displayOrder ?? 0) > 0 ? 'listed' : 'hidden';
}

/** The position after the last listed plan, capped at the server's maximum. */
export function nextListedPosition(
  plans: readonly Pick<Plan, 'status' | 'displayOrder'>[]
): number {
  const highest = plans
    .filter((plan) => planVisibility(plan) === 'listed')
    .reduce((max, plan) => Math.max(max, plan.displayOrder ?? 0), 0);
  return Math.min(highest + 1, PLAN_POSITION_MAX);
}

/**
 * What a new plan copies from the plan it starts from: every limit and
 * feature (the server needs the full set), the trial and the gifted days.
 * Only current keys are copied; legacy feature keys are dropped.
 */
export function copiedPlanSettings(
  source: Plan
): Pick<
  CreatePlanPayload,
  | 'limits'
  | 'features'
  | 'trialEligible'
  | 'trialDurationDays'
  | 'giftedDaysMonthly'
  | 'giftedDaysYearly'
> {
  const limits = Object.fromEntries(
    PLAN_LIMIT_KEYS.map((key) => [key, source.limits[key] ?? 0])
  ) as Record<string, unknown>;
  if (source.limits.monthlyEmails !== undefined) {
    limits.monthlyEmails = source.limits.monthlyEmails;
  }
  const rawFeatures = (source.features ?? {}) as unknown as Record<
    string,
    unknown
  >;
  const features = Object.fromEntries(
    PLAN_FEATURE_KEYS.map((key) => [key, rawFeatures[key] === true])
  ) as unknown as PlanFeatures;
  return {
    limits: limits as unknown as PlanResourceLimits,
    features,
    trialEligible: source.trialEligible,
    trialDurationDays: source.trialEligible
      ? (source.trialDurationDays ?? null)
      : null,
    giftedDaysMonthly: source.giftedDaysMonthly ?? null,
    giftedDaysYearly: source.giftedDaysYearly ?? null,
  };
}
