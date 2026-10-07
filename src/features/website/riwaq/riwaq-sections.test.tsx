/**
 * Riwaq Home renderers (plan §4) inside the real Riwaq theme scope:
 * - the hero: one opening heading, the label line, the crest;
 * - the programme explorer (disclosure master–detail), its empty, error
 *   and public-link behaviour;
 * - the live-data hiding rules (departments, figures, faculty), with the
 *   preview explaining a hidden section;
 * - the course spotlight: real data only, hidden publicly without a
 *   course, the syllabus capped, the certificate claimed only when true;
 * - sample testimonials excluded from the public site;
 * - Arabic renders with no raw keys.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { PublicWebsiteLocaleProvider } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { WebsiteIdentityProvider } from '@/features/website/renderer/WebsiteIdentityContext';
import { WebsiteThemeScope } from '@/features/website/renderer/WebsiteThemeScope';
import { getWebsiteTheme } from '@/features/website/themes/website-theme.registry';
import { CourseSpotlightSection } from '@/features/website/sections/CourseSpotlightSection';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import type {
  Course,
  PublicCourseCategory,
  PublicCourseCurriculumSection,
  SectionConfigMap,
  WebsitePage,
} from '@types';
import {
  RIWAQ_SECTION_RENDERERS,
  RiwaqCourseCategories,
  RiwaqFeaturedCourses,
  RiwaqHero,
  RiwaqSpotlight,
  RiwaqStatistics,
  RiwaqTestimonials,
} from './sections';

/* ------------------------------------------------------------------ */
/* Live data                                                            */
/* ------------------------------------------------------------------ */

let courses: Course[] = [];
let coursesState = { isLoading: false, isError: false };
let categories: PublicCourseCategory[] = [];
let statistics = { courses: 0, students: 0, instructors: 0 };
let singleCourse: Course | null = null;
let curriculum: PublicCourseCurriculumSection[] = [];
const refetch = vi.fn();

vi.mock('@/shared/hooks/usePublicCourses', () => ({
  usePublicCourses: () => ({
    data: coursesState.isError
      ? undefined
      : {
          items: courses,
          pagination: { page: 1, pageSize: 50, totalItems: courses.length, totalPages: 1 },
        },
    isLoading: coursesState.isLoading,
    isError: coursesState.isError,
    refetch,
  }),
}));
vi.mock('@/shared/hooks/usePublicCourseCategories', () => ({
  usePublicCourseCategories: () => ({ data: categories, isLoading: false }),
}));
vi.mock('@/shared/hooks/usePublicWebsiteStatistics', () => ({
  usePublicWebsiteStatistics: () => ({ data: statistics, isLoading: false }),
}));
vi.mock('@/shared/hooks/usePublicCourse', () => ({
  usePublicCourse: (_academy: string, id?: string) => ({
    data: id ? singleCourse : undefined,
    isLoading: false,
  }),
  usePublicCourseCurriculum: (_academy: string, id?: string) => ({
    data: id ? curriculum : undefined,
    isLoading: false,
  }),
}));

/* ------------------------------------------------------------------ */
/* Harness                                                              */
/* ------------------------------------------------------------------ */

const lt = (en: string, ar = '') => ({ en, ar });
const linkRenderer: WebsiteLinkRenderer = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);
const PAGES = [
  { id: 'p-home', coreType: 'home', slug: 'home', title: 'Home', sections: [] },
  { id: 'p-courses', coreType: 'courses', slug: 'courses', title: 'Courses', sections: [] },
  { id: 'p-contact', coreType: 'contact', slug: 'contact', title: 'Contact', sections: [] },
] as unknown as WebsitePage[];

function course(id: string, overrides: Partial<Course> = {}): Course {
  return {
    id,
    academyId: 'a1',
    title: `Course ${id}`,
    slug: id,
    shortDescription: `About ${id}`,
    status: 'published',
    visibility: 'public',
    pricing: { type: 'paid', price: 149, currency: 'USD' },
    instructors: [{ id: `i-${id}`, name: 'Layla Haddad' }],
    level: 'beginner',
    outcomes: ['Plan interviews', 'Map journeys'],
    stats: { totalLessons: 9 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Course;
}

function renderIn(node: ReactNode, locale: 'en' | 'ar' = 'en') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <MemoryRouter>
          <WebsiteIdentityProvider value={{ name: 'Horizon Academy' }}>
            <PublicWebsiteLocaleProvider locale={locale}>
              <WebsiteThemeScope theme={getWebsiteTheme('riwaq')} brand={{ primaryColor: '', secondaryColor: '', accentColor: '' }}>
                {node}
              </WebsiteThemeScope>
            </PublicWebsiteLocaleProvider>
          </WebsiteIdentityProvider>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  courses = [];
  coursesState = { isLoading: false, isError: false };
  categories = [];
  statistics = { courses: 0, students: 0, instructors: 0 };
  singleCourse = null;
  curriculum = [];
  refetch.mockReset();
});
afterEach(cleanup);

