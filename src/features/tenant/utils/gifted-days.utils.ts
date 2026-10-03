/**
 * W8 — the gift a plan offers on a FIRST paid subscription, per billing
 * cycle. Display only: whether a customer actually receives it is decided by
 * the backend at payment approval.
 */
import type { Plan } from '@types';

const MIN_DAYS = 5;
const MAX_DAYS = 15;

export function planGiftedDaysFor(
  plan: Pick<Plan, 'giftedDaysMonthly' | 'giftedDaysYearly'>,
  cycle: 'monthly' | 'yearly'
): number | null {
  const value =
    cycle === 'yearly' ? plan.giftedDaysYearly : plan.giftedDaysMonthly;
  return typeof value === 'number' && value >= MIN_DAYS && value <= MAX_DAYS
    ? value
    : null;
}
