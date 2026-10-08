/**
 * The public Pricing page advertises only what a plan ENFORCES.
 *
 * Pinned here: the plan cards and the comparison table show the real,
 * enforced limits, and none of the former CMS / SEO / Marketing /
 * Analytics / Custom domain / Themes / Backup rows — even when a stale
 * plan response still carries those keys — in English and Arabic.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { Plan } from '@types';

const LIMITS = {
  academies: 1,
  students: 100,
  instructors: 2,
  staff: 2,
  courses: 10,
  generalStorage: 5,
  videoStorage: 10,
  recordedSessions: 0,
} as Plan['limits'];

function makePlan(key: string, displayOrder: number): Plan {
  return {
    id: key,
    key,
    name: key,
    description: `${key} plan`,
    status: 'active',
    displayOrder,
    limits: LIMITS,
    // A response from before the legacy keys were removed.
    features: {
      liveSessions: false,
      cms: true,
      seo: true,
      seoAdvanced: true,
      marketing: true,
      marketingAdvanced: true,
      analytics: true,
      analyticsAdvanced: true,
      customDomain: true,
      themes: true,
      multipleThemes: true,
      backup: true,
    } as unknown as Plan['features'],
    trialEligible: false,
    version: 1,
    pricing: { amount: 29, currency: 'USD', billingCycle: 'monthly' },
  } as Plan;
}

vi.mock('../hooks/usePublicPlans', () => ({
  usePublicPlans: () => ({
    data: [makePlan('starter', 1), makePlan('growth', 2)],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('../hooks/useStartPlanFlow', () => ({
  useStartPlanFlow: () => vi.fn(),
}));

// Imported after the mocks are declared (vitest hoists `vi.mock`).
const { default: PricingPage } = await import('./PricingPage');

/** The labels the removed feature rows used to render. */
const REMOVED_LABELS = {
  en: [
    'Website and CMS',
    'Website themes',
    'Multiple themes',
    'Custom domain',
    'SEO tools',
    'Advanced SEO',
    'Marketing tools',
    'Advanced marketing tools',
    'Analytics',
    'Advanced analytics',
    'Automated backups',
    'Not included',
  ],
  ar: [
    'الموقع ونظام إدارة المحتوى',
    'قوالب الموقع',
    'قوالب متعددة',
    'نطاق مخصّص',
    'أدوات تحسين محركات البحث',
    'تحسين محركات بحث متقدّم',
    'أدوات تسويقية',
    'أدوات تسويقية متقدّمة',
    'التحليلات',
    'تحليلات متقدّمة',
    'نسخ احتياطية تلقائية',
    'غير متضمَّن',
  ],
} as const;

const LIMIT_LABELS = {
  en: [
    'Academies',
    'Students',
    'Instructors',
    'Staff members',
    'Courses',
    'Storage',
    'Video storage',
  ],
  ar: [
    'الأكاديميات',
    'الطلاب',
    'المعلمون',
    'أعضاء الفريق',
    'الدورات',
    'التخزين',
    'تخزين الفيديو',
  ],
} as const;

afterEach(() => cleanup());

describe.each(['en', 'ar'] as const)('PricingPage (%s)', (language) => {
  function renderPage() {
    return render(
      <I18nextProvider i18n={createI18nInstance(language)}>
        <PricingPage />
      </I18nextProvider>
    );
  }

  it('makes no plan claim for a feature Atlas does not enforce', () => {
    const { container } = renderPage();
    const text = container.textContent ?? '';
    for (const label of REMOVED_LABELS[language]) {
      expect(text).not.toContain(label);
    }
    // Nor a raw, untranslated key.
    expect(text).not.toContain('pricing:features');
  });

  it('still compares every enforced limit', () => {
    renderPage();
    const table = screen.getByRole('table');
    const rowHeaders = Array.from(
      table.querySelectorAll('tbody th[scope="row"]')
    ).map((cell) => cell.textContent);
    expect(rowHeaders).toEqual([...LIMIT_LABELS[language]]);
    // One column per plan, filled from the plan's own limits.
    expect(table.querySelectorAll('thead th')).toHaveLength(3);
  });
});
