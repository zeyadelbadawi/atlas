/**
 * B0-BIL-06 — the Platform Owner's subscription remedies on the
 * organization page send the right request, and a missing reason or an
 * out-of-range day count is caught before any request.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';

const mutate = vi.fn();

vi.mock('../hooks', () => ({
  useSubscriptionAdjustment: () => ({
    mutate,
    isPending: false,
    error: null,
  }),
}));
vi.mock('@features/tenant', () => ({
  usePlanCatalog: () => ({ data: [{ key: 'academy' }, { key: 'teacher' }] }),
}));
vi.mock('@app/providers', () => ({
  useToast: () => ({ notifySuccess: vi.fn() }),
}));

import { SubscriptionAdjustmentsCard } from './SubscriptionAdjustmentsCard';

function renderCard(language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <SubscriptionAdjustmentsCard organizationId="org-1" />
    </I18nextProvider>
  );
}

const REASON = 'Founding academy pilot agreed';

afterEach(() => {
  cleanup();
  mutate.mockReset();
});

describe('SubscriptionAdjustmentsCard', () => {
  it('extends by a number of days with a reason', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Extend' }));
    fireEvent.change(screen.getByLabelText('Days'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: REASON },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(mutate).toHaveBeenCalledWith(
      { kind: 'extend', days: 10, reason: REASON },
      expect.any(Object)
    );
  });

  it('records a grant separately from an extension', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Grant days' }));
    fireEvent.change(screen.getByLabelText('Days'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: REASON },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(mutate.mock.calls[0][0]).toMatchObject({
      kind: 'grant-days',
      days: 5,
    });
  });

  it('refuses a short reason or an out-of-range day count without a request', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Extend' }));
    fireEvent.change(screen.getByLabelText('Days'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByRole('alert').textContent).toContain(
      'at least 10 characters'
    );

    fireEvent.change(screen.getByLabelText('Days'), {
      target: { value: '400' },
    });
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: REASON },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByRole('alert').textContent).toContain('from 1 to 365');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('changes the plan by key, at the end of the paid period', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Change plan' }));
    fireEvent.change(screen.getByLabelText('Plan key'), {
      target: { value: 'founding-academy' },
    });
    fireEvent.click(screen.getByLabelText('At the end of the paid period'));
    fireEvent.change(screen.getByLabelText('Reason'), {
      target: { value: REASON },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(mutate).toHaveBeenCalledWith(
      {
        kind: 'change-plan',
        planKey: 'founding-academy',
        applyAt: 'period_end',
        reason: REASON,
      },
      expect.any(Object)
    );
  });

  it('is translated in Arabic', () => {
    renderCard('ar');
    expect(screen.getByRole('button', { name: 'تمديد' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'منح أيام' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تغيير الخطة' })).toBeTruthy();
  });
});
