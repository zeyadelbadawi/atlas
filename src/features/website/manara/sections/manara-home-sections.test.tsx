/**
 * Manara Home renderers (plan §3.10), inside the real Manara theme scope:
 * - each renderer with real data, and empty/optional data hiding cleanly;
 * - the live-data hiding rules (fewer than two metrics or categories, no
 *   instructors), with the preview explaining a hidden section;
 * - sample testimonials excluded from the public site;
 * - links on the public site, inert controls in previews;
 * - one `<h1>`, from the opening hero only, and its fit rule;
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
  MANARA_SECTION_RENDERERS,
  ManaraAbout,
  ManaraCourseCategories,
  ManaraCta,
  ManaraFaq,
  ManaraFeatureSplit,
  ManaraFeaturedCourses,
  ManaraFeatures,
  ManaraGallery,
  ManaraHero,
  ManaraInstructors,
  ManaraStatistics,
  ManaraSteps,
  ManaraTestimonials,
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
            <WebsiteThemeScope theme={getWebsiteTheme('manara')}>
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

describe('MANARA_SECTION_RENDERERS', () => {
  it('draws the thirteen Home section types', () => {
    expect(Object.keys(MANARA_SECTION_RENDERERS).sort()).toEqual(
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
  eyebrow: lt('Thanaweya Amma 2027', 'ثانوية عامة ٢٠٢٧'),
  title: lt('Score higher this year', 'ارفع درجاتك هذا العام'),
  highlight: lt('higher', 'درجاتك'),
  subtitle: lt('Lessons, practice and exams', 'دروس وتدريب وامتحانات'),
  description: lt('All on your phone.', 'كل ذلك على هاتفك.'),
  cta: { label: lt('Join now', 'انضم الآن'), pageId: 'p-courses' },
  secondaryCta: { label: lt('Talk to us', 'تواصل معنا'), pageId: 'p-contact' },
  showSearch: true,
  highlights: [
    { id: 'h1', label: lt('Live sessions') },
    { id: 'h2', label: lt('Exam practice') },
    { id: 'h3', label: lt('Certificates') },
    { id: 'h4', label: lt('Progress you can see') },
    { id: 'h5', label: lt('A fifth is dropped') },
  ],
  image: 'theme-asset:manara/home-hero',
};

describe('ManaraHero', () => {
  it('renders the stage: night block with the sweeping beam, h1 with the highlight, actions, proof pills, search, poster', () => {
    const { container } = wrap(
      <ManaraHero
        config={HERO}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Score higher this year');
    expect(h1.querySelector('[data-highlight]')?.textContent).toBe('higher');
    // The LCP headline never takes part in the entrance; short titles keep
    // the full display size.
    expect(h1.className).not.toContain('mn-enter');
    expect(h1.hasAttribute('data-long')).toBe(false);
    const section = screen.getByRole('region', { name: h1.textContent! });
    expect(section.getAttribute('data-env')).toBe('night');
    const beam = section.querySelector('.mn-beam')!;
    expect(beam.hasAttribute('data-sweep')).toBe(true);
    expect(beam.getAttribute('data-position')).toBe('end');
    const pills = container.querySelectorAll('.mnh-hero-pills li');
    expect(pills).toHaveLength(4);
    expect(pills[0].textContent).toBe('Live sessions');
    const join = screen.getByRole('link', { name: /Join now/ });
    expect(join.getAttribute('href')).toBe('/courses');
    expect(join.className).toContain('mn-btn-lg');
    const talk = screen.getByRole('link', { name: 'Talk to us' });
    expect(talk.getAttribute('href')).toBe('/contact');
    expect(talk.className).toContain('mn-btn-outline');
    expect(
      screen.getByRole('searchbox', { name: 'Find a course' })
    ).toBeTruthy();
    expect(
      container.querySelector('.mn-frame')?.getAttribute('data-shape')
    ).toBe('poster');
    // Phone order: the poster closes the stage after the copy.
    const copy = container.querySelector('.mnh-hero-copy')!;
    const poster = container.querySelector('.mn-frame')!;
    expect(copy.compareDocumentPosition(poster)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('steps a long headline down one size (data-long above 48 characters)', () => {
    wrap(
      <ManaraHero
        config={{
          title: lt(
            'The complete preparation programme for every secondary-school subject'
          ),
        }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(
      screen.getByRole('heading', { level: 1 }).hasAttribute('data-long')
    ).toBe(true);
  });

  it('opens the catalogue filtered by the search on the public site (Arabic keeps its prefix)', () => {
    wrap(
      <ManaraHero
        config={HERO}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('ارفع درجاتك هذا العام');
    expect(h1.closest('[dir]')?.getAttribute('dir')).toBe('rtl');
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'فيزياء' },
    });
    fireEvent.submit(screen.getByRole('search'));
    expect(
      decodeURIComponent(screen.getByTestId('location').textContent ?? '')
    ).toBe('/ar/courses?q=فيزياء');
  });

  it('in a preview renders inert buttons and a search that goes nowhere', () => {
    wrap(<ManaraHero config={HERO} academyId="a1" pages={PAGES} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: /Join now/ })).toBeTruthy();
    fireEvent.submit(screen.getByRole('search'));
    expect(screen.getByTestId('location').textContent).toBe('/');
  });

  it('hides the search without a catalogue page, and is an h2 when it does not open the page', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <I18nextProvider i18n={i18nEn}>
          <MemoryRouter>
            <PublicWebsiteLocaleProvider locale="en">
              <WebsiteThemeScope theme={getWebsiteTheme('manara')}>
                <PageHeadingProvider value="h2">
                  <ManaraHero
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

  it('with only a title, renders the headline alone (no frame, no actions, no pills)', () => {
    const { container } = wrap(
      <ManaraHero
        config={{ title: lt('Welcome') }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Welcome'
    );
    expect(container.querySelector('.mn-frame')).toBeNull();
    expect(container.querySelector('.mnh-hero-pills')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Authored sections                                                    */
