/**
 * CMS phase 3d — sample results and timetable rows are sample content like
 * testimonials (the backend's `SAMPLE_ITEM_SECTION_TYPES` exactly): the
 * publish warning and the launch checklist count them, and each row names
 * what its samples are.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { SampleContentList } from '../components/SampleContentList';
import { collectSampleContent } from './sample-content.utils';
import type { SectionInstance, WebsitePage } from '@types';

const visibility = { desktop: true, tablet: true, mobile: true };
const section = (
  id: string,
  type: string,
  items: { id: string; sample?: boolean }[]
) =>
  ({
    id,
    type,
    enabled: true,
    visibility,
    config: { items },
  }) as unknown as SectionInstance;

const page = {
  id: 'p1',
  title: 'Home',
  sections: [
    section('res', 'results', [{ id: 'a', sample: true }, { id: 'b' }]),
    section('sch', 'schedule', [
      { id: 'c', sample: true },
      { id: 'd', sample: true },
    ]),
    // Only the listed types carry samples.
    section('lg', 'logos', [{ id: 'e', sample: true }]),
  ],
} as unknown as WebsitePage;

afterEach(cleanup);

describe('sample content — results and timetable rows', () => {
  it('counts sample results and rows, and nothing else', () => {
    expect(collectSampleContent([page])).toEqual([
      {
        pageId: 'p1',
        pageTitle: 'Home',
        sectionId: 'res',
        sectionType: 'results',
        sampleItems: 1,
      },
      {
        pageId: 'p1',
        pageTitle: 'Home',
        sectionId: 'sch',
        sectionType: 'schedule',
        sampleItems: 2,
      },
    ]);
  });

  it('names what each row’s samples are', () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <MemoryRouter>
          <SampleContentList
            academyId="a1"
            entries={collectSampleContent([page])}
          />
        </MemoryRouter>
      </I18nextProvider>
    );
    expect(screen.getByText('1 sample result')).toBeTruthy();
    expect(screen.getByText('2 sample timetable rows')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Review the sample results on Home' })
    ).toBeTruthy();
  });
});
