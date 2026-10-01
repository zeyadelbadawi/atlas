/**
 * Audit F-4 — Featured Courses "selected" mode: the editor offers a picker
 * of the Academy's published, public courses; the pick order is saved in
 * `courseIds` (the order the public site renders them in); earlier picks
 * that no longer qualify are named and can be removed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { SectionConfigForm } from './SectionConfigForm';
import { MAX_SELECTED_COURSES } from '../constants/website.constants';
import type { Course, FeaturedCoursesSectionConfig } from '@types';

let managedCourses: Course[] = [];
const courseQueries: unknown[] = [];
vi.mock('../hooks', () => ({
  useWebsiteFaqEntries: () => ({ data: undefined }),
  useWebsiteTestimonialEntries: () => ({ data: undefined }),
}));
vi.mock('@features/course', () => ({
  useCourses: (_academyId: string, options?: { query?: unknown }) => {
    courseQueries.push(options?.query);
    return { data: { items: managedCourses } };
  },
}));
vi.mock('@features/media', () => ({
  MediaLibraryDialog: () => null,
  useUploadMediaAsset: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
// The live preview renders the public section; it isn't under test here.
vi.mock('@/shared/hooks/usePublicCourses', () => ({
  usePublicCourses: () => ({
    data: { items: [] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

const lt = (en: string) => ({ en, ar: '' });
const course = (id: string) =>
  ({ id, title: `Course ${id}` }) as unknown as Course;

const BASE: FeaturedCoursesSectionConfig = {
  title: lt('Featured courses'),
  mode: 'selected',
  layout: 'grid',
  count: 3,
  showPrice: true,
  showInstructor: true,
};

function renderForm(
  initialConfig: FeaturedCoursesSectionConfig,
  onSave: (config: FeaturedCoursesSectionConfig) => void = () => undefined
) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance('en')}>
        <SectionConfigForm
          type="featuredCourses"
          academyId="a1"
          initialConfig={initialConfig}
          pages={[]}
          configuration={{
            themeKey: 'modern-education',
            brand: {
              primaryColor: '221 83% 53%',
              secondaryColor: '221 83% 53%',
              accentColor: '221 83% 53%',
            },
          }}
          onSave={onSave}
          onCancel={() => undefined}
          isSaving={false}
        />
      </I18nextProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  managedCourses = [course('c1'), course('c2'), course('c3')];
  courseQueries.length = 0;
});
afterEach(cleanup);

describe('Featured Courses picker (F-4)', () => {
  it('lists only published, public courses', () => {
    renderForm(BASE);
    expect(courseQueries[0]).toMatchObject({
      filters: { status: 'published', visibility: 'public' },
    });
    expect(screen.getByText('Courses to feature')).toBeTruthy();
  });

  it('saves the picked courses in pick order', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn();
    renderForm(BASE, onSave);
    await user.click(screen.getByRole('checkbox', { name: 'Course c3' }));
    await user.click(screen.getByRole('checkbox', { name: 'Course c1' }));
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].courseIds).toEqual(['c3', 'c1']);
  });

  it('is offered only in "selected" mode — "latest" configs are untouched', () => {
    renderForm({ ...BASE, mode: 'latest' });
    expect(screen.queryByText('Courses to feature')).toBeNull();
  });

  it('names picks that are no longer published or public, and removes them on request', async () => {
    const user = userEvent.setup({ delay: null });
    const onSave = vi.fn();
    renderForm({ ...BASE, courseIds: ['c2', 'gone'] }, onSave);
    expect(
      screen.getByText(
        "1 picked course is no longer published or public, so it won't show."
      )
    ).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Remove from the list' })
    );
    await user.click(screen.getByRole('button', { name: 'Apply changes' }));
    expect(onSave.mock.calls[0][0].courseIds).toEqual(['c2']);
  });

  it(`stops at ${MAX_SELECTED_COURSES} picks`, () => {
    managedCourses = Array.from({ length: MAX_SELECTED_COURSES + 1 }, (_, i) =>
      course(`c${i}`)
    );
    renderForm({
      ...BASE,
      courseIds: managedCourses.slice(0, MAX_SELECTED_COURSES).map((c) => c.id),
    });
    const last = screen.getByRole('checkbox', {
      name: `Course c${MAX_SELECTED_COURSES}`,
    });
    expect(last.hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByText(`You can feature up to ${MAX_SELECTED_COURSES} courses.`)
    ).toBeTruthy();
  });
});
