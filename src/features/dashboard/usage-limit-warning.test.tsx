/**
 * B0-BIL-13 — the dashboard calls out plan limits at 80 % or more, with a
 * link to compare plans; below that, no banner.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { UsageSummary } from './components/UsageSummary';
import type { TenantUsage } from '@types';

afterEach(cleanup);

const metric = (used: number, limit: number | 'unlimited') => ({ used, limit });

function usage(overrides: Partial<TenantUsage> = {}): TenantUsage {
  return {
    organizationId: 'org-1',
    academies: metric(1, 3),
    students: metric(10, 100),
    instructors: metric(1, 5),
    staff: metric(0, 5),
    courses: metric(2, 40),
    generalStorage: metric(1, 10),
    videoStorage: metric(0, 10),
    updatedAt: '2026-10-13T00:00:00.000Z',
    ...overrides,
  } as TenantUsage;
}

function renderUsage(value: TenantUsage, language: 'en' | 'ar' = 'en') {
  render(
    <MemoryRouter>
      <I18nextProvider i18n={createI18nInstance(language)}>
        <UsageSummary usage={value} />
      </I18nextProvider>
    </MemoryRouter>
  );
}

describe('UsageSummary — plan limit warning (B0-BIL-13)', () => {
  it('shows no banner below 80 %', () => {
    renderUsage(usage({ students: metric(79, 100) }));
    expect(screen.queryByTestId('usage-limit-warning')).toBeNull();
  });

  it('names every limit at 80 % or more and links to the plans page', () => {
    renderUsage(
      usage({ students: metric(85, 100), generalStorage: metric(10, 10) })
    );
    expect(screen.getByTestId('usage-limit-warning').textContent).toContain(
      'Close to or at your plan limit: Students (85%), Storage (100%).'
    );
    expect(
      screen.getByRole('link', { name: 'Compare plans' }).getAttribute('href')
    ).toBe('/dashboard/plans');
  });

  it('ignores unlimited metrics', () => {
    renderUsage(usage({ students: metric(5000, 'unlimited') }));
    expect(screen.queryByTestId('usage-limit-warning')).toBeNull();
  });

  it('renders in Arabic', () => {
    renderUsage(usage({ courses: metric(40, 40) }), 'ar');
    expect(screen.getByTestId('usage-limit-warning').textContent).toContain(
      'اقتربت من حد خطتك أو وصلت إليه'
    );
  });
});
