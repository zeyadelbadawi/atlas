/**
 * W8 — gifted setup days on the public marketing site.
 *
 * Pinned here: every day count comes from the plan's own catalog data
 * (`giftedDaysMonthly` / `giftedDaysYearly`), per cycle the plan can actually
 * be bought at; a plan without a gift (null, out of range, free, or a cycle
 * it cannot be bought at) renders nothing; the Pricing page only explains
 * the offer while some plan has one; English and Arabic (plural forms, RTL
 * copy).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import {
  planBillingCycles,
  planCatalogHasGifts,
  planCycleGifts,
  planCyclePrice,
} from '@utils';
import type { Plan } from '@types';
import {
  GiftedDaysExplainer,
  PlanGiftedDays,
  PlanGiftedDaysCell,
} from './PlanGiftedDays';

const plansState: { data: readonly Plan[] } = { data: [] };

vi.mock('../hooks/usePublicPlans', () => ({
  usePublicPlans: () => ({
    data: plansState.data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('../hooks/useStartPlanFlow', () => ({
  useStartPlanFlow: () => vi.fn(),
}));

// Imported after the mocks are declared (vitest hoists `vi.mock`).
const { default: PricingPage } = await import('../pages/PricingPage');

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

function withI18n(node: JSX.Element, language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      {node}
    </I18nextProvider>
  );
}

afterEach(() => cleanup());

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

describe('PlanGiftedDays (plan card)', () => {
  it('shows the plan’s own days per cycle', () => {
    withI18n(<PlanGiftedDays plan={BOTH} />);
    const note = screen.getByTestId('marketing-plan-gift-growth');
    expect(note.textContent).toContain(
      'Gifted setup days on a first paid subscription'
    );
    expect(note.textContent).toContain('Monthly billing: 9 days');
    expect(note.textContent).toContain('Yearly billing: 12 days');
  });

  it('omits a cycle the plan cannot be bought at', () => {
    withI18n(<PlanGiftedDays plan={MONTHLY_ONLY} />);
    const note = screen.getByTestId('marketing-plan-gift-basic');
    expect(note.textContent).toContain('Monthly billing: 5 days');
    expect(note.textContent).not.toContain('Yearly');
  });

  it('renders nothing when the plan has no gift', () => {
    const { container } = withI18n(<PlanGiftedDays plan={NONE} />);
    expect(container.textContent).toBe('');
  });

  it('uses Arabic plural forms', () => {
    withI18n(<PlanGiftedDays plan={BOTH} />, 'ar');
    const note = screen.getByTestId('marketing-plan-gift-growth');
    expect(note.textContent).toContain('أيام إعداد مُهداة مع أول اشتراك مدفوع');
    // 9 → "few" ("أيام"), 12 → "many" ("يومًا").
    expect(note.textContent).toContain('الفوترة الشهرية: 9 أيام');
    expect(note.textContent).toContain('الفوترة السنوية: 12 يومًا');
  });
});

describe('PlanGiftedDaysCell (comparison table)', () => {
  it('lists the days, or says "Not included" to a screen reader', () => {
    withI18n(
      <table>
        <tbody>
          <tr>
            <td data-testid="with">
              <PlanGiftedDaysCell plan={BOTH} />
            </td>
            <td data-testid="without">
              <PlanGiftedDaysCell plan={NONE} />
            </td>
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByTestId('with').textContent).toContain(
      'Monthly billing: 9 days'
    );
    expect(screen.getByTestId('without').textContent).toContain('Not included');
  });
});

describe('GiftedDaysExplainer', () => {
  it('states the conditions without promising a gift on every plan (EN)', () => {
    withI18n(<GiftedDaysExplainer />);
    const section = screen.getByTestId('pricing-gifted-days');
    const text = section.textContent ?? '';
    expect(text).toContain('Some plans include gifted setup days');
    expect(text).toContain('Some plans and billing cycles include none');
    expect(text).toContain('Once per customer');
    expect(text).toContain('renewals, plan changes');
    expect(text).toContain('Separate from the free trial');
    expect(text).not.toMatch(/\b7\b|\b14\b/);
  });

  it('is fully translated (AR)', () => {
    withI18n(<GiftedDaysExplainer />, 'ar');
    const text = screen.getByTestId('pricing-gifted-days').textContent ?? '';
    expect(text).toContain('تتضمن بعض الخطط أيام إعداد مُهداة');
    expect(text).toContain('مرة واحدة لكل عميل');
    expect(text).toContain('منفصلة عن الفترة التجريبية المجانية');
    expect(text).not.toMatch(/[A-Za-z]{3,}/);
  });
});

describe('PricingPage — gifted days from the catalog', () => {
  it('shows each plan’s gift, a comparison row, and the explainer', () => {
    plansState.data = [NONE, BOTH, MONTHLY_ONLY];
    withI18n(<PricingPage />);
    expect(screen.queryByTestId('marketing-plan-gift-starter')).toBeNull();
    expect(
      screen.getByTestId('marketing-plan-gift-growth').textContent
    ).toContain('Yearly billing: 12 days');
    const row = screen.getByTestId('pricing-comparison-gift-row');
    expect(within(row).getAllByRole('cell')).toHaveLength(3);
    expect(row.textContent).toContain('Monthly billing: 5 days');
    expect(screen.getByTestId('pricing-gifted-days')).toBeTruthy();
  });

  it('hides the row and explainer when only unpriced plans carry a gift', () => {
    plansState.data = [
      NONE,
      makePlan({
        key: 'contact-us',
        pricing: undefined,
        giftedDaysMonthly: 7,
        giftedDaysYearly: 14,
      }),
    ];
    withI18n(<PricingPage />);
    expect(screen.queryByTestId('marketing-plan-gift-contact-us')).toBeNull();
    expect(screen.queryByTestId('pricing-comparison-gift-row')).toBeNull();
    expect(screen.queryByTestId('pricing-gifted-days')).toBeNull();
  });

  it('says nothing about gifted days when no plan offers any', () => {
    plansState.data = [NONE];
    withI18n(<PricingPage />);
    expect(screen.queryByTestId('pricing-comparison-gift-row')).toBeNull();
    expect(screen.queryByTestId('pricing-gifted-days')).toBeNull();
    expect(document.body.textContent).not.toContain('Gifted setup days');
  });
});
