/**
 * B0-WEB-10 — the Statistics editor says plainly that a live learner
 * count is public: the hint shows while an item uses the students
 * metric, and not for courses or instructors.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { SectionConfigForm } from './SectionConfigForm';
import type { StatisticsSectionConfig } from '@types';

vi.mock('../hooks', () => ({
  useWebsiteFaqEntries: () => ({ data: undefined }),
  useWebsiteTestimonialEntries: () => ({ data: undefined }),
}));
vi.mock('@features/course', () => ({
  useCourses: () => ({ data: undefined }),
}));
vi.mock('@features/media', () => ({
  MediaLibraryDialog: () => null,
  useUploadMediaAsset: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../sections/SectionRenderer', () => ({ SectionRenderer: () => null }));

const lt = (en: string, ar = '') => ({ en, ar });
const BRAND = {
  primaryColor: '221 83% 53%',
  secondaryColor: '221 83% 53%',
  accentColor: '221 83% 53%',
};
const HINT = 'This number is public on your website.';

function renderStatistics(metric: 'students' | 'courses' | 'instructors') {
  const config = {
    items: [{ id: 's1', metric, value: lt(''), label: lt('Label') }],
  } as unknown as StatisticsSectionConfig;
  render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <SectionConfigForm
        type="statistics"
        academyId="a1"
        initialConfig={config}
        pages={[]}
        configuration={{ themeKey: 'modern-education', brand: BRAND }}
        onSave={vi.fn()}
        onCancel={() => undefined}
        isSaving={false}
      />
    </I18nextProvider>
  );
}

afterEach(() => cleanup());

describe('Statistics editor — public learner count', () => {
  it('warns that the live student count is public', () => {
    renderStatistics('students');
    expect(screen.getByText(HINT)).toBeTruthy();
  });

  it.each(['courses', 'instructors'] as const)(
    'shows no warning for %s',
    (metric) => {
      renderStatistics(metric);
      expect(screen.queryByText(HINT)).toBeNull();
    }
  );
});
