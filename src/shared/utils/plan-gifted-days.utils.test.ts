/**
 * W8 — the plan gift helpers (`@utils`), used by the checkout page.
 *
 * Moved verbatim from the retired marketing Pricing page's test
 * (`features/home/components/plan-gifted-days.test.tsx`, removed with that
 * page under owner decision D6): the helpers stay, so their tests stay.
 *
 * Pinned here: every day count comes from the plan's own catalog data
 * (`giftedDaysMonthly` / `giftedDaysYearly`), per cycle the plan can
 * actually be bought at; a plan without a gift (null, out of range, free,
 * or a cycle it cannot be bought at) has none.
 */
import { describe, expect, it } from 'vitest';
import {
  planBillingCycles,
  planCatalogHasGifts,
  planCycleGifts,
  planCyclePrice,
} from '@utils';
import type { Plan } from '@types';

const LIMITS = {
  academies: 1,
  students: 100,
  instructors: 2,
  staff: 2,
  courses: 10,
  generalStorage: 5,
  videoStorage: 10,
} as unknown as Plan['limits'];

function makePlan(overrides: Partial<Plan> & Pick<Plan, 'key'>): Plan {
  return {
    id: overrides.key,
    name: overrides.key,
    description: `${overrides.key} plan`,
    displayOrder: 1,
    limits: LIMITS,
    features: {} as Plan['features'],
    trialEligible: true,
    version: 1,
    pricing: { amount: 29, currency: 'USD', billingCycle: 'monthly' },
    ...overrides,
  } as Plan;
}

/** Monthly + yearly purchasable, 9 / 12 gifted days — deliberately not 7 / 14. */
const BOTH = makePlan({
  key: 'growth',
  pricing: {
    amount: 49,
    currency: 'USD',
    billingCycle: 'monthly',
    yearlyAmount: 490,
  },
  giftedDaysMonthly: 9,
  giftedDaysYearly: 12,
});
/** No gift at all. */
const NONE = makePlan({
  key: 'starter',
  giftedDaysMonthly: null,
  giftedDaysYearly: null,
});
/** A yearly gift on a plan that cannot be bought yearly. */
const MONTHLY_ONLY = makePlan({
  key: 'basic',
  giftedDaysMonthly: 5,
  giftedDaysYearly: 15,
});

describe('plan gift helpers (@utils)', () => {
  it('reads each purchasable cycle from the plan data', () => {
    expect(planCycleGifts(BOTH)).toEqual([
      { cycle: 'monthly', days: 9 },
      { cycle: 'yearly', days: 12 },
    ]);
    expect(planCycleGifts(MONTHLY_ONLY)).toEqual([
      { cycle: 'monthly', days: 5 },
    ]);
  });

  it('returns nothing for null, absent, out-of-range or free plans', () => {
    expect(planCycleGifts(NONE)).toEqual([]);
    expect(planCycleGifts(makePlan({ key: 'absent' }))).toEqual([]);
    expect(
      planCycleGifts(makePlan({ key: 'big', giftedDaysMonthly: 16 }))
    ).toEqual([]);
    expect(
      planCycleGifts(
        makePlan({
          key: 'free',
          pricing: { amount: 0, currency: 'USD', billingCycle: 'monthly' },
          giftedDaysMonthly: 7,
        })
      )
    ).toEqual([]);
  });

  it('knows which cycles a plan can be bought at', () => {
    expect(planBillingCycles(BOTH.pricing)).toEqual(['monthly', 'yearly']);
    expect(planBillingCycles({ billingCycle: 'yearly', amount: 1 })).toEqual([
      'yearly',
    ]);
    expect(planBillingCycles(undefined)).toEqual(['monthly']);
  });

  it('detects whether any plan in the catalog has a gift', () => {
    expect(planCatalogHasGifts([NONE])).toBe(false);
    expect(planCatalogHasGifts([NONE, BOTH])).toBe(true);
  });

  it('pairs each cycle with its own catalog price', () => {
    expect(planCyclePrice(BOTH.pricing, 'monthly')).toBe(49);
    expect(planCyclePrice(BOTH.pricing, 'yearly')).toBe(490);
    expect(
      planCyclePrice({ billingCycle: 'yearly', amount: 300 }, 'yearly')
    ).toBe(300);
    expect(planCyclePrice(undefined, 'monthly')).toBeUndefined();
  });

  it('needs a nonzero price for the cycle before offering its gift', () => {
    const gifts = { giftedDaysMonthly: 7, giftedDaysYearly: 14 };
    // No pricing at all, or no amount: no monthly gift.
    expect(
      planCycleGifts(
        makePlan({ key: 'unpriced', pricing: undefined, ...gifts })
      )
    ).toEqual([]);
    expect(
      planCycleGifts(
        makePlan({
          key: 'no-amount',
          pricing: { currency: 'USD', billingCycle: 'monthly' },
          ...gifts,
        })
      )
    ).toEqual([]);
    // A zero yearly price: monthly keeps its gift, yearly gets none.
    expect(
      planCycleGifts(
        makePlan({
          key: 'zero-yearly',
          pricing: {
            amount: 29,
            currency: 'USD',
            billingCycle: 'monthly',
            yearlyAmount: 0,
          },
          ...gifts,
        })
      )
    ).toEqual([{ cycle: 'monthly', days: 7 }]);
    // A yearly-priced plan with a real price keeps its yearly gift.
    expect(
      planCycleGifts(
        makePlan({
          key: 'yearly',
          pricing: { amount: 300, currency: 'USD', billingCycle: 'yearly' },
          ...gifts,
        })
      )
    ).toEqual([{ cycle: 'yearly', days: 14 }]);
  });

  it('ignores unpriced offers when deciding whether the catalog has gifts', () => {
    const unpriced = makePlan({
      key: 'contact-us',
      pricing: undefined,
      giftedDaysMonthly: 7,
      giftedDaysYearly: 14,
    });
    expect(planCatalogHasGifts([NONE, unpriced])).toBe(false);
  });
});