/* ------------------------------------------------------------------ */

describe('Authored sections never draw an h1', () => {
  it('about, featureSplit and cta use h2/h3 only', () => {
    const { container } = wrap(
      <>
        <ManaraAbout
          config={{ title: lt('Who we are'), body: lt('First.\n\nSecond.') }}
          academyId="a1"
          pages={PAGES}
        />
        <ManaraFeatureSplit
          config={{
            title: lt('How we teach'),
            imagePosition: 'start',
            items: [{ id: '1', title: lt('One') }],
          }}
          academyId="a1"
          pages={PAGES}
        />
        <ManaraCta
          config={{
            title: lt('Enrolment is open'),
            cta: { label: lt('Join') },
          }}
          academyId="a1"
          pages={PAGES}
        />
      </>
    );
    expect(container.querySelector('h1')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3);
  });
});

describe('ManaraAbout', () => {
  it('sets the first paragraph as the large lead and the image as a slanted plate', () => {
    const { container } = wrap(
      <ManaraAbout
        config={{
          title: lt('Who we are', 'من نحن'),
          body: lt(
            'We teach for results.\n\nEvery lesson ends with practice.',
            'نعلّم من أجل النتائج.\n\nكل درس ينتهي بتدريب.'
          ),
          image: 'theme-asset:manara/about-story',
        }}
        academyId="a1"
        pages={PAGES}
      />,
      'ar'
    );
    const paragraphs = container.querySelectorAll('.mnh-about-body p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].className).toContain('mnh-about-lead');
    expect(paragraphs[0].textContent).toBe('نعلّم من أجل النتائج.');
    expect(
      container.querySelector('.mnh-about-plate')?.getAttribute('data-shape')
    ).toBe('slant');
    expect(screen.getByRole('region', { name: 'من نحن' })).toBeTruthy();
  });
});

describe('ManaraFeatureSplit', () => {
  const config: SectionConfigMap['featureSplit'] = {
    eyebrow: lt('Method'),
    title: lt('How we teach'),
    image: 'theme-asset:manara/home-benefit',
    imageAlt: lt('A teacher at a blank board'),
    imagePosition: 'end',
    items: [1, 2, 3].map((n) => ({ id: String(n), title: lt(`Point ${n}`) })),
    cta: { label: lt('About us'), pageId: 'p-home' },
  };

  it('numbers its points, slants the plate and honours the image side', () => {
    const { container } = wrap(
      <ManaraFeatureSplit
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const numerals = [...container.querySelectorAll('.mnh-point-no')].map(
      (node) => node.textContent
    );
    expect(numerals).toEqual(['01', '02', '03']);
    const plate = container.querySelector('.mnh-split-plate')!;
    expect(plate.getAttribute('data-shape')).toBe('slant');
    expect(plate.className).toContain('lg:order-last');
    expect(container.querySelector('.mnh-eyebrow .mn-label')?.textContent).toBe(
      'Method'
    );
    const link = screen.getByRole('link', { name: /About us/ });
    expect(link.getAttribute('href')).toBe('/');
    expect(link.className).toContain('mn-btn-block');
  });

  it('without an image, lays the points out as text', () => {
    const { container } = wrap(
      <ManaraFeatureSplit
        config={{ ...config, image: undefined }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(container.querySelector('.mn-frame')).toBeNull();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });
});

describe('ManaraFeatures', () => {
  const items = ['A', 'B', 'C', 'D'].map((name) => ({
    id: name,
    icon: 'Clock',
    title: lt(`Title ${name}`),
    description: lt(`Text ${name}`),
  }));

  it('is a grid of four icon cards; the strip is a single row', () => {
    const { container } = wrap(
      <ManaraFeatures
        config={{ title: lt("What's included"), items }}
        academyId="a1"
        pages={PAGES}
      />
    );
    const cards = container.querySelectorAll('.mnh-included .mn-card');
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(
        card.querySelector('.mnh-feature-icon')?.getAttribute('aria-hidden')
      ).toBe('true');
    }
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
    cleanup();
    const strip = wrap(
      <ManaraFeatures
        config={{ layout: 'strip', title: lt('Why us'), items }}
        academyId="a1"
        pages={PAGES}
      />
    );
    const list = strip.container.querySelector('.mnh-included')!;
    expect(list.hasAttribute('data-strip')).toBe(true);
    expect(list.getAttribute('style')).toContain('--mnh-cols: 4');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Why us' })
    ).toBeTruthy();
  });

  it('draws nothing without items', () => {
    const { container } = wrap(
      <ManaraFeatures config={{ items: [] }} academyId="a1" pages={PAGES} />
    );
    expect(container.querySelector('section')).toBeNull();
  });
});

describe('ManaraSteps', () => {
  it('is a soft track of outlined numerals with a beam, and nothing when empty', () => {
    const { container } = wrap(
      <ManaraSteps
        config={{
          title: lt('Start in three steps'),
          items: [1, 2, 3].map((n) => ({
            id: String(n),
            title: lt(`Step ${n}`),
          })),
        }}
        academyId="a1"
        pages={PAGES}
      />
    );
    const section = screen.getByRole('region', {
      name: 'Start in three steps',
    });
    expect(section.getAttribute('data-env')).toBe('soft');
    expect(container.querySelectorAll('ol.mnh-steps > li')).toHaveLength(3);
    expect(container.querySelector('.mnh-steps-beam')).toBeTruthy();
    expect(container.querySelector('ol')?.getAttribute('style')).toContain(
      '--mnh-steps: 3'
    );
    expect(
      [...container.querySelectorAll('.mnh-step-no')].map(
        (node) => node.textContent
      )
    ).toEqual(['01', '02', '03']);
    expect(container.querySelector('.mn-frame')).toBeNull();
    cleanup();
    const empty = wrap(
      <ManaraSteps config={{ items: [] }} academyId="a1" pages={PAGES} />
    );
    expect(empty.container.querySelector('section')).toBeNull();
  });

  it('draws an optional plate as a slant', () => {
    const { container } = wrap(
      <ManaraSteps
        config={{
          title: lt('Start'),
          image: 'theme-asset:manara/home-benefit',
          items: [{ id: '1', title: lt('Step 1') }],
        }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(
      container.querySelector('.mnh-steps-plate')?.getAttribute('data-shape')
    ).toBe('slant');
  });
});

describe('ManaraCta', () => {
  const config: SectionConfigMap['cta'] = {
    title: lt('Enrolment is open'),
    description: lt('Join the next group.'),
    cta: { label: lt('Create your account'), authAction: 'signUp' },
    secondaryCta: { label: lt('Browse courses'), pageId: 'p-courses' },
    image: 'theme-asset:manara/home-cta',
  };

  it('is the closing brand block with the beam at the start, a seam and both actions', () => {
    const { container } = wrap(
      <ManaraCta
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const block = screen.getByRole('region', { name: 'Enrolment is open' });
    expect(block.getAttribute('data-env')).toBe('block');
    expect(block.hasAttribute('data-seam-top')).toBe(true);
    expect(block.querySelector('.mn-beam')?.getAttribute('data-position')).toBe(
      'start'
    );
    expect(screen.getByRole('heading', { level: 2 }).className).toContain(
      'mn-display'
    );
    const primary = screen.getByRole('link', { name: /Create your account/ });
    expect(primary.getAttribute('href')).toBe('/sign-up');
    expect(primary.className).toContain('mn-btn-lg');
    const secondary = screen.getByRole('link', { name: 'Browse courses' });
    expect(secondary.getAttribute('href')).toBe('/courses');
    expect(secondary.className).toContain('mn-btn-outline');
    expect(
      container.querySelector('.mnh-cta-plate')?.getAttribute('data-shape')
    ).toBe('slant');
  });

  it('renders nothing for a public action whose page is gone', () => {
    wrap(
      <ManaraCta
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

describe('ManaraGallery', () => {
  it('is a slanted mosaic with numbered captions and no lightbox; nothing without images', () => {
    const { container } = wrap(
      <ManaraGallery
        config={{
          title: lt('Inside the centre'),
          images: [1, 2, 3].map((n) => ({
            id: String(n),
            image: `theme-asset:manara/gallery-${n}`,
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
    for (const frame of container.querySelectorAll('.mnh-gallery .mn-frame')) {
      expect(frame.getAttribute('data-shape')).toBe('slant');
    }
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    cleanup();
    const empty = wrap(
      <ManaraGallery config={{ images: [] }} academyId="a1" pages={PAGES} />
    );
    expect(empty.container.querySelector('section')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Live-data sections                                                   */
/* ------------------------------------------------------------------ */

describe('ManaraCourseCategories', () => {
  const config = {
    title: lt('Pick your track'),
    maxItems: 8,
    showCounts: true,
  };

  it('is hidden publicly with fewer than two categories; the preview says why', () => {
    categories = [
      { id: 'c1', name: 'Physics', slug: 'physics', courseCount: 2 },
    ];
    const { container } = wrap(
      <ManaraCourseCategories
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    const preview = wrap(
      <ManaraCourseCategories config={config} academyId="a1" pages={PAGES} />
    );
    expect(preview.container.querySelector('[data-preview-note]')).toBeTruthy();
  });

  it('sets each category as a block tile linking to the filtered catalogue, tones alternating', () => {
    categories = [
      { id: 'c1', name: 'Physics', slug: 'physics', courseCount: 2 },
      { id: 'c2', name: 'Chemistry', slug: 'chemistry', courseCount: 1 },
    ];
    const { container } = wrap(
      <ManaraCourseCategories
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const physics = screen.getByRole('link', { name: /Physics/ });
    expect(physics.getAttribute('href')).toBe('/courses?category=c1');
    expect(within(physics).getByText('2 courses')).toBeTruthy();
    expect(physics.querySelector('.mn-arrow')).toBeTruthy();
    const tiles = container.querySelectorAll('.mnh-tracks .mn-tile');
    expect(tiles).toHaveLength(2);
    expect(tiles[0].hasAttribute('data-tone')).toBe(false);
    expect(tiles[1].getAttribute('data-tone')).toBe('accent');
    expect(
      screen
        .getByRole('link', { name: /See every course/ })
        .getAttribute('href')
    ).toBe('/courses');
  });

  it('in Arabic uses Arabic-Indic digits and plural forms; in a preview the names are plain text', () => {
    categories = [
      { id: 'c1', name: 'فيزياء', slug: 'physics', courseCount: 5 },
      { id: 'c2', name: 'كيمياء', slug: 'chemistry', courseCount: 2 },
    ];
    wrap(
      <ManaraCourseCategories config={config} academyId="a1" pages={PAGES} />,
      'ar'
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('٥ دورات')).toBeTruthy();
    expect(screen.getByText('دورتان')).toBeTruthy();
  });
});

describe('ManaraFeaturedCourses', () => {
  const config: SectionConfigMap['featuredCourses'] = {
    title: lt('Now enrolling'),
    mode: 'latest',
    layout: 'grid',
    count: 6,
    showPrice: true,
    showInstructor: true,
  };

  it('is a rail of poster cards linking to each course, with level pill, teacher, price and arrow', () => {
    courses = [
      course('c1'),
      course('c2', {
        thumbnail: 'https://cdn.example/t.png',
        level: 'advanced',
      } as Partial<Course>),
    ];
    const { container } = wrap(
      <ManaraFeaturedCourses
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const rail = container.querySelector('[data-courses-rail]')!;
    expect(rail.className).toContain('mn-rail');
    const cards = screen.getAllByRole('link', { name: /Course c/ });
    expect(cards.map((card) => card.getAttribute('href'))).toEqual([
      '/courses/c1',
      '/courses/c2',
    ]);
    for (const card of cards) expect(card.className).toContain('mn-card');
    expect(
      cards[0].querySelector('.mn-frame')?.getAttribute('data-shape')
    ).toBe('slant');
    expect(within(cards[0]).getByText('Beginner').className).toContain(
      'mnh-course-level'
    );
    expect(within(cards[1]).getByText('Advanced')).toBeTruthy();
    expect(within(cards[0]).getByText('With Layla Haddad')).toBeTruthy();
    const price = cards[0].querySelector('.mnh-course-price')!;
    expect(price.textContent).toContain('99');
    expect(price.getAttribute('data-tone')).toBe('accent');
    expect(cards[0].querySelector('.mn-arrow')).toBeTruthy();
    // A course with its own thumbnail shows it; one without takes the
    // theme's poster fallback.
    expect(cards[1].querySelector('img')?.getAttribute('src')).toBe(
      'https://cdn.example/t.png'
    );
    // (Released or not, the fallback is the theme's own plate, never
    // another course's picture.)
    expect(cards[0].querySelector('.mn-frame')).toBeTruthy();
    expect(cards[0].querySelector('img')?.getAttribute('src') ?? '').not.toBe(
      'https://cdn.example/t.png'
    );
    const viewAll = screen.getByRole('link', { name: /View all courses/ });
    expect(viewAll.getAttribute('href')).toBe('/courses');
    expect(viewAll.className).toContain('mn-btn-block');
  });

  it('hides price and teacher when turned off; preview cards are inert articles on a focusable rail', () => {
    courses = [course('c1')];
    const { container } = wrap(
      <ManaraFeaturedCourses
        config={{ ...config, showPrice: false, showInstructor: false }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(screen.queryByText('With Layla Haddad')).toBeNull();
    expect(container.querySelector('.mnh-course-price')).toBeNull();
    expect(screen.getByRole('article')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
    const rail = container.querySelector('[data-courses-rail]')!;
    expect(rail.getAttribute('tabindex')).toBe('0');
    expect(rail.getAttribute('aria-label')).toBe('Now enrolling');
  });

  it('shows the designed "launching soon" night tile with no courses', () => {
    wrap(
      <ManaraFeaturedCourses
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const launching = document.querySelector('[data-courses-launching]')!;
    expect(launching.className).toContain('mn-tile');
    expect(launching.getAttribute('data-tone')).toBe('night');
    expect(launching.querySelector('.mn-frame')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Contact us' }).getAttribute('href')
    ).toBe('/contact');
    expect(screen.queryByRole('link', { name: /View all courses/ })).toBeNull();
  });

  it('says plainly when the courses failed to load, with a retry', () => {
    coursesState = { isLoading: false, isError: true };
    wrap(
      <ManaraFeaturedCourses
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

describe('ManaraInstructors', () => {
  const config = { title: lt('Your teachers'), count: 4 };

  it('is hidden publicly with no teachers; the preview shows labelled samples', () => {
    const { container } = wrap(
      <ManaraInstructors
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    const preview = wrap(
      <ManaraInstructors config={config} academyId="a1" pages={PAGES} />
    );
    const sample = preview.container.querySelector('[data-preview-sample]')!;
    expect(sample.textContent).toContain('Sample');
    expect(sample.querySelectorAll('li')).toHaveLength(4);
    expect(sample.textContent).toContain('Teacher name');
  });

  it('derives name plates from the catalogue, with course counts and monograms', () => {
    courses = [
      course('c1'),
      course('c2'),
      course('c3', {
        instructors: [{ id: 'i2', name: 'Daniel Okafor' }],
      } as Partial<Course>),
    ];
    const { container } = wrap(
      <ManaraInstructors
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'Layla Haddad' })
    ).toBeTruthy();
    expect(screen.getByText('2 courses')).toBeTruthy();
    expect(screen.getByText('1 course')).toBeTruthy();
    expect(screen.getByText('DO')).toBeTruthy();
    expect(container.querySelectorAll('.mnh-teachers .mn-card')).toHaveLength(
      2
    );
  });
});

describe('ManaraStatistics', () => {
  const config: SectionConfigMap['statistics'] = {
    title: lt('The scoreboard', 'لوحة الأرقام'),
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
        label: lt('Students', 'طلاب'),
      },
      {
        id: 's3',
        metric: 'instructors',
        value: lt(''),
        label: lt('Teachers', 'معلّمون'),
      },
    ],
  };

  it('is a seamed day block of tiles with real non-zero numbers, tones alternating', () => {
    statistics = { courses: 6, students: 0, instructors: 3 };
    const { container } = wrap(
      <ManaraStatistics
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const block = screen.getByRole('region', { name: 'The scoreboard' });
    expect(block.getAttribute('data-env')).toBe('day');
    expect(block.hasAttribute('data-seam-top')).toBe(true);
    expect(screen.queryByText('Students')).toBeNull();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
    const tiles = container.querySelectorAll('.mnh-score .mn-tile');
    expect(tiles).toHaveLength(2);
    expect(tiles[0].hasAttribute('data-tone')).toBe(false);
    expect(tiles[1].getAttribute('data-tone')).toBe('accent');
    expect(tiles[0].querySelector('.mn-numeral')?.textContent).toBe('6');
  });

  it('shows live metrics only: a typed value never becomes a number', () => {
    statistics = { courses: 6, students: 0, instructors: 0 };
    const { container } = wrap(
      <ManaraStatistics
        config={{
          items: [
            config.items[0],
            { id: 'typed', value: lt('10,000+'), label: lt('Followers') },
          ],
        }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
    expect(screen.queryByText('10,000+')).toBeNull();
  });

  it('is hidden publicly with fewer than two numbers; the preview says why', () => {
    statistics = { courses: 6, students: 0, instructors: 0 };
    const { container } = wrap(
      <ManaraStatistics
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    const preview = wrap(
      <ManaraStatistics config={config} academyId="a1" pages={PAGES} />
    );
    const sample = preview.container.querySelector('[data-preview-sample]')!;
    expect(sample.textContent).toContain('Sample');
    for (const value of sample.querySelectorAll('.mnh-score-value')) {
      expect(value.textContent).toBe('—');
    }
  });

  it("shows numbers in the locale's digits in Arabic", () => {
    statistics = { courses: 6, students: 1240, instructors: 3 };
    const { container } = wrap(
      <ManaraStatistics
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    const shown = [...container.querySelectorAll('.mn-numeral')].map(
      (node) => node.textContent
    );
    expect(shown).toEqual(['٦', '١٬٢٤٠', '٣']);
  });
});

describe('ManaraTestimonials', () => {
  const items = (sample: boolean) =>
    ['Sara', 'James', 'Nour'].map((name, index) => ({
      id: `t${index}`,
      quote: lt(`Quote from ${name}`, `رأي ${name}`),
      authorName: name,
      authorRole: lt('Grade 12'),
      rating: 5,
      sample,
    }));

  it('never shows sample testimonials on the public site', () => {
    const { container } = wrap(
      <ManaraTestimonials
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
      <ManaraTestimonials
        config={{ items: items(true) }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(container.querySelector('[data-sample-badge]')?.textContent).toBe(
      'Sample'
    );
  });

  it('shows one quote at a time on the night ground with attribution pills, prev/next and a text count', () => {
    const { container } = wrap(
      <ManaraTestimonials
        config={{ title: lt('Students say'), items: items(false) }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const block = screen.getByRole('region', { name: 'Students say' });
    expect(block.getAttribute('data-env')).toBe('night');
    expect(
      container.querySelector('.mnh-quote-glyph')?.getAttribute('aria-hidden')
    ).toBe('true');
    expect(container.querySelectorAll('blockquote')).toHaveLength(1);
    expect(
      container.querySelector('[aria-live="polite"]')?.textContent
    ).toContain('Quote from Sara');
    const pills = container.querySelectorAll('.mnh-quote-pills .mn-pill');
    expect([...pills].map((pill) => pill.textContent)).toEqual([
      'Sara',
      'Grade 12',
      'Rated 5 out of 5',
    ]);
    const count = () =>
      container.querySelector('.mnh-quote-count')?.textContent;
    expect(count()).toBe('01/03');

    fireEvent.click(screen.getByRole('button', { name: 'Next quote' }));
    expect(screen.getByText('Quote from James')).toBeTruthy();
    expect(count()).toBe('02/03');
    expect(screen.getByText('Quote 2 of 3')).toBeTruthy();

    // Keyboard: the arrows page from the focused quote group.
    const group = screen.getByRole('group', { name: 'Students say' });
    expect(group.getAttribute('tabindex')).toBe('0');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(count()).toBe('03/03');
    // Paging wraps, so the focused button never becomes disabled.
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(count()).toBe('01/03');
    fireEvent.click(screen.getByRole('button', { name: 'Previous quote' }));
    expect(count()).toBe('03/03');
    // No autoplay: nothing changes on its own.
    expect(container.querySelector('[data-autoplay]')).toBeNull();
  });

  it('follows the reading direction in Arabic', () => {
    const { container } = wrap(
      <ManaraTestimonials
        config={{ items: items(false) }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    const group = screen.getByRole('group', { name: 'آراء الطلاب' });
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(container.querySelector('.mnh-quote-count')?.textContent).toBe(
      '٠٢/٠٣'
    );
    expect(screen.getByText('رأي James')).toBeTruthy();
  });

  it('with a single quote shows no controls', () => {
    wrap(
      <ManaraTestimonials
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

describe('ManaraFaq', () => {
  const questions = Array.from({ length: 6 }, (_, i) => ({
    id: `q${i}`,
    question: lt(`Question ${i + 1}?`),
    answer: lt(`Answer ${i + 1}.`),
  }));

  it('as the Home teaser shows the first N numbered questions and links to the rest', () => {
    wrap(
      <ManaraFaq
        config={{
          title: lt('Before you join'),
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
        .getByRole('link', { name: /See all questions/ })
        .getAttribute('href')
    ).toBe('/faqs');
  });

  it('expands and collapses an answer region from its button', () => {
    wrap(
      <ManaraFaq
        config={{ title: lt('Before you join'), items: questions.slice(0, 2) }}
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
      <ManaraFaq
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
    ).toContain('mn-sr-only');
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: /Contact us/ })).toBeTruthy();
    cleanup();
    const empty = wrap(
      <ManaraFaq config={{ items: [] }} academyId="a1" pages={PAGES} />
    );
    expect(empty.container.querySelector('section')).toBeNull();
  });
});
