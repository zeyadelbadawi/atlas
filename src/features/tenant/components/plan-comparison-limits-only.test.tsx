/**
 * The dashboard Plan Comparison compares only what a plan ENFORCES.
 *
 * Pinned here: every enforced limit is compared; none of the former CMS /
 * SEO / Marketing / Analytics / Custom domain / Themes / Backup lines is
 * shown — even when a stale plan response still carries those keys — and
 * Live Sessions, an add-on, is never listed as something a plan lacks. In
 * English and Arabic.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { PlanComparisonDialog } from './PlanComparisonDialog';
import type { Plan } from '@types';

function makePlan(key: string, displayOrder: number): Plan {
  return {
    id: key,
    key,
    name: key,
    description: `${key} plan`,
    status: 'active',
    displayOrder,
    limits: {
      academies: 1,
      students: 100,
      instructors: 2,
      staff: 2,
      courses: 10,
      generalStorage: 5,
      videoStorage: 10,
      recordedSessions: 0,
    },
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

/** The labels the removed feature lines used to render, plus Live Sessions. */
const REMOVED_LABELS = {
  en: [
    'Content management (CMS)',
    'SEO',
    'Marketing',
    'Analytics',
    'Custom domain',
    'Themes',
    'Backup',
    'Live sessions',
  ],
  ar: [
    'إدارة المحتوى (CMS)',
    'تحسين محركات البحث',
    'التسويق',
    'التحليلات',
    'نطاق مخصص',
    'القوالب',
    'النسخ الاحتياطي',
    'الجلسات المباشرة',
  ],
} as const;

const LIMIT_LABELS = {
  en: [
    'Academies',
    'Students',
    'Instructors',
    'Staff',
    'Courses',
    'General storage',
    'Video storage',
    'Recorded sessions',
  ],
  ar: [
    'الأكاديميات',
    'الطلاب',
    'المدرّبون',
    'الموظفون',
    'الدورات',
    'التخزين العام',
    'تخزين الفيديو',
    'الجلسات المسجّلة',
  ],
} as const;

afterEach(() => cleanup());

describe.each(['en', 'ar'] as const)(
  'PlanComparisonDialog (%s)',
  (language) => {
    function renderDialog() {
      render(
        <I18nextProvider i18n={createI18nInstance(language)}>
          <PlanComparisonDialog
            open
            onOpenChange={vi.fn()}
            plans={[makePlan('starter', 1), makePlan('growth', 2)]}
            currentPlanKey="starter"
          />
        </I18nextProvider>
      );
      // The dialog renders into a portal on `document.body`.
      return document.body.textContent ?? '';
    }

    it('makes no plan claim for a feature Atlas does not enforce', () => {
      const text = renderDialog();
      for (const label of REMOVED_LABELS[language]) {
        expect(text).not.toContain(label);
      }
      expect(text).not.toContain('common.features');
    });

    it('still compares every enforced limit, for every plan', () => {
      const text = renderDialog();
      for (const label of LIMIT_LABELS[language]) {
        expect(text.split(label).length - 1).toBeGreaterThanOrEqual(2);
      }
    });
  }
);
