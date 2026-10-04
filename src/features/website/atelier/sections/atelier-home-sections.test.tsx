/**
 * Atelier Home renderers (plan §5a), inside the real Atelier theme scope:
 * - each renderer with real data, and empty/optional data hiding cleanly;
 * - the live-data hiding rules (fewer than two metrics or categories, no
 *   instructors), with the preview explaining a hidden section;
 * - sample testimonials excluded from the public site;
 * - links on the public site, inert controls in previews;
 * - one `<h1>`, from the opening hero only;
 * - keyboard behaviour of the testimonials and the FAQ accordion;
 * - English and Arabic (right-to-left).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { PublicWebsiteLocaleProvider } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { PageHeadingProvider } from '@/features/website/renderer/PageHeadingContext';
import { WebsiteThemeScope } from '@/features/website/renderer/WebsiteThemeScope';
import { getWebsiteTheme } from '@/features/website/themes/website-theme.registry';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import type {
  Course,
  PublicCourseCategory,
  SectionConfigMap,
  WebsitePage,
} from '@types';
import {
  ATELIER_SECTION_RENDERERS,
  AtelierAbout,
  AtelierCourseCategories,
  AtelierCta,
  AtelierFaq,
  AtelierFeatureSplit,
  AtelierFeaturedCourses,
  AtelierFeatures,
  AtelierGallery,
  AtelierHero,
  AtelierInstructors,
  AtelierStatistics,
  AtelierSteps,
  AtelierTestimonials,
} from './index';

/* ------------------------------------------------------------------ */
/* Live data                                                            */
/* ------------------------------------------------------------------ */

let courses: Course[] = [];
let coursesState = { isLoading: false, isError: false };
let categories: PublicCourseCategory[] = [];
let statistics = { courses: 0, students: 0, instructors: 0 };
const refetch = vi.fn();

