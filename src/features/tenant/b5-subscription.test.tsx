/**
 * B5 (UX audit) — the subscription, plans and cancellation say what the
 * code really does.
 *
 *  V09/V32  price, cycle, next payment date; manual payment ("Atlas doesn't
 *           charge you automatically"); the trial's end date and what
 *           happens — EN and AR, real catalogues.
 *  V10      the current plan is marked and its action says what it does;
 *           prices on the cards; no greyed button without a reason.
 *  V13/V26  the cancel dialog: reason marked and asked for, counter, a
 *           failure stays inline with the typed feedback.
 *  V21      seeded catalog names translated only while unchanged.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import { createApiError } from '@api';
import { SubscriptionBillingDetails } from './components/SubscriptionBillingDetails';
import { CancelSubscriptionDialog } from './components/CancelSubscriptionDialog';
import { PlanComparisonDialog } from './components/PlanComparisonDialog';
import { pickCatalogText } from './utils/catalog-text.utils';
import { planCyclePrice } from './utils/plan-text.utils';
import en from '@/localization/resources/en/tenant.json';
import ar from '@/localization/resources/ar/tenant.json';
import type { LanguageCode, Plan, TenantSubscription } from '@types';

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

afterEach(cleanup);

function wrap(children: JSX.Element, language: LanguageCode = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <AtlasDialogProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </AtlasDialogProvider>
    </I18nextProvider>
  );
}

const GROWTH = {
  id: 'p-growth',
  key: 'growth',
  name: 'Growth',
  status: 'active',
  displayOrder: 2,
  limits: new Proxy({}, { get: () => 5 }),
  features: {},
  pricing: {
    amount: 699,
    currency: 'EGP',
    billingCycle: 'monthly',
    yearlyAmount: 6990,
  },
} as unknown as Plan;

const ACTIVE = {
  organizationId: 'org-1',
  status: 'active',
  planId: 'p-growth',
  plan: GROWTH,
  billingCycle: 'yearly',
  // Local noon: the asserted date holds in every time zone.
  currentPeriodEnd: new Date(2027, 2, 1, 12).toISOString(),
  cancelAtPeriodEnd: false,
} as unknown as TenantSubscription;

describe('V09 — subscription billing details', () => {
  it('shows price, cycle, next payment date and that nothing is charged automatically', () => {
    wrap(<SubscriptionBillingDetails subscription={ACTIVE} />);
    expect(screen.getByTestId('subscription-price').textContent).toMatch(
      /EGP\s6,990\.00 \/ yr/
    );
    expect(screen.getByTestId('subscription-cycle').textContent).toBe('Yearly');
    expect(screen.getByTestId('subscription-period-end').textContent).toBe(
      '1 Mar 2027'
    );
    expect(screen.getByText('Next payment due')).toBeTruthy();
    const note = screen.getByTestId('subscription-manual-note').textContent;
    expect(note).toContain("Atlas doesn't charge you automatically.");
    expect(note).toContain('before 1 Mar 2027');
    expect(note).not.toMatch(/renew/i);
    expect(
      screen.getByTestId('subscription-pay-next-period').getAttribute('href')
    ).toBe('/dashboard/tenant/billing/checkout/plan_subscription/growth');
  });

  it('says it in Arabic', () => {
    wrap(<SubscriptionBillingDetails subscription={ACTIVE} />, 'ar');
    expect(
      screen.getByTestId('subscription-manual-note').textContent
    ).toContain('لا يخصم أطلس أي مبلغ تلقائيًا');
    expect(screen.getByText('موعد الدفعة التالية')).toBeTruthy();
  });

  it('after cancelling: access until the date, nothing more due', () => {
    wrap(
      <SubscriptionBillingDetails
        subscription={{ ...ACTIVE, cancelAtPeriodEnd: true }}
      />
    );
    expect(screen.getByText('Access until')).toBeTruthy();
    expect(
      screen.getByTestId('subscription-manual-note').textContent
    ).toContain('nothing more is due');
  });

  it('V32 — a trial: its end date, nothing charged, nothing deleted', () => {
    wrap(
      <SubscriptionBillingDetails
        subscription={
          {
            ...ACTIVE,
            status: 'trialing',
            trialEndsAt: new Date(2026, 10, 13, 12).toISOString(),
          } as TenantSubscription
        }
      />
    );
    const details = screen.getByTestId('subscription-trial-details');
    expect(details.textContent).toContain('Your trial ends on 13 Nov 2026.');
    expect(details.textContent).toContain('Nothing is charged automatically.');
    expect(details.textContent).toContain('Nothing is deleted');
  });

  it('cancel copy never says "renew" (manual payment) and the trial copy says what is kept', () => {
    for (const catalogue of [en, ar]) {
      expect(catalogue.cancellation.subscriptionDescriptionWithDate).toContain(
        '{{date}}'
      );
    }
    expect(en.cancellation.subscriptionDescription).not.toMatch(/renew/i);
    expect(en.cancellation.subscriptionDescriptionWithDate).not.toMatch(
      /renew/i
    );
    expect(en.subscription.cancelAtPeriodEnd).not.toMatch(/renew/i);
    expect(ar.cancellation.subscriptionDescriptionWithDate).not.toContain(
      'تجديد'
    );
    expect(en.cancellation.trialDescription).toContain(
      'your academies, courses and students stay'
    );
  });

  it('prices a cycle as the backend does', () => {
    expect(planCyclePrice(GROWTH.pricing, 'monthly')).toBe(699);
    expect(planCyclePrice(GROWTH.pricing, 'yearly')).toBe(6990);
    expect(
      planCyclePrice(
        { amount: 1, currency: 'EGP', billingCycle: 'yearly' },
        'monthly'
      )
    ).toBeUndefined();
  });
});

describe('V13 / V26 — the cancel dialog', () => {
  const renderDialog = (
    props: Partial<Parameters<typeof CancelSubscriptionDialog>[0]> = {}
  ) => {
    const onConfirm = vi.fn();
    wrap(
      <CancelSubscriptionDialog
        open
        onOpenChange={vi.fn()}
        kind="paid"
        accessEndsOn="1 Mar 2027"
        isSubmitting={false}
        onConfirm={onConfirm}
        {...props}
      />
    );
    return { onConfirm };
  };

  it('marks the reason required and asks for it instead of greying the button', () => {
    const { onConfirm } = renderDialog();
    expect(
      screen.getByText('Why are you cancelling?').parentElement?.textContent
    ).toContain('This field is required');
    const confirm = screen.getByTestId('cancellation-confirm');
    expect(confirm.hasAttribute('disabled')).toBe(false);
    fireEvent.click(confirm);
    expect(screen.getByTestId('cancellation-reason-error').textContent).toBe(
      'Choose a reason to continue.'
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('counts the feedback against the real 2,000 limit, without cutting it', () => {
    renderDialog();
    const feedback = screen.getByTestId('cancellation-feedback');
    expect(feedback.hasAttribute('maxlength')).toBe(false);
    fireEvent.change(feedback, { target: { value: 'f'.repeat(2001) } });
    expect(screen.getByTestId('cancellation-feedback-count').textContent).toBe(
      '2001 / 2000 characters'
    );
  });

  it('shows a failure inline and keeps what was typed', () => {
    renderDialog({
      error: createApiError('network', { messageKey: 'errors.network' }),
    });
    fireEvent.change(screen.getByTestId('cancellation-feedback'), {
      target: { value: 'Too pricey for us' },
    });
    const alert = screen.getByTestId('save-failed');
    expect(alert.textContent).toContain("We couldn't cancel that");
    expect(alert.textContent).toContain('Atlas could not reach the server');
    expect(
      (screen.getByTestId('cancellation-feedback') as HTMLTextAreaElement).value
    ).toBe('Too pricey for us');
  });

  it('a server refusal on the feedback clears once the feedback is edited', () => {
    renderDialog({
      error: createApiError('validation', {
        status: 400,
        messageKey: 'errors.validation',
        violations: [{ field: 'feedback', messageKey: 'validation.maxLength' }],
      }),
    });
    expect(screen.getByTestId('cancellation-feedback-error')).toBeTruthy();
    fireEvent.change(screen.getByTestId('cancellation-feedback'), {
      target: { value: 'Shorter now' },
    });
    expect(screen.queryByTestId('cancellation-feedback-error')).toBeNull();
    // The refusal was about a field the person has acted on: no general
    // alert replaces the field message.
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('says what is kept, in the paid copy', () => {
    renderDialog();
    expect(
      screen.getByText(
        /Your subscription ends on 1 Mar 2027 instead of continuing/
      )
    ).toBeTruthy();
  });
});

describe('V10 — the plan comparison', () => {
  const STARTER = {
    ...GROWTH,
    id: 'p-starter',
    key: 'starter',
    name: 'Starter',
    displayOrder: 1,
    pricing: undefined,
  } as unknown as Plan;

  it('marks the current plan, says what checking it out does, and shows prices', () => {
    const onSelect = vi.fn();
    wrap(
      <PlanComparisonDialog
        open
        onOpenChange={vi.fn()}
        plans={[STARTER, GROWTH]}
        currentPlanKey="growth"
        currentStatus="active"
        onSelectPlan={onSelect}
      />
    );
    expect(screen.getByText('Current plan')).toBeTruthy();
    expect(screen.getByTestId('plan-price-growth').textContent).toMatch(
      /EGP\s699\.00 \/ mo.*or.*EGP\s6,990\.00 \/ yr/
    );
    expect(
      screen.getByTestId('current-plan-note-growth').textContent
    ).toContain('no paid day is lost');
    fireEvent.click(screen.getByTestId('current-plan-action-growth'));
    expect(onSelect).toHaveBeenCalledWith(GROWTH);
    expect(screen.getByTestId('current-plan-action-growth').textContent).toBe(
      'Pay for the next period'
    );
    // No price: a reason instead of a greyed "Select this plan".
    expect(screen.getByTestId('plan-not-for-sale-starter').textContent).toBe(
      'Not available to buy yet. Contact support if you need this plan.'
    );
  });
});

describe('V21 — seeded catalog names', () => {
  it('translates only while the backend text is still the seeded one', () => {
    expect(
      pickCatalogText('Extra Academy', 'Extra Academy', 'أكاديمية إضافية')
    ).toBe('أكاديمية إضافية');
    expect(
      pickCatalogText('Two more schools', 'Extra Academy', 'أكاديمية إضافية')
    ).toBe('Two more schools');
    expect(pickCatalogText('Bank Transfer', undefined, undefined)).toBe(
      'Bank Transfer'
    );
  });

  it('has the active add-on count in plural forms (V34)', () => {
    const i18n = createI18nInstance('en');
    expect(i18n.t('tenant:dashboard.activeAddOnsCount', { count: 1 })).toBe(
      '1 active add-on'
    );
    expect(i18n.t('tenant:dashboard.activeAddOnsCount', { count: 3 })).toBe(
      '3 active add-ons'
    );
    const arabic = createI18nInstance('ar');
    expect(arabic.t('tenant:dashboard.activeAddOnsCount', { count: 2 })).toBe(
      'إضافتان نشطتان'
    );
  });
});
