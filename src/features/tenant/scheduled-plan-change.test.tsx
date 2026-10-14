/**
 * B0-BIL-04 — the subscription page says when a smaller plan bought
 * mid-period takes over, and only when one is scheduled.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ScheduledPlanChangeNotice } from './components/ScheduledPlanChangeNotice';
import type { TenantSubscription } from '@types';

const base = {
  organizationId: 'org-1',
  status: 'active',
  planId: 'academy',
  cancelAtPeriodEnd: false,
} as unknown as TenantSubscription;

function renderNotice(
  subscription: TenantSubscription,
  language: 'en' | 'ar' = 'en'
) {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <ScheduledPlanChangeNotice subscription={subscription} />
    </I18nextProvider>
  );
}

afterEach(() => cleanup());

describe('ScheduledPlanChangeNotice', () => {
  it('renders nothing when no change is scheduled', () => {
    renderNotice(base);
    expect(screen.queryByTestId('subscription-scheduled-change')).toBeNull();
  });

  it('names the new plan and says nothing changes before then', () => {
    renderNotice({
      ...base,
      scheduledChange: {
        planId: 'teacher',
        planName: 'Teacher',
        effectiveAt: '2026-11-01T00:00:00.000Z',
      },
    });
    const notice = screen.getByTestId('subscription-scheduled-change');
    expect(notice.textContent).toContain('Teacher');
    expect(notice.textContent).toContain('Until then you keep everything');
  });

  it('is translated in Arabic', () => {
    renderNotice(
      {
        ...base,
        scheduledChange: {
          planId: 'teacher',
          planName: 'Teacher',
          effectiveAt: '2026-11-01T00:00:00.000Z',
        },
      },
      'ar'
    );
    expect(
      screen.getByTestId('subscription-scheduled-change').textContent
    ).toContain('ستتغير باقتك');
  });
});
