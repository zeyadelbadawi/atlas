/**
 * W8 — the gifted setup days a plan offers on a customer's FIRST-EVER paid
 * subscription, per billing cycle, and the billing cycles a plan can be
 * bought at.
 *
 * Shared (rather than living in `features/tenant`) because the public
 * marketing pricing pages show the same catalog facts the signed-in plans
 * and checkout pages do, and features must not reach into each other.
 *
 * DISPLAY ONLY. Whether a customer actually receives the gift is decided by
 * the backend at payment approval (`PaidGiftEligibilityService`): once per
 * customer identity, only on a fresh first paid subscription — never on a
 * renewal or a plan change.
 */
import type {
  Plan,
  PlanPricingMetadata,
  SubscriptionBillingCycle,
} from '@types';

/** Mirrors the backend's `giftedDaysForCycle` range (5..15); anything else is "no gift". */
const MIN_GIFTED_DAYS = 5;
const MAX_GIFTED_DAYS = 15;

export function planGiftedDaysFor(
  plan: Pick<Plan, 'giftedDaysMonthly' | 'giftedDaysYearly'>,
  cycle: SubscriptionBillingCycle
): number | null {
  const value =
    cycle === 'yearly' ? plan.giftedDaysYearly : plan.giftedDaysMonthly;
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_GIFTED_DAYS &&
    value <= MAX_GIFTED_DAYS
    ? value
    : null;
}

/**
 * The billing cycles the plan's catalog pricing can actually be bought at —
 * the same rule the backend's checkout pricing applies:
 *
 * - a plan priced per year is bought yearly;
 * - a plan priced per month is bought monthly, and ALSO yearly when the
 *   Platform Owner set a whole-year price (`yearlyAmount`) beside it;
 * - anything else (no cycle recorded, no pricing yet) is offered monthly
 *   only, and an unpriced plan is explained by the backend's own
 *   `pricingUnavailable` error.
 */
export function planBillingCycles(
  pricing: PlanPricingMetadata | undefined
): readonly SubscriptionBillingCycle[] {
  if (pricing?.billingCycle === 'yearly') return ['yearly'];
  if (
    pricing?.billingCycle === 'monthly' &&
    typeof pricing.yearlyAmount === 'number' &&
    Number.isFinite(pricing.yearlyAmount)
  ) {
    return ['monthly', 'yearly'];
  }
  return ['monthly'];
}

export interface PlanCycleGift {
  readonly cycle: SubscriptionBillingCycle;
  readonly days: number;
}

/**
 * The catalog price (major units) of one billing cycle — `yearlyAmount`
 * beside a monthly price, otherwise `amount` — or `undefined` when the
 * catalog records none. The same pairing the checkout uses.
 */
export function planCyclePrice(
  pricing: PlanPricingMetadata | undefined,
  cycle: SubscriptionBillingCycle
): number | undefined {
  if (!pricing) return undefined;
  if (cycle === 'yearly' && pricing.billingCycle === 'monthly') {
    return pricing.yearlyAmount;
  }
  return pricing.amount;
}

/**
 * Every cycle a plan can be bought at that comes with gifted days, in
 * monthly → yearly order. A cycle counts only when the catalog gives it a
 * real, nonzero price: a free or unpriced cycle never becomes a paid
 * subscription, so it can never carry the gift. Empty when nothing
 * qualifies, so callers render nothing.
 */
export function planCycleGifts(
  plan: Pick<Plan, 'giftedDaysMonthly' | 'giftedDaysYearly' | 'pricing'>
): readonly PlanCycleGift[] {
  return planBillingCycles(plan.pricing).flatMap((cycle) => {
    const price = planCyclePrice(plan.pricing, cycle);
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      return [];
    }
    const days = planGiftedDaysFor(plan, cycle);
    return days === null ? [] : [{ cycle, days }];
  });
}

/** True when at least one plan in the catalog offers gifted days on a cycle it can be bought at. */
export function planCatalogHasGifts(
  plans: readonly Pick<
    Plan,
    'giftedDaysMonthly' | 'giftedDaysYearly' | 'pricing'
  >[]
): boolean {
  return plans.some((plan) => planCycleGifts(plan).length > 0);
}
