/**
 * B2 — the owner's Founding Academy card: "price locked until {date}" and
 * the renewal amount the server decided (founding price inside the lock,
 * catalog price after it). Nothing renders for a non-member.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { TenantSubscription } from '@types';
import { FoundingMembershipNotice } from './components/FoundingMembershipNotice';

const base = {
  organizationId: 'org-1',
  status: 'active',
  planId: 'growth',
  cancelAtPeriodEnd: false,
} as unknown as TenantSubscription;

const member = {
  ...base,
  founding: {
    status: 'active',
    seatNumber: 3,
    planId: 'growth',
    lockedPrice: { amount: 27900, currency: 'EGP' },
    lockStartsAt: '2026-10-01T00:00:00.000Z',
    lockEndsAt: '2028-10-01T00:00:00.000Z',
    nextRenewal: {
      amount: 27900,
      currency: 'EGP',
      locked: true,
      periodStartsAt: '2027-10-01T00:00:00.000Z',
    },
  },
} as TenantSubscription;

function renderNotice(
  subscription: TenantSubscription,
  language: 'en' | 'ar' = 'en'
) {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <FoundingMembershipNotice subscription={subscription} />
    </I18nextProvider>
  );
}

afterEach(() => cleanup());

describe('FoundingMembershipNotice', () => {
  it('renders nothing for a non-member', () => {
    renderNotice(base);
    expect(screen.queryByTestId('subscription-founding')).toBeNull();
  });

  it('shows the lock end date and the renewal at the founding price', () => {
    renderNotice(member);
    const card = screen.getByTestId('subscription-founding');
    expect(card.textContent).toContain('Founding Academy — price locked until');
    expect(card.textContent).toContain('2028');
    expect(
      screen.getByTestId('subscription-founding-renewal').textContent
    ).toMatch(/founding price: .*27,900/);
  });

  it('says the renewal is at the current yearly price once it falls after the lock', () => {
    renderNotice({
      ...member,
      founding: {
        ...member.founding!,
        status: 'ended',
        nextRenewal: {
          ...member.founding!.nextRenewal!,
          amount: 30000,
          locked: false,
        },
      },
    } as TenantSubscription);
    expect(screen.getByTestId('subscription-founding').textContent).toContain(
      'price lock has ended'
    );
    expect(
      screen.getByTestId('subscription-founding-renewal').textContent
    ).toMatch(/current yearly price: .*30,000/);
  });

  it('renders in Arabic', () => {
    renderNotice(member, 'ar');
    expect(screen.getByTestId('subscription-founding').textContent).toContain(
      'أكاديمية مؤسِّسة'
    );
  });
});