/* ------------------------------------------------------------------ */

describe('Riwaq pack renderers', () => {
  it('draws every Home section type itself, the new spotlight included', () => {
    for (const type of [
      'hero', 'about', 'features', 'courseCategories', 'featuredCourses', 'courseSpotlight',
      'steps', 'featureSplit', 'instructors', 'statistics', 'testimonials', 'faq', 'cta', 'gallery',
    ] as const) {
      expect(RIWAQ_SECTION_RENDERERS[type], type).toBeTypeOf('function');
    }
  });
});

describe('RiwaqHero', () => {
  const config: SectionConfigMap['hero'] = {
    eyebrow: lt('Horizon Academy — professional programmes'),
    title: lt('Serious skills, clearly taught.'),
    highlight: lt('clearly taught.'),
    image: 'theme-asset:riwaq/home-hero',
    imageAlt: lt('A colonnade'),
    highlights: [{ id: 'h1', label: lt('Published syllabus') }],
  };

  it('opens the page with one h1, its marked phrase, and names the academy once', () => {
    const { container } = renderIn(<RiwaqHero config={config} academyId="a1" pages={PAGES} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toBe('Serious skills, clearly taught.');
    expect(heading.querySelector('em[data-highlight]')?.textContent).toBe('clearly taught.');
    const label = container.querySelector('.rwh-hero-label')!;
    expect(label.textContent?.match(/Horizon Academy/g)).toHaveLength(1);
    expect(screen.getByText('Published syllabus')).toBeTruthy();
  });

  it('sets the crest as decoration only (the name is on the page as text)', () => {
    const { container } = renderIn(<RiwaqHero config={config} academyId="a1" pages={PAGES} />);
    const crest = container.querySelector('svg.rw-crest')!;
    expect(crest.getAttribute('aria-hidden')).toBe('true');
    expect(crest.textContent).toContain('Horizon Academy');
    expect(crest.textContent).toContain('HA');
  });

  it('marks the photograph as the page lead image (eager, no shutter)', () => {
    const { container } = renderIn(<RiwaqHero config={config} academyId="a1" pages={PAGES} />);
    const window = container.querySelector('.rwh-hero-window')!;
    expect(window.hasAttribute('data-reveal')).toBe(false);
    expect(window.querySelector('img')?.getAttribute('loading')).toBe('eager');
  });
});

describe('RiwaqFeaturedCourses — the programme explorer', () => {
  const config: SectionConfigMap['featuredCourses'] = {
    title: lt('Programmes'),
    mode: 'latest',
    layout: 'grid',
    count: 6,
    showPrice: true,
    showInstructor: true,
  };

  it('shows the first programme open and opens another on request', () => {
    courses = [course('c1'), course('c2', { certificatesEnabled: true })];
    renderIn(<RiwaqFeaturedCourses config={config} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
    const [first, second] = screen.getAllByRole('button', { name: /Course c/ });
    expect(first.getAttribute('aria-expanded')).toBe('true');
    expect(second.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(second);
    expect(second.getAttribute('aria-expanded')).toBe('true');
    expect(first.getAttribute('aria-expanded')).toBe('false');
    const panel = document.getElementById(second.getAttribute('aria-controls')!)!;
    expect(panel.hidden).toBe(false);
    expect(within(panel).getByText('Certificate on completion')).toBeTruthy();
    expect(within(panel).getByRole('link', { name: /View the course/ }).getAttribute('href')).toBe('/courses/c2');
  });

  it('claims no certificate for a course that does not issue one', () => {
    courses = [course('c1')];
    renderIn(<RiwaqFeaturedCourses config={config} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
    expect(screen.queryByText('Certificate on completion')).toBeNull();
  });

  it('shows the designed "courses open soon" plate when there are none', () => {
    const { container } = renderIn(<RiwaqFeaturedCourses config={config} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
    expect(container.querySelector('[data-courses-launching]')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Get in touch/ })).toBeTruthy();
  });

  it('never presents a failed request as "no courses" and offers a retry', () => {
    coursesState = { isLoading: false, isError: true };
    const { container } = renderIn(<RiwaqFeaturedCourses config={config} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
    expect(container.querySelector('[data-courses-launching]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('Riwaq live-data hiding rules', () => {
  it('hides departments with fewer than two publicly, and explains it in previews', () => {
    categories = [{ id: 'k1', name: 'Design', courseCount: 2 } as PublicCourseCategory];
    const config = { maxItems: 6, showCounts: true };
    const pub = renderIn(<RiwaqCourseCategories config={config} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
    expect(pub.container.querySelector('section')).toBeNull();
    pub.unmount();
    renderIn(<RiwaqCourseCategories config={config} academyId="a1" pages={PAGES} />);
    expect(document.querySelector('[data-preview-note]')).toBeTruthy();
  });

  it('lists departments as links to the filtered catalogue', () => {
    categories = [
      { id: 'k1', name: 'Design', courseCount: 2 },
      { id: 'k2', name: 'Business', courseCount: 1 },
    ] as PublicCourseCategory[];
    renderIn(<RiwaqCourseCategories config={{ maxItems: 6, showCounts: true }} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
    const link = screen.getByRole('link', { name: /Design/ });
    expect(link.getAttribute('href')).toContain('category=k1');
    expect(link.textContent).toContain('2 courses');
  });

  it('shows figures only with two or more live, non-zero metrics', () => {
    const config: SectionConfigMap['statistics'] = {
      title: lt('Facts and figures'),
      items: [
        { id: 's1', metric: 'courses', value: lt(''), label: lt('Courses') },
        { id: 's2', metric: 'students', value: lt(''), label: lt('Learners') },
      ],
    };
    statistics = { courses: 6, students: 0, instructors: 0 };
    const hidden = renderIn(<RiwaqStatistics config={config} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
    expect(hidden.container.querySelector('.rwl-figures')).toBeNull();
    hidden.unmount();
    statistics = { courses: 6, students: 1240, instructors: 0 };
    renderIn(<RiwaqStatistics config={config} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
    // The final value is in the DOM for screen readers and the server.
    expect(screen.getAllByText('1,240').length).toBeGreaterThan(0);
  });

  it('never shows sample testimonials on the public site', () => {
    const config: SectionConfigMap['testimonials'] = {
      title: lt('On the record'),
      items: [{ id: 't1', quote: lt('Clear and useful.'), authorName: 'Nadia K.', sample: true }],
    };
    const pub = renderIn(<RiwaqTestimonials config={config} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
    expect(pub.container.textContent).not.toContain('Clear and useful.');
    pub.unmount();
    renderIn(<RiwaqTestimonials config={config} academyId="a1" pages={PAGES} />);
    expect(screen.getByText('Clear and useful.')).toBeTruthy();
    expect(document.querySelector('[data-sample-badge]')).toBeTruthy();
  });
});

describe('Course spotlight (Riwaq and the shared base renderer)', () => {
  const config: SectionConfigMap['courseSpotlight'] = {
    eyebrow: lt('Programme in focus'),
    courseId: 'c9',
    showOutcomes: true,
    showSyllabus: true,
    maxModules: 2,
  };
  const sections = (n: number): PublicCourseCurriculumSection[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `s${i}`,
      title: `Section ${i + 1}`,
      order: i,
      lessons: [{ id: `l${i}`, title: 'L', order: 0, contentType: 'video', isPreview: false }],
    }));

  for (const [name, Component] of [
    ['Riwaq', RiwaqSpotlight],
    ['base', CourseSpotlightSection],
  ] as const) {
    it(`${name}: hides publicly when the course is missing, explains it in previews`, () => {
      singleCourse = null;
      const pub = renderIn(<Component config={config} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
      expect(pub.container.textContent).toBe('');
      pub.unmount();
      renderIn(<Component config={config} academyId="a1" pages={PAGES} />);
      expect(screen.getByText(/No published course to show yet/)).toBeTruthy();
    });

    it(`${name}: shows the real outcomes and a syllabus capped at maxModules`, () => {
      singleCourse = course('c9', { title: 'UX Foundations' });
      curriculum = sections(5);
      renderIn(<Component config={config} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
      expect(screen.getByText('UX Foundations')).toBeTruthy();
      expect(screen.getByText('Plan interviews')).toBeTruthy();
      expect(screen.getByText('Section 1')).toBeTruthy();
      expect(screen.getByText('Section 2')).toBeTruthy();
      expect(screen.queryByText('Section 3')).toBeNull();
      expect(screen.getByText('and 3 more sections')).toBeTruthy();
    });
  }

  it('Riwaq: claims a certificate only when the course issues one', () => {
    singleCourse = course('c9');
    renderIn(<RiwaqSpotlight config={config} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
    expect(screen.queryByText('Certificate on completion')).toBeNull();
    cleanup();
    singleCourse = course('c9', { certificatesEnabled: true });
    renderIn(<RiwaqSpotlight config={config} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />);
    expect(screen.getByText('Certificate on completion')).toBeTruthy();
  });

  it('falls back to the newest published course when none is named', () => {
    courses = [course('c-new', { title: 'Newest course' })];
    renderIn(
      <RiwaqSpotlight config={{ ...config, courseId: undefined }} academyId="a1" pages={PAGES} linkRenderer={linkRenderer} />
    );
    expect(screen.getByText('Newest course')).toBeTruthy();
  });
});

describe('Riwaq in Arabic', () => {
  it('renders the explorer right to left with no raw translation keys', () => {
    courses = [course('c1')];
    const { container } = renderIn(
      <RiwaqFeaturedCourses
        config={{ title: lt('Programmes', 'البرامج'), mode: 'latest', layout: 'grid', count: 6, showPrice: true, showInstructor: true }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    expect(container.querySelector('[dir="rtl"]')).toBeTruthy();
    expect(container.textContent).not.toMatch(/website:|riwaq\./);
    expect(screen.getByText('عرض الدورة')).toBeTruthy();
  });
});
