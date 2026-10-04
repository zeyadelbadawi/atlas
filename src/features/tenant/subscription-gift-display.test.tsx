/**
 * W8 — owner billing display of gifted setup days.
 *
 * Pinned here: "Includes N gifted setup days" with days left, the gifted
 * segment and the paid period it precedes; nothing at all without a gift;
 * the first-purchase offer only while the backend says it is available and
 * the plan offers a gift for that cycle; Arabic plural copy.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { SubscriptionGiftDetails } from './components/SubscriptionGiftDetails';
import { PlanGiftOffer } from './components/PlanGiftOffer';
import { planGiftedDaysFor } from './utils/gifted-days.utils';

const GIFTED = {
  giftedDays: 7,
  giftedStartsAt: '2026-11-04T10:00:00.000Z',
  giftedEndsAt: '2026-11-11T10:00:00.000Z',
  currentPeriodStart: '2026-11-11T10:00:00.000Z',
  currentPeriodEnd: '2026-12-11T10:00:00.000Z',
};

function withI18n(node: JSX.Element, language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      {node}
    </I18nextProvider>
  );
}

afterEach(() => cleanup());

describe('SubscriptionGiftDetails', () => {
  it('shows the gift, days left, and the paid period that follows it', () => {
    withI18n(
      <SubscriptionGiftDetails
        subscription={GIFTED}
        now={new Date('2026-11-06T09:00:00.000Z')}
      />
    );
    const panel = screen.getByTestId('subscription-gift');
    expect(panel.textContent).toContain('Includes 7 gifted setup days');
    expect(panel.textContent).toContain('6 gifted days left');
    expect(panel.textContent).toContain('Gifted setup days');
    expect(panel.textContent).toContain('Paid period');
    expect(panel.textContent).toContain('Your paid period starts on');
    // Accessible name for the region comes from the heading line.
    expect(panel.getAttribute('aria-labelledby')).toBe(
      'subscription-gift-title'
    );
  });

  it('drops the countdown once the gift is over', () => {
    withI18n(
      <SubscriptionGiftDetails
        subscription={GIFTED}
        now={new Date('2026-11-20T00:00:00.000Z')}
      />
    );
    const panel = screen.getByTestId('subscription-gift');
    expect(panel.textContent).toContain('Includes 7 gifted setup days');
    expect(panel.textContent).not.toContain('left');
    expect(panel.textContent).not.toContain('starts on');
  });

  it('renders nothing for a subscription without a gift', () => {
    const { container } = withI18n(
      <SubscriptionGiftDetails
        subscription={{
          currentPeriodStart: GIFTED.currentPeriodStart,
          currentPeriodEnd: GIFTED.currentPeriodEnd,
        }}
      />
    );
    expect(container.textContent).toBe('');
  });

  it('uses Arabic plural forms', () => {
    withI18n(
      <SubscriptionGiftDetails
        subscription={{ ...GIFTED, giftedDays: 14 }}
        now={new Date('2026-11-01T00:00:00.000Z')}
      />,
      'ar'
    );
    expect(screen.getByTestId('subscription-gift').textContent).toContain(
      'يتضمن 14 يومًا من أيام الإعداد المُهداة'
    );
  });
});

describe('PlanGiftOffer', () => {
  const plan = { giftedDaysMonthly: 7, giftedDaysYearly: 14 };

  it('offers the gift for the chosen cycle while it is available', () => {
    withI18n(
      <PlanGiftOffer plan={plan} cycle="yearly" giftAvailable showNote />
    );
    const offer = screen.getByTestId('plan-gift-offer');
    expect(offer.textContent).toContain(
      'Your first paid subscription includes 14 gifted setup days'
    );
    expect(offer.textContent).toContain('once your payment is confirmed');
  });

  it('is hidden when the customer already used the gift, or the plan has none', () => {
    const { container, rerender } = withI18n(
      <PlanGiftOffer plan={plan} cycle="monthly" giftAvailable={false} />
    );
    expect(container.textContent).toBe('');
    rerender(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <PlanGiftOffer
          plan={{ giftedDaysMonthly: null, giftedDaysYearly: 14 }}
          cycle="monthly"
          giftAvailable
        />
      </I18nextProvider>
    );
    expect(container.textContent).toBe('');
  });

  it('ignores out-of-range configuration', () => {
    expect(
      planGiftedDaysFor(
        { giftedDaysMonthly: 4, giftedDaysYearly: 16 },
        'monthly'
      )
    ).toBeNull();
    expect(
      planGiftedDaysFor(
        { giftedDaysMonthly: 4, giftedDaysYearly: 16 },
        'yearly'
      )
    ).toBeNull();
    expect(planGiftedDaysFor({}, 'monthly')).toBeNull();
  });
});
