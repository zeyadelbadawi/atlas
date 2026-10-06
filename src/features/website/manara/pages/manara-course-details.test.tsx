/**
 * Manara Course Details on the shared `useCourseDetails` (mocked here, so
 * the page is tested for what it draws from the hook — the hook's own
 * enrol / buy / sign-in rules are covered by Theme 1's tests): the night
 * poster header with the fallback picture, the numbered curriculum track
 * with free previews, the sticky enrolment panel and the phone bar with
 * the one primary action, reviews and related courses, the not-found and
 * error states, English and Arabic.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { WebsiteThemeScope } from '@/features/website/renderer/WebsiteThemeScope';
import { PublicWebsiteLocaleProvider } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { getWebsiteTheme } from '@/features/website/themes/website-theme.registry';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import type { Course, PublicWebsiteLocale, WebsitePage } from '@types';
import { ManaraCourseDetails } from './ManaraCourseDetails';

/* ------------------------------------------------------------------ */
/* The shared hook and the data around it                               */
/* ------------------------------------------------------------------ */

interface Details {
  course: Course | null | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: ReturnType<typeof vi.fn>;
  curriculum: unknown[] | undefined;
  isLoadingCurriculum: boolean;
  previewLesson: { id: string; title: string } | null;
  setPreviewLesson: ReturnType<typeof vi.fn>;
  isAuthenticated: boolean;
  isEnrolled: boolean;
  enrollError: boolean;
  action: {
    kind: string;
    labelKey: string;
    onSelect: () => void;
    busy: boolean;
  };
}
let details: Details;
const onSelect = vi.fn();
const hookCalls: unknown[][] = [];

vi.mock('@/features/website/renderer/useCourseDetails', () => ({
  useCourseDetails: (...args: unknown[]) => {
    hookCalls.push(args);
    return details;
  },
}));