vi.mock('@/shared/hooks/usePublicCourses', () => ({
  usePublicCourses: () => ({
    data: coursesState.isError
      ? undefined
      : {
          items: courses,
          pagination: {
            page: 1,
            pageSize: 50,
            totalItems: courses.length,
            totalPages: 1,
          },
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

/* ------------------------------------------------------------------ */
/* Harness                                                              */
/* ------------------------------------------------------------------ */

const i18nEn = createI18nInstance('en');
const i18nAr = createI18nInstance('ar');
const lt = (en: string, ar = '') => ({ en, ar });

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
  { id: 'p-faqs', coreType: 'faqs', slug: 'faqs', title: 'FAQs', sections: [] },
  {
    id: 'p-contact',
    coreType: 'contact',
    slug: 'contact',
    title: 'Contact',
    sections: [],
  },
] as unknown as WebsitePage[];

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">{`${location.pathname}${location.search}`}</output>
  );
}

function wrap(children: ReactNode, locale: 'en' | 'ar' = 'en') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={locale === 'en' ? i18nEn : i18nAr}>
        <MemoryRouter initialEntries={['/']}>
          <PublicWebsiteLocaleProvider locale={locale}>
            <WebsiteThemeScope theme={getWebsiteTheme('atelier')}>
              <Routes>
                <Route
                  path="*"
                  element={
                    <>
                      {children}
                      <LocationProbe />
                    </>
                  }
                />
              </Routes>
            </WebsiteThemeScope>
          </PublicWebsiteLocaleProvider>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

function course(id: string, fields: Partial<Course> = {}): Course {
  return {
    id,
    title: `Course ${id}`,
    shortDescription: 'A short summary.',
    pricing: { type: 'paid', amount: 99, currency: 'USD' },
    level: 'beginner',
    instructors: [{ id: 'i1', name: 'Layla Haddad' }],
    ...fields,
  } as unknown as Course;
}

beforeEach(() => {
  courses = [];
  coursesState = { isLoading: false, isError: false };
  categories = [];
  statistics = { courses: 0, students: 0, instructors: 0 };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ATELIER_SECTION_RENDERERS', () => {
  it('draws the thirteen Home section types', () => {
    expect(Object.keys(ATELIER_SECTION_RENDERERS).sort()).toEqual(
      [
        'about',
        'courseCategories',
        'cta',
        'faq',
        'featureSplit',
        'featuredCourses',
        'features',
        'gallery',
        'hero',
        'instructors',
        'statistics',
        'steps',
        'testimonials',
      ].sort()
    );
  });
});

/* ------------------------------------------------------------------ */
/* Hero                                                                 */
/* ------------------------------------------------------------------ */

const HERO: SectionConfigMap['hero'] = {
  eyebrow: lt('Studio for designers', 'استوديو للمصممين'),
  title: lt(
    'Learn the craft from people who practise it',
    'تعلّم الحرفة من أهلها'
  ),
  highlight: lt('practise it', 'أهلها'),
  subtitle: lt('Small cohorts', 'مجموعات صغيرة'),
  description: lt('Practical courses.', 'دورات عملية.'),
  cta: { label: lt('Explore courses', 'استكشف الدورات'), pageId: 'p-courses' },
  secondaryCta: { label: lt('Talk to us', 'تواصل معنا'), pageId: 'p-contact' },
  showSearch: true,
  highlights: [
    { id: 'h1', label: lt('Project-based') },
    { id: 'h2', label: lt('Self-paced') },
    { id: 'h3', label: lt('Real support') },
    { id: 'h4', label: lt('Certificates') },
    { id: 'h5', label: lt('A fifth is dropped') },
  ],
  image: 'theme-asset:atelier/home-hero',
};

describe('AtelierHero', () => {
  it('renders the spread: h1 with the brand-italic phrase, numbered highlights, actions, search, arch', () => {
    const { container } = wrap(
      <AtelierHero
        config={HERO}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Learn the craft from people who practise it');
    expect(h1.querySelector('[data-highlight]')?.textContent).toBe(
      'practise it'
    );
    // The LCP headline never takes part in the entrance.
    expect(h1.className).not.toContain('at-enter');
    const highlights = container.querySelectorAll('.ath-hero-highlights li');
    expect(highlights).toHaveLength(4);
    expect(highlights[0].textContent).toBe('01Project-based');
    expect(
      screen.getByRole('link', { name: /Explore courses/ }).getAttribute('href')
    ).toBe('/courses');
    expect(
      screen.getByRole('link', { name: 'Talk to us' }).getAttribute('href')
    ).toBe('/contact');
    // A visible label names the underlined search field.
    expect(
      screen.getByRole('searchbox', { name: 'Search the courses' })
    ).toBeTruthy();
    // The thread starts in the hero; the photograph sits in an arch.
    const section = screen.getByRole('region', { name: h1.textContent! });
    expect(
      section.querySelector('.at-thread')?.hasAttribute('data-start')
    ).toBe(true);
    expect(
      container.querySelector('.at-frame')?.getAttribute('data-shape')
    ).toBe('arch');
  });

  it('opens the catalog filtered by the search on the public site (Arabic keeps its prefix)', () => {
    wrap(
      <AtelierHero
        config={HERO}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    expect(
      screen
        .getByRole('heading', { level: 1 })
        .closest('[dir]')
        ?.getAttribute('dir')
    ).toBe('rtl');
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'تصميم' },
    });
    fireEvent.submit(screen.getByRole('search'));
    expect(
      decodeURIComponent(screen.getByTestId('location').textContent ?? '')
    ).toBe('/ar/courses?q=تصميم');
  });

  it('in a preview renders inert buttons and a search that goes nowhere', () => {
    wrap(<AtelierHero config={HERO} academyId="a1" pages={PAGES} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(
      screen.getByRole('button', { name: /Explore courses/ })
    ).toBeTruthy();
    fireEvent.submit(screen.getByRole('search'));
    expect(screen.getByTestId('location').textContent).toBe('/');
  });

  it('hides the search without a catalog page, and is an h2 when it does not open the page', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <I18nextProvider i18n={i18nEn}>
          <MemoryRouter>
            <PublicWebsiteLocaleProvider locale="en">
              <WebsiteThemeScope theme={getWebsiteTheme('atelier')}>
                <PageHeadingProvider value="h2">
                  <AtelierHero
                    config={HERO}
                    academyId="a1"
                    pages={PAGES.filter((page) => page.coreType !== 'courses')}
                    linkRenderer={linkRenderer}
                  />
                </PageHeadingProvider>
              </WebsiteThemeScope>
            </PublicWebsiteLocaleProvider>
          </MemoryRouter>
        </I18nextProvider>
      </QueryClientProvider>
    );
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
    expect(screen.queryByRole('search')).toBeNull();
  });

  it('with only a title, renders the headline alone (no frame, no actions)', () => {
    const { container } = wrap(
      <AtelierHero
        config={{ title: lt('Welcome') }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Welcome'
    );
    expect(container.querySelector('.at-frame')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Authored sections                                                    */
/* ------------------------------------------------------------------ */

describe('Authored sections never draw an h1', () => {
  it('about, featureSplit, features, steps, cta and gallery use h2/h3 only', () => {
    const { container } = wrap(
      <>
        <AtelierAbout
          config={{ title: lt('Our studio'), body: lt('First.\n\nSecond.') }}
          academyId="a1"
          pages={PAGES}
        />
        <AtelierFeatureSplit
          config={{
            title: lt('Why us'),
            imagePosition: 'start',
            items: [{ id: '1', title: lt('One') }],
          }}
          academyId="a1"
          pages={PAGES}
        />
        <AtelierCta
          config={{ title: lt('Begin'), cta: { label: lt('Join') } }}
          academyId="a1"
          pages={PAGES}
        />
      </>
    );
    expect(container.querySelector('h1')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
  });
});

describe('AtelierAbout', () => {
  it('sets the first paragraph as the display-face lede and the image as an arch plate', () => {
    const { container } = wrap(
      <AtelierAbout
        config={{
          title: lt('Our studio'),
          body: lt('We teach by making.\n\nEvery cohort is small.'),
          image: 'theme-asset:atelier/about-story',
        }}
        academyId="a1"
        pages={PAGES}
      />
    );
    const paragraphs = container.querySelectorAll('.ath-lede p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].className).toContain('ath-lede-first');
    expect(
      container.querySelector('.ath-lede-plate')?.getAttribute('data-shape')
    ).toBe('arch');
    expect(
      screen
        .getByRole('region', { name: 'Our studio' })
        .hasAttribute('data-numbered')
    ).toBe(true);
  });
});

describe('AtelierFeatureSplit', () => {
  const config: SectionConfigMap['featureSplit'] = {
    eyebrow: lt('Philosophy'),
    title: lt('Learning by making'),
    image: 'theme-asset:atelier/home-philosophy',
    imageAlt: lt('A desk with sketches'),
    imagePosition: 'end',
    items: [1, 2, 3].map((n) => ({ id: String(n), title: lt(`Point ${n}`) })),
    cta: { label: lt('About us'), pageId: 'p-home' },
  };

  it('numbers its paragraphs, captions the plate and honours the image side', () => {
    const { container } = wrap(
      <AtelierFeatureSplit
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const numerals = [...container.querySelectorAll('.ath-folio-no')].map(
      (node) => node.textContent
    );
    expect(numerals).toEqual(['01', '02', '03']);
    expect(container.querySelector('.ath-caption')?.textContent).toBe(
      'A desk with sketches'
    );
    expect(container.querySelector('figure')?.className).toContain(
      'ath-bleed-end'
    );
    expect(container.querySelector('.at-mark .at-label')?.textContent).toBe(
      'Philosophy'
    );
    expect(
      screen.getByRole('link', { name: 'About us' }).getAttribute('href')
    ).toBe('/');
  });

  it('without an image, lays the paragraphs out as text', () => {
    const { container } = wrap(
      <AtelierFeatureSplit
        config={{ ...config, image: undefined }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(container.querySelector('.at-frame')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });
});

describe('AtelierFeatures', () => {
  const items = ['A', 'B', 'C', 'D'].map((name) => ({
    id: name,
    icon: 'Clock',
    title: lt(`Title ${name}`),
    description: lt(`Text ${name}`),
  }));

  it('is an index of numbered rows (no cards); strip is a two-column grid', () => {
    const { container } = wrap(
      <AtelierFeatures
        config={{ title: lt('What you will learn'), items }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(
      container.querySelectorAll('.ath-index .ath-index-row')
    ).toHaveLength(4);
    expect(container.querySelector('.ath-index-no')?.textContent).toBe('01');
    cleanup();
    const strip = wrap(
      <AtelierFeatures
        config={{ layout: 'strip', title: lt('Why us'), items }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(strip.container.querySelectorAll('.ath-index-grid li')).toHaveLength(
      4
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Why us' })
    ).toBeTruthy();
  });

  it('draws nothing without items', () => {
    const { container } = wrap(
      <AtelierFeatures config={{ items: [] }} academyId="a1" pages={PAGES} />
    );
    expect(container.querySelector('section')).toBeNull();
  });
});

describe('AtelierSteps', () => {
  it('is an ordered syllabus with a knot per step, and nothing when empty', () => {
    const { container } = wrap(
      <AtelierSteps
        config={{
          title: lt('Method'),
          items: [1, 2, 3].map((n) => ({
            id: String(n),
            title: lt(`Step ${n}`),
          })),
        }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(container.querySelectorAll('ol.ath-syllabus > li')).toHaveLength(3);
    expect(container.querySelectorAll('.ath-syllabus-knot')).toHaveLength(3);
    expect(container.querySelector('ol')?.className).toContain(
      'lg:grid-cols-3'
    );
    cleanup();
    const empty = wrap(
      <AtelierSteps config={{ items: [] }} academyId="a1" pages={PAGES} />
    );
    expect(empty.container.querySelector('section')).toBeNull();
  });
});

describe('AtelierCta', () => {
  const config: SectionConfigMap['cta'] = {
    title: lt('Start your first project'),
    description: lt('Join the next cohort.'),
    cta: { label: lt('Create your account'), authAction: 'signUp' },
    secondaryCta: { label: lt('Browse courses'), pageId: 'p-courses' },
    image: 'theme-asset:atelier/home-cta',
  };

  it('is the closing ink chapter: the thread ends in a filled knot, ink actions', () => {
    const { container } = wrap(
      <AtelierCta
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const chapter = screen.getByRole('region', {
      name: 'Start your first project',
    });
    expect(chapter.getAttribute('data-env')).toBe('ink');
    expect(chapter.querySelector('.at-thread')?.hasAttribute('data-end')).toBe(
      true
    );
    expect(container.querySelector('.at-knot[data-filled]')).toBeTruthy();
    const primary = screen.getByRole('link', { name: /Create your account/ });
    expect(primary.getAttribute('href')).toBe('/sign-up');
    expect(primary.className).toContain('at-btn-ink');
    expect(
      screen.getByRole('link', { name: 'Browse courses' }).getAttribute('href')
    ).toBe('/courses');
  });

  it('renders nothing for a public action whose page is gone', () => {
    wrap(
      <AtelierCta
        config={{
          title: lt('Begin'),
          cta: { label: lt('Hidden page'), pageId: 'p-missing' },
        }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('AtelierGallery', () => {
  it('is a contact sheet with numbered captions; nothing without images', () => {
    const { container } = wrap(
      <AtelierGallery
        config={{
          title: lt('The studio'),
          images: [1, 2, 3].map((n) => ({
            id: String(n),
            image: `theme-asset:atelier/gallery-${n}`,
            caption: lt(`Caption ${n}`),
          })),
        }}
        academyId="a1"
        pages={PAGES}
      />
    );
    const captions = [...container.querySelectorAll('figcaption')].map(
      (node) => node.textContent
    );
    expect(captions).toEqual(['01Caption 1', '02Caption 2', '03Caption 3']);
    cleanup();
    const empty = wrap(
      <AtelierGallery config={{ images: [] }} academyId="a1" pages={PAGES} />
    );
    expect(empty.container.querySelector('section')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Live-data sections                                                   */
/* ------------------------------------------------------------------ */

describe('AtelierCourseCategories', () => {
  const config = { title: lt('Disciplines'), maxItems: 8, showCounts: true };

  it('is hidden publicly with fewer than two categories; the preview says why', () => {
    categories = [{ id: 'c1', name: 'Design', slug: 'design', courseCount: 2 }];
    const { container } = wrap(
      <AtelierCourseCategories
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    const preview = wrap(
      <AtelierCourseCategories config={config} academyId="a1" pages={PAGES} />
    );
    expect(preview.container.querySelector('[data-preview-note]')).toBeTruthy();
  });

  it('sets each category as a link to the filtered catalog with its count in small caps', () => {
    categories = [
      { id: 'c1', name: 'Design', slug: 'design', courseCount: 2 },
      { id: 'c2', name: 'Typography', slug: 'type', courseCount: 1 },
    ];
    wrap(
      <AtelierCourseCategories
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const design = screen.getByRole('link', { name: /Design/ });
    expect(design.getAttribute('href')).toBe('/courses?category=c1');
    expect(within(design).getByText('2 courses')).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'Browse all courses' })
        .getAttribute('href')
    ).toBe('/courses');
  });

  it('in Arabic uses Arabic-Indic digits and plural forms; in a preview the names are plain text', () => {
    categories = [
      { id: 'c1', name: 'تصميم', slug: 'design', courseCount: 5 },
      { id: 'c2', name: 'خط', slug: 'type', courseCount: 2 },
    ];
    wrap(
      <AtelierCourseCategories config={config} academyId="a1" pages={PAGES} />,
      'ar'
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('٥ دورات')).toBeTruthy();
    expect(screen.getByText('دورتان')).toBeTruthy();
  });
});

describe('AtelierFeaturedCourses', () => {
  const config: SectionConfigMap['featuredCourses'] = {
    title: lt('Contents'),
    mode: 'latest',
    layout: 'grid',
    count: 6,
    showPrice: true,
    showInstructor: true,
  };

  it('is a contents page: numbered rows linking to each course, with meta, price and a decorative peek', () => {
    courses = [
      course('c1'),
      course('c2', {
        thumbnail: 'https://cdn.example/t.png',
      } as Partial<Course>),
    ];
    const { container } = wrap(
      <AtelierFeaturedCourses
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const rows = screen.getAllByRole('link', { name: /Course c/ });
    expect(rows.map((row) => row.getAttribute('href'))).toEqual([
      '/courses/c1',
      '/courses/c2',
    ]);
    expect(within(rows[0]).getByText('01')).toBeTruthy();
    expect(within(rows[0]).getByText('With Layla Haddad')).toBeTruthy();
    expect(within(rows[0]).getByText('Beginner')).toBeTruthy();
    expect(rows[0].querySelector('.ath-entry-price')?.textContent).toContain(
      '99'
    );
    const peeks = container.querySelectorAll('.ath-peek');
    expect(peeks).toHaveLength(2);
    for (const peek of peeks)
      expect(peek.getAttribute('aria-hidden')).toBe('true');
    expect(peeks[1].querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example/t.png'
    );
    expect(
      screen
        .getByRole('link', { name: 'View all courses' })
        .getAttribute('href')
    ).toBe('/courses');
  });

  it('hides price and instructor when turned off; preview rows are inert articles', () => {
    courses = [course('c1')];
    wrap(
      <AtelierFeaturedCourses
        config={{ ...config, showPrice: false, showInstructor: false }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(screen.queryByText('With Layla Haddad')).toBeNull();
    expect(screen.getByRole('article')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('as a carousel is a native scroll-snap strip of plates, focusable in previews', () => {
    courses = [course('c1'), course('c2')];
    const { container } = wrap(
      <AtelierFeaturedCourses
        config={{ ...config, layout: 'carousel' }}
        academyId="a1"
        pages={PAGES}
      />
    );
    const strip = container.querySelector('[data-courses-carousel]')!;
    expect(strip.className).toContain('ath-plates');
    expect(strip.getAttribute('tabindex')).toBe('0');
    expect(strip.getAttribute('aria-label')).toBe('Contents');
    expect(strip.querySelectorAll('.ath-plate')).toHaveLength(2);
  });

  it('shows the designed "launching soon" state with no courses', () => {
    wrap(
      <AtelierFeaturedCourses
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(document.querySelector('[data-courses-launching]')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Contact us' }).getAttribute('href')
    ).toBe('/contact');
    expect(screen.queryByRole('link', { name: 'View all courses' })).toBeNull();
  });

  it('says plainly when the courses failed to load, with a retry', () => {
    coursesState = { isLoading: false, isError: true };
    wrap(
      <AtelierFeaturedCourses
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(document.querySelector('[data-courses-error]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe('AtelierInstructors', () => {
  const config = { title: lt('The faculty'), count: 4 };

  it('is hidden publicly with no instructors; the preview shows labelled samples', () => {
    const { container } = wrap(
      <AtelierInstructors
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    const preview = wrap(
      <AtelierInstructors config={config} academyId="a1" pages={PAGES} />
    );
    const sample = preview.container.querySelector('[data-preview-sample]')!;
    expect(sample.textContent).toContain('Sample');
    expect(sample.querySelectorAll('li')).toHaveLength(4);
    expect(sample.textContent).toContain('Instructor name');
  });

  it('derives a masthead from the catalog, with course counts and monograms', () => {
    courses = [
      course('c1'),
      course('c2'),
      course('c3', {
        instructors: [{ id: 'i2', name: 'Daniel Okafor' }],
      } as Partial<Course>),
    ];
    wrap(
      <AtelierInstructors
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(screen.getByText('Layla Haddad')).toBeTruthy();
    expect(screen.getByText('2 courses')).toBeTruthy();
    expect(screen.getByText('1 course')).toBeTruthy();
    expect(screen.getByText('DO')).toBeTruthy();
  });
});

describe('AtelierStatistics', () => {
  const config: SectionConfigMap['statistics'] = {
    title: lt('In numbers', 'بالأرقام'),
    items: [
      {
        id: 's1',
        metric: 'courses',
        value: lt(''),
        label: lt('Courses', 'دورات'),
      },
      {
        id: 's2',
        metric: 'students',
        value: lt(''),
        label: lt('Learners', 'متعلّمون'),
      },
      {
        id: 's3',
        metric: 'instructors',
        value: lt(''),
        label: lt('Instructors', 'مدرّبون'),
      },
    ],
  };

  it('is an ink chapter of real non-zero numbers', () => {
    statistics = { courses: 6, students: 0, instructors: 3 };
    wrap(
      <AtelierStatistics
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const chapter = screen.getByRole('region', { name: 'In numbers' });
    expect(chapter.getAttribute('data-env')).toBe('ink');
    expect(chapter.hasAttribute('data-unveil')).toBe(true);
    expect(screen.queryByText('Learners')).toBeNull();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('is hidden publicly with fewer than two numbers; the preview says why', () => {
    statistics = { courses: 6, students: 0, instructors: 0 };
    const { container } = wrap(
      <AtelierStatistics
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    const preview = wrap(
      <AtelierStatistics config={config} academyId="a1" pages={PAGES} />
    );
    const sample = preview.container.querySelector('[data-preview-sample]')!;
    expect(sample.textContent).toContain('Sample');
    for (const value of sample.querySelectorAll('dd')) {
      expect(value.textContent).toBe('—');
    }
  });

  it("shows numbers in the locale's digits in Arabic", () => {
    statistics = { courses: 6, students: 1240, instructors: 3 };
    const { container } = wrap(
      <AtelierStatistics
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    const shown = [...container.querySelectorAll('dd')].map(
      (node) => node.textContent
    );
    expect(shown).toEqual(['٦', '١٬٢٤٠', '٣']);
  });
});

describe('AtelierTestimonials', () => {
  const items = (sample: boolean) =>
    ['Sara', 'James', 'Nour'].map((name, index) => ({
      id: `t${index}`,
      quote: lt(`Quote from ${name}`, `رأي ${name}`),
      authorName: name,
      sample,
    }));

  it('never shows sample testimonials on the public site', () => {
    const { container } = wrap(
      <AtelierTestimonials
        config={{ items: items(true) }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
  });

  it('labels samples "Sample" in the preview', () => {
    const { container } = wrap(
      <AtelierTestimonials
        config={{ items: items(true) }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(container.querySelector('[data-sample-badge]')?.textContent).toBe(
      'Sample'
    );
  });

  it('shows one quote at a time in a polite live region, with prev/next and a count', () => {
    const { container } = wrap(
      <AtelierTestimonials
        config={{ title: lt('In their words'), items: items(false) }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const chapter = screen.getByRole('region', { name: 'In their words' });
    expect(chapter.getAttribute('data-env')).toBe('ink');
    expect(container.querySelectorAll('blockquote')).toHaveLength(1);
    expect(
      container.querySelector('[aria-live="polite"]')?.textContent
    ).toContain('Quote from Sara');
    const count = () =>
      container.querySelector('.ath-quote-count')?.textContent;
    expect(count()).toBe('01/03');

    fireEvent.click(screen.getByRole('button', { name: 'Next testimonial' }));
    expect(screen.getByText('“Quote from James”')).toBeTruthy();
    expect(count()).toBe('02/03');
    expect(screen.getByText('Testimonial 2 of 3')).toBeTruthy();

    // Keyboard: the arrows page from the focused quote group.
    const group = screen.getByRole('group', { name: 'Testimonials' });
    expect(group.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(count()).toBe('03/03');
    // Paging wraps, so the focused button never becomes disabled.
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(count()).toBe('01/03');
    fireEvent.click(
      screen.getByRole('button', { name: 'Previous testimonial' })
    );
    expect(count()).toBe('03/03');
  });

  it('follows the reading direction in Arabic', () => {
    const { container } = wrap(
      <AtelierTestimonials
        config={{ items: items(false) }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    const group = screen.getByRole('group', { name: 'آراء المتعلّمين' });
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(container.querySelector('.ath-quote-count')?.textContent).toBe(
      '٠٢/٠٣'
    );
    expect(screen.getByText('“رأي James”')).toBeTruthy();
  });

  it('with a single quote shows no controls', () => {
    wrap(
      <AtelierTestimonials
        config={{ items: items(false).slice(0, 1) }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* FAQ                                                                  */
/* ------------------------------------------------------------------ */

describe('AtelierFaq', () => {
  const questions = Array.from({ length: 6 }, (_, i) => ({
    id: `q${i}`,
    question: lt(`Question ${i + 1}?`),
    answer: lt(`Answer ${i + 1}.`),
  }));

  it('as the Home teaser shows the first N numbered questions and links to the rest', () => {
    wrap(
      <AtelierFaq
        config={{
          title: lt('Questions'),
          items: questions,
          maxItems: 4,
          cta: { label: lt('See all questions'), pageId: 'p-faqs' },
        }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const triggers = screen.getAllByRole('button', { name: /Question/ });
    expect(triggers).toHaveLength(4);
    expect(triggers[0].textContent).toContain('01');
    expect(
      screen
        .getByRole('link', { name: 'See all questions' })
        .getAttribute('href')
    ).toBe('/faqs');
  });

  it('expands and collapses an answer region from its button', () => {
    wrap(
      <AtelierFaq
        config={{ title: lt('Questions'), items: questions.slice(0, 2) }}
        academyId="a1"
        pages={PAGES}
      />
    );
    const trigger = screen.getByRole('button', { name: /Question 1\?/ });
    expect(trigger.closest('h3')).toBeTruthy();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const panel = document.getElementById(
      trigger.getAttribute('aria-controls')!
    )!;
    expect(panel.hidden).toBe(true);
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hidden).toBe(false);
    expect(
      screen.getByRole('region', { name: /Question 1\?/ }).textContent
    ).toBe('Answer 1.');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
  });

  it('untitled, names itself with a hidden h2; nothing without questions; preview link is inert', () => {
    wrap(
      <AtelierFaq
        config={{
          items: questions,
          cta: { label: lt('Contact us'), pageId: 'p-contact' },
        }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(screen.getAllByRole('button', { name: /Question/ })).toHaveLength(6);
    expect(
      screen.getByRole('heading', { level: 2, name: 'All questions' }).className
    ).toContain('sr-only');
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: 'Contact us' })).toBeTruthy();
    cleanup();
    const empty = wrap(
      <AtelierFaq config={{ items: [] }} academyId="a1" pages={PAGES} />
    );
    expect(empty.container.querySelector('section')).toBeNull();
  });
});