let related: Course[] = [];
let rating: { averageRating: number; totalReviews: number } | undefined;
vi.mock('@/shared/hooks/usePublicCourseReviews', () => ({
  usePublicCourseRecommendations: () => ({ data: related }),
  usePublicCourseRating: () => ({ data: rating, isLoading: false }),
  usePublicCourseReviews: () => ({ data: { items: [] }, isLoading: false }),
}));
vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ session: { status: 'anonymous' } }),
}));
vi.mock('@features/learning', () => ({
  useMyCourseReview: () => ({ data: undefined }),
  useSubmitMyReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteMyReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

/* ------------------------------------------------------------------ */
/* Harness                                                              */
/* ------------------------------------------------------------------ */

const linkRenderer: WebsiteLinkRenderer = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

const PAGES = [
  { id: 'p-home', coreType: 'home', slug: 'home', title: 'Home', sections: [] },
  {
    id: 'p-courses',
    coreType: 'courses',
    slug: 'courses',
    title: 'Courses',
    sections: [],
  },
  {
    id: 'p-contact',
    coreType: 'contact',
    slug: 'contact',
    title: 'Contact',
    sections: [],
  },
] as unknown as WebsitePage[];

function wrap(children: ReactNode, locale: PublicWebsiteLocale = 'en') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <MemoryRouter initialEntries={['/courses/c1']}>
          <WebsiteThemeScope theme={getWebsiteTheme('manara')}>
            <PublicWebsiteLocaleProvider locale={locale}>
              {children}
            </PublicWebsiteLocaleProvider>
          </WebsiteThemeScope>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const COURSE = {
  id: 'c1',
  title: 'Physics for the final year',
  shortDescription: 'Mechanics to modern physics, exam first.',
  description: 'A long description.',
  level: 'beginner',
  language: 'en',
  pricing: { type: 'paid', amount: 120, currency: 'USD' },
  category: { id: 'cat-1', name: 'Physics' },
  instructors: [{ id: 'i1', name: 'Layla Haddad' }],
  outcomes: ['Solve mechanics problems', 'Read a circuit'],
  requirements: ['A notebook'],
  stats: {
    totalLessons: 4,
    totalQuizzes: 1,
    totalSections: 2,
    totalReviews: 0,
  },
} as unknown as Course;

const CURRICULUM = [
  {
    id: 's1',
    title: 'Motion',
    order: 0,
    lessons: [
      {
        id: 'l1',
        title: 'Vectors',
        contentType: 'video',
        isPreview: true,
      },
      { id: 'l2', title: 'Forces', contentType: 'text', isPreview: false },
    ],
  },
  {
    id: 's2',
    title: 'Electricity',
    order: 1,
    lessons: [{ id: 'l3', title: 'Circuits', contentType: 'file' }],
  },
];

const page = (locale: PublicWebsiteLocale = 'en') => (
  <ManaraCourseDetails
    academyId="a1"
    courseId="c1"
    locale={locale}
    pages={PAGES}
    linkRenderer={linkRenderer}
  />
);

beforeEach(() => {
  details = {
    course: COURSE,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    curriculum: CURRICULUM,
    isLoadingCurriculum: false,
    previewLesson: null,
    setPreviewLesson: vi.fn(),
    isAuthenticated: false,
    isEnrolled: false,
    enrollError: false,
    action: {
      kind: 'signIn',
      labelKey: 'website:renderer.courseDetails.signInToEnrollAction',
      onSelect,
      busy: false,
    },
  };
  related = [];
  rating = undefined;
  hookCalls.length = 0;
});
afterEach(() => {
  cleanup();
  onSelect.mockReset();
});

describe('ManaraCourseDetails', () => {
  it('reads everything from useCourseDetails for this academy, course and locale', () => {
    wrap(page('ar'), 'ar');
    expect(hookCalls[0]).toEqual(['a1', 'c1', 'ar']);
  });

  it('the night poster header: trail, category pill, the page h1, summary, meta pills and teachers', () => {
    const { container } = wrap(page());
    const header = container.querySelector(
      '[data-manara-course-details] > header.mn-block'
    )!;
    expect(header.getAttribute('data-env')).toBe('night');
    expect(header.hasAttribute('data-seam-bottom')).toBe(true);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Physics for the final year'
    );
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(
      within(trail)
        .getByRole('link', { name: 'All courses' })
        .getAttribute('href')
    ).toBe('/courses');
    expect(
      within(trail).getByRole('link', { name: 'Physics' }).getAttribute('href')
    ).toBe('/courses?category=cat-1');
    expect(
      header.querySelector('.mn-pill[data-tone="accent"]')?.textContent
    ).toBe('Physics');
    expect(
      screen.getByText('Mechanics to modern physics, exam first.')
    ).toBeTruthy();
    const meta = container.querySelector('.mnp-meta')!;
    expect(meta.textContent).toContain('Beginner');
    expect(meta.textContent).toContain('4 lessons');
    // No reviews: no rating is shown.
    expect(meta.textContent).not.toMatch(/\/ 5/);
    expect(screen.getAllByText('Layla Haddad').length).toBeGreaterThan(0);
  });

  it('the picture: the course thumbnail eagerly at high priority, else the theme fallback in a slanted frame', () => {
    details.course = {
      ...COURSE,
      thumbnail: 'https://cdn.example/c1.jpg',
    } as Course;
    const { container } = wrap(page());
    const frame = container.querySelector(
      'header .mn-frame[data-shape="slant"]'
    )!;
    const img = frame.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://cdn.example/c1.jpg');
    expect(img.getAttribute('loading')).toBe('eager');
    cleanup();
    wrap(page());
    const fallback = document.querySelector(
      'header .mn-frame[data-shape="slant"]'
    )!;
    // `course-fallback` is not released yet: the designed placeholder
    // holds its place; a released photograph renders as an image.
    expect(
      fallback.querySelector('img') ??
        fallback.querySelector('[data-image-placeholder]')
    ).toBeTruthy();
  });

  it('a rating appears only with real reviews, linking to them', () => {
    details.course = {
      ...COURSE,
      stats: { ...COURSE.stats, totalReviews: 3, averageRating: 4.7 },
    } as Course;
    wrap(page());
    const link = screen.getByRole('link', { name: /Rated 4.7 out of 5/ });
    expect(link.getAttribute('href')).toBe('#reviews');
  });

  it('the body blocks in order, each an h2', () => {
    wrap(page());
    const titles = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);
    expect(titles.slice(0, 5)).toEqual([
      'About this course',
      "What you'll learn",
      'Course content',
      'Requirements',
      'Instructors',
    ]);
  });

  it('the curriculum is a numbered track: parts, their lessons, free previews open the dialog', async () => {
    const user = userEvent.setup({ delay: null });
    wrap(page());
    const track = screen.getByRole('list', { name: 'Curriculum' });
    expect(track.className).toContain('mnp-track');
    const parts = track.querySelectorAll(':scope > li');
    expect(parts).toHaveLength(2);
    expect(parts[0].querySelector('.mnp-track-no')?.textContent).toBe('01');
    expect(
      within(parts[0] as HTMLElement).getByRole('heading', { level: 3 })
        .textContent
    ).toContain('Motion');
    expect(parts[0].querySelectorAll('.mnp-lessons > li')).toHaveLength(2);
    const block = screen
      .getByRole('heading', { name: 'Course content' })
      .closest('section')!;
    expect(block.textContent).toContain('2 sections · 3 lessons · 1 quiz');
    await user.click(
      screen.getByRole('button', { name: 'Preview the lesson Vectors' })
    );
    expect(details.setPreviewLesson).toHaveBeenCalledWith({
      id: 'l1',
      title: 'Vectors',
    });
  });

  it('the sticky enrolment panel: price, the one primary action from the hook, what is included; the phone bar carries the same action', async () => {
    const user = userEvent.setup({ delay: null });
    wrap(page());
    const panel = screen.getByRole('complementary', {
      name: 'Enrol in this course',
    });
    const card = panel.querySelector('[data-manara-panel]')!;
    expect(card.className).toContain('mnp-panel');
    expect(card.className).toContain('mn-card');
    expect(card.querySelector('.mnp-panel-price')?.textContent).toMatch(/120/);
    const action = within(panel).getByRole('button', {
      name: 'Sign in to enroll',
    });
    expect(action.getAttribute('data-course-action')).toBe('signIn');
    expect(action.className).toContain('mn-btn');
    await user.click(action);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(panel.textContent).toContain('2 sections');
    const bar = document.querySelector(
      '[data-manara-purchase-bar]'
    ) as HTMLElement;
    expect(bar.className).toContain('mnp-bar');
    // On the public runtime, above the mobile bottom navigation.
    expect(bar.hasAttribute('data-above-nav')).toBe(true);
    const barAction = within(bar).getByRole('button', {
      name: 'Sign in to enroll',
    });
    expect(barAction.className).toContain('min-h-11');
    expect(bar.textContent).toMatch(/120/);
  });

  it('an enrolment failure is announced; a busy action is disabled', () => {
    details.enrollError = true;
    details.action = {
      ...details.action,
      kind: 'enroll',
      labelKey: 'website:renderer.courseDetails.enrollAction',
      busy: true,
    };
    wrap(page());
    expect(screen.getByRole('alert').textContent).toContain(
      "We couldn't enroll you"
    );
    for (const button of screen.getAllByRole('button', {
      name: 'Enroll for free',
    })) {
      expect(button.hasAttribute('disabled')).toBe(true);
    }
  });

  it('reviews render as Theme 1 renders them; related courses as poster cards only when there are some', () => {
    const { container, unmount } = wrap(page());
    expect(container.querySelector('#reviews')).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'Related courses' })
    ).toBeNull();
    unmount();
    related = [{ ...COURSE, id: 'c2', title: 'Chemistry basics' } as Course];
    wrap(page());
    const section = screen.getByRole('region', { name: 'Related courses' });
    expect(section.getAttribute('data-env')).toBe('soft');
    const link = within(section).getByRole('link', {
      name: /Chemistry basics/,
    });
    expect(link.getAttribute('href')).toBe('/courses/c2');
    expect(link.className).toContain('mnp-course-card');
  });

  it('an unknown course is "page not found"; a failed load offers a retry', async () => {
    const user = userEvent.setup({ delay: null });
    details.course = null;
    wrap(page());
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      "This page isn't on the timetable"
    );
    cleanup();
    details.course = undefined;
    details.error = new Error('network');
    wrap(page());
    expect(screen.getByText("This course couldn't be loaded")).toBeTruthy();
    expect(document.querySelector('[data-course-error]')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(details.refetch).toHaveBeenCalled();
  });

  it('loading reserves the viewport and is marked busy', () => {
    details.isLoading = true;
    const { container } = wrap(page());
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('Arabic: right to left, Arabic labels, Arabic-Indic part numbers', () => {
    const { container } = wrap(page('ar'), 'ar');
    expect(
      container.querySelector('[dir="rtl"] [data-manara-course-details]')
    ).toBeTruthy();
    expect(
      screen.getByRole('navigation', { name: 'مسار التنقل' })
    ).toBeTruthy();
    expect(
      screen
        .getByRole('list', { name: 'المنهج' })
        .querySelector('.mnp-track-no')?.textContent
    ).toBe('٠١');
    expect(
      screen.getByRole('complementary', { name: 'التسجيل في هذه الدورة' })
    ).toBeTruthy();
  });
});
