/**
 * Theme 1 Home renderers (plan Phase 5 tests):
 * - each renderer with empty, typical and maximal content;
 * - the live-data hiding rules (zero statistics, fewer than two metrics or
 *   categories, no instructors), with the preview explaining a hidden
 *   section;
 * - sample testimonials excluded from the public site;
 * - carousel keyboard and ARIA, direction-aware;
 * - count-up disabled under reduced motion;
 * - placeholders for unreleased theme photographs;
 * - the hero entrance never animating the headline.
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
import { PublicWebsiteLocaleProvider } from '../renderer/PublicWebsiteLocaleContext';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import type {
  Course,
  PublicCourseCategory,
  SectionConfigMap,
  WebsitePage,
} from '@types';
import { T1Hero } from './T1Hero';
import {
  T1Cta,
  T1FeatureSplit,
  T1Features,
  T1Steps,
} from './t1-content-sections';
import {
  T1CourseCategories,
  T1FeaturedCourses,
  T1Instructors,
  T1Statistics,
  T1Testimonials,
} from './t1-live-sections';
import { T1Faq } from './T1Faq';

/* ------------------------------------------------------------------ */
/* Live data                                                            */
/* ------------------------------------------------------------------ */

let courses: Course[] = [];
let categories: PublicCourseCategory[] = [];
let statistics = { courses: 0, students: 0, instructors: 0 };

vi.mock('@/shared/hooks/usePublicCourses', () => ({
  usePublicCourses: () => ({
    data: {
      items: courses,
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: courses.length,
        totalPages: 1,
      },
    },
    isLoading: false,
  }),
}));
vi.mock('@/shared/hooks/usePublicCourseCategories', () => ({
  usePublicCourseCategories: () => ({ data: categories, isLoading: false }),
}));
vi.mock('@/shared/hooks/usePublicWebsiteStatistics', () => ({
  usePublicWebsiteStatistics: () => ({ data: statistics, isLoading: false }),
}));

/** Embla needs layout jsdom lacks: a fake API with three snaps. */
const embla = {
  selected: 0,
  scrollPrev: vi.fn(),
  scrollNext: vi.fn(),
  scrollTo: vi.fn(),
  selectedScrollSnap: () => embla.selected,
  scrollSnapList: () => [0, 1, 2],
  on: vi.fn(),
  off: vi.fn(),
};
const emblaOptions: unknown[] = [];
vi.mock('embla-carousel-react', () => ({
  default: (options: unknown) => {
    emblaOptions.push(options);
    return [() => undefined, embla];
  },
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
    pricing: { type: 'paid', price: 99, currency: 'USD' },
    instructors: [{ id: 'i1', name: 'Layla Haddad' }],
    ...fields,
  } as unknown as Course;
}

const setMatchMedia = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

beforeEach(() => {
  courses = [];
  categories = [];
  statistics = { courses: 0, students: 0, instructors: 0 };
  embla.selected = 0;
  emblaOptions.length = 0;
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // @ts-expect-error — jsdom has no matchMedia; tests add it as needed.
  delete window.matchMedia;
});

/* ------------------------------------------------------------------ */
/* Hero                                                                 */
/* ------------------------------------------------------------------ */

const HERO: SectionConfigMap['hero'] = {
  eyebrow: lt('Enrolment is open'),
  title: lt('Learn the skills that move your career forward'),
  highlight: lt('move your career forward'),
  description: lt('Practical courses.'),
  cta: { label: lt('Explore courses'), pageId: 'p-courses' },
  secondaryCta: { label: lt('Talk to us'), pageId: 'p-contact' },
  showSearch: true,
  highlights: [
    { id: 'h1', label: lt('Project-based') },
    { id: 'h2', label: lt('Self-paced') },
    { id: 'h3', label: lt('Real support') },
    { id: 'h4', label: lt('Certificates') },
    { id: 'h5', label: lt('A fifth is dropped') },
  ],
  image: 'theme-asset:modern-education/home-hero',
};

describe('T1Hero', () => {
  it('renders the promise: h1 with the highlighted phrase, actions, search, at most four chips', () => {
    statistics = { courses: 6, students: 10, instructors: 2 };
    const { container } = wrap(
      <T1Hero
        config={HERO}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe(
      'Learn the skills that move your career forward'
    );
    expect(h1.querySelector('[data-highlight]')?.textContent).toBe(
      'move your career forward'
    );
    // The LCP headline is never part of the entrance animation.
    expect(h1.className).not.toContain('t1-enter');
    expect(
      screen.getByRole('link', { name: /Explore courses/ }).getAttribute('href')
    ).toBe('/courses');
    expect(
      screen.getByRole('link', { name: 'Talk to us' }).getAttribute('href')
    ).toBe('/contact');
    expect(screen.getByRole('search')).toBeTruthy();
    expect(container.querySelectorAll('ul li')).toHaveLength(4);
    expect(
      container.querySelector('[data-course-count-chip]')?.textContent
    ).toContain('6 courses');
    // The released pilot renders as a picture (eager, high priority).
    const img = container.querySelector('picture img');
    expect(img?.getAttribute('fetchpriority')).toBe('high');
  });

  it('opens the catalog filtered by the search on the public site', () => {
    wrap(
      <T1Hero
        config={HERO}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'design' },
    });
    fireEvent.submit(screen.getByRole('search'));
    expect(screen.getByTestId('location').textContent).toBe(
      '/courses?q=design'
    );
  });

  it('keeps the Arabic prefix when searching from the Arabic site', () => {
    wrap(
      <T1Hero
        config={HERO}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'تصميم' },
    });
    fireEvent.submit(screen.getByRole('search'));
    expect(
      decodeURIComponent(screen.getByTestId('location').textContent ?? '')
    ).toBe('/ar/courses?q=تصميم');
  });

  it('hides the course-count chip at zero courses, and the search without a catalog page', () => {
    const { container } = wrap(
      <T1Hero
        config={HERO}
        academyId="a1"
        pages={PAGES.filter((page) => page.coreType !== 'courses')}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('[data-course-count-chip]')).toBeNull();
    expect(screen.queryByRole('search')).toBeNull();
  });

  it('with only a title, renders a centred text hero with no image frame', () => {
    const { container } = wrap(
      <T1Hero config={{ title: lt('Welcome') }} academyId="a1" pages={PAGES} />
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Welcome'
    );
    expect(container.querySelector('.t1-media')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Authored sections                                                    */
/* ------------------------------------------------------------------ */

describe('T1Features', () => {
  const items = ['A', 'B', 'C', 'D'].map((name) => ({
    id: name,
    icon: 'Clock',
    title: lt(`Title ${name}`),
    description: lt(`Text ${name}`),
  }));

  it('draws the highlights band with a screen-reader heading', () => {
    wrap(
      <T1Features
        config={{ layout: 'strip', title: lt('Why us'), items }}
        academyId="a1"
        pages={PAGES}
      />
    );
    const heading = screen.getByRole('heading', { level: 2, name: 'Why us' });
    expect(heading.className).toContain('sr-only');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
    expect(
      screen.getByRole('region', { name: 'Why us' }).getAttribute('data-tone')
    ).toBe('soft');
  });

  it('draws cards by default, and nothing when there are no items', () => {
    const { container } = wrap(
      <T1Features
        config={{ title: lt('Values'), items }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(container.querySelectorAll('.t1-card')).toHaveLength(4);
    cleanup();
    const empty = wrap(
      <T1Features config={{ items: [] }} academyId="a1" pages={PAGES} />
    );
    expect(empty.container.querySelector('section')).toBeNull();
  });
});

describe('T1FeatureSplit', () => {
  const config: SectionConfigMap['featureSplit'] = {
    eyebrow: lt('Why Horizon'),
    title: lt('Learning designed around progress'),
    image: 'theme-asset:modern-education/home-benefit',
    imagePosition: 'start',
    items: [1, 2, 3].map((n) => ({ id: String(n), title: lt(`Benefit ${n}`) })),
    cta: { label: lt('About us'), pageId: 'p-home' },
  };

  it('shows the neutral placeholder, labelled with its slot, for an unreleased photograph', () => {
    const { container } = wrap(
      <T1FeatureSplit config={config} academyId="a1" pages={PAGES} />
    );
    const placeholder = container.querySelector('[data-image-placeholder]');
    expect(placeholder).toBeTruthy();
    expect(placeholder?.getAttribute('aria-hidden')).toBe('true');
    expect(placeholder?.textContent).toBe('home-benefit · 4:3');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('without an image, lays the benefits out as a text section', () => {
    const { container } = wrap(
      <T1FeatureSplit
        config={{ ...config, image: undefined }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(container.querySelector('.t1-media')).toBeNull();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Learning designed around progress'
    );
  });
});

describe('T1Steps', () => {
  const steps = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: String(i),
      title: lt(`Step ${i + 1}`),
    }));

  it('is an ordered list with a connector between up to four steps', () => {
    const { container } = wrap(
      <T1Steps
        config={{ title: lt('How it works'), items: steps(3) }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(container.querySelector('ol')).toBeTruthy();
    expect(container.querySelectorAll('li.t1-step')).toHaveLength(3);
  });

  it('drops the connector when five or six steps wrap into rows', () => {
    const { container } = wrap(
      <T1Steps config={{ items: steps(6) }} academyId="a1" pages={PAGES} />
    );
    expect(container.querySelectorAll('li.t1-step')).toHaveLength(0);
    expect(container.querySelectorAll('li')).toHaveLength(6);
  });
});

describe('T1Cta', () => {
  const config: SectionConfigMap['cta'] = {
    title: lt('Start learning today'),
    description: lt('Create your free account.'),
    cta: { label: lt('Create your free account'), authAction: 'signUp' },
    secondaryCta: { label: lt('Browse courses'), pageId: 'p-courses' },
    image: 'theme-asset:modern-education/home-cta',
  };

  it('is the ink band with both actions and the photograph slot (hidden under 480px)', () => {
    const { container } = wrap(
      <T1Cta
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const band = screen.getByRole('region', { name: 'Start learning today' });
    expect(band.getAttribute('data-tone')).toBe('ink');
    expect(
      screen
        .getByRole('link', { name: /Create your free account/ })
        .getAttribute('href')
    ).toBe('/sign-up');
    expect(
      screen.getByRole('link', { name: 'Browse courses' }).getAttribute('href')
    ).toBe('/courses');
    const media = container.querySelector('.t1-media');
    expect(media?.className).toContain('hidden');
    expect(media?.className).toContain('min-[480px]:block');
  });

  it('centres the text when there is no photograph', () => {
    const { container } = wrap(
      <T1Cta
        config={{ ...config, image: undefined }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(container.querySelector('.t1-media')).toBeNull();
    expect(container.querySelector('.text-center')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* Live-data sections                                                   */
/* ------------------------------------------------------------------ */

describe('T1CourseCategories', () => {
  const config = { title: lt('Explore'), maxItems: 8, showCounts: true };

  it('is hidden publicly with fewer than two categories; the preview says why', () => {
    categories = [{ id: 'c1', name: 'Design', slug: 'design', courseCount: 2 }];
    const { container } = wrap(
      <T1CourseCategories
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    const preview = wrap(
      <T1CourseCategories config={config} academyId="a1" pages={PAGES} />
    );
    expect(preview.container.querySelector('[data-preview-note]')).toBeTruthy();
  });

  it('links each category tile to the filtered catalog, plus "browse all"', () => {
    categories = [
      { id: 'c1', name: 'Design', slug: 'design', courseCount: 2 },
      { id: 'c2', name: 'Business', slug: 'business', courseCount: 1 },
    ];
    wrap(
      <T1CourseCategories
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(
      screen.getByRole('link', { name: /Design/ }).getAttribute('href')
    ).toBe('/courses?category=c1');
    expect(
      screen
        .getByRole('link', { name: /Browse all courses/ })
        .getAttribute('href')
    ).toBe('/courses');
  });
});

describe('T1FeaturedCourses', () => {
  const config: SectionConfigMap['featuredCourses'] = {
    title: lt('Featured courses'),
    mode: 'latest',
    layout: 'grid',
    count: 6,
    showPrice: true,
    showInstructor: true,
  };

  it('shows the designed "launching soon" state with no courses (placeholder + contact)', () => {
    const { container } = wrap(
      <T1FeaturedCourses
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const panel = container.querySelector('[data-courses-launching]');
    expect(panel).toBeTruthy();
    expect(panel?.querySelector('[data-image-placeholder]')?.textContent).toBe(
      'courses-launching · 16:9'
    );
    expect(
      screen.getByRole('link', { name: 'Contact us' }).getAttribute('href')
    ).toBe('/contact');
    expect(screen.queryByRole('link', { name: /View all courses/ })).toBeNull();
  });

  it('renders each course as one link with its price, instructor and fallback media', () => {
    courses = [
      course('c1'),
      course('c2', {
        thumbnail: 'https://cdn.example/t.png',
      } as Partial<Course>),
    ];
    const { container } = wrap(
      <T1FeaturedCourses
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const links = screen.getAllByRole('link', { name: /Course c/ });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/courses/c1',
      '/courses/c2',
    ]);
    expect(within(links[0]).getByText('Layla Haddad')).toBeTruthy();
    expect(
      container.querySelectorAll('.t1-card-media svg pattern')
    ).toHaveLength(1);
    expect(
      screen
        .getByRole('link', { name: /View all courses/ })
        .getAttribute('href')
    ).toBe('/courses');
  });

  it('hides price and instructor when the Owner turns them off', () => {
    courses = [course('c1')];
    wrap(
      <T1FeaturedCourses
        config={{ ...config, showPrice: false, showInstructor: false }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(screen.queryByText('Layla Haddad')).toBeNull();
    expect(screen.getByRole('article')).toBeTruthy();
  });
});

describe('T1Instructors', () => {
  const config = { title: lt('Meet your instructors'), count: 4 };

  it('is hidden publicly with no instructors; the preview says why', () => {
    const { container } = wrap(
      <T1Instructors
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    const preview = wrap(
      <T1Instructors config={config} academyId="a1" pages={PAGES} />
    );
    expect(preview.container.querySelector('[data-preview-note]')).toBeTruthy();
  });

  it('derives instructors from the catalog, with their course counts and initials', () => {
    courses = [
      course('c1'),
      course('c2'),
      course('c3', {
        instructors: [{ id: 'i2', name: 'Daniel Okafor' }],
      } as Partial<Course>),
    ];
    wrap(
      <T1Instructors
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

describe('T1Statistics', () => {
  const config: SectionConfigMap['statistics'] = {
    title: lt('In numbers'),
    items: [
      { id: 's1', metric: 'courses', value: lt(''), label: lt('Courses') },
      { id: 's2', metric: 'students', value: lt(''), label: lt('Learners') },
      {
        id: 's3',
        metric: 'instructors',
        value: lt(''),
        label: lt('Instructors'),
      },
    ],
  };

  it('never shows a zero: zero metrics are dropped', () => {
    statistics = { courses: 6, students: 0, instructors: 3 };
    wrap(
      <T1Statistics
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(screen.queryByText('Learners')).toBeNull();
    expect(screen.getByText('Courses')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('is hidden publicly with fewer than two metrics; the preview says why', () => {
    statistics = { courses: 6, students: 0, instructors: 0 };
    const { container } = wrap(
      <T1Statistics
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
    cleanup();
    const preview = wrap(
      <T1Statistics config={config} academyId="a1" pages={PAGES} />
    );
    expect(preview.container.querySelector('[data-preview-note]')).toBeTruthy();
  });

  it("shows the final numbers at once under reduced motion, in the locale's digits", () => {
    setMatchMedia(true);
    statistics = { courses: 6, students: 1240, instructors: 3 };
    const { container } = wrap(
      <T1Statistics
        config={config}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    const shown = [...container.querySelectorAll('[data-count-up]')].map(
      (node) => node.textContent
    );
    expect(shown).toEqual(['٦', '١٬٢٤٠', '٣']);
  });
});

describe('T1Testimonials', () => {
  const items = (sample: boolean) =>
    ['Sara', 'James', 'Nour'].map((name, index) => ({
      id: `t${index}`,
      quote: lt(`Quote from ${name}`),
      authorName: name,
      rating: 5,
      sample,
    }));

  it('never shows sample testimonials on the public site', () => {
    setMatchMedia(false);
    const { container } = wrap(
      <T1Testimonials
        config={{ items: items(true) }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('section')).toBeNull();
  });

  it('labels samples "Sample" in the preview', () => {
    setMatchMedia(false);
    const { container } = wrap(
      <T1Testimonials
        config={{ items: items(true) }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(container.querySelectorAll('[data-sample-badge]')).toHaveLength(3);
  });

  it('is a labelled carousel: slides "n of total", arrow buttons, dots, keyboard', () => {
    setMatchMedia(false);
    wrap(
      <T1Testimonials
        config={{ title: lt('What learners say'), items: items(false) }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    // The section is named by its heading; the carousel inside by its own label.
    expect(
      screen.getByRole('region', { name: 'What learners say' }).tagName
    ).toBe('SECTION');
    const region = screen.getByRole('region', { name: 'Testimonials' });
    expect(region.getAttribute('aria-roledescription')).toBe('carousel');
    const slides = region.querySelectorAll('li[aria-roledescription]');
    expect(slides[1].getAttribute('aria-label')).toBe('2 of 3');

    fireEvent.click(screen.getByRole('button', { name: 'Next testimonial' }));
    expect(embla.scrollNext).toHaveBeenCalledTimes(1);
    expect(
      (
        screen.getByRole('button', {
          name: 'Previous testimonial',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Show testimonial 3' }));
    expect(embla.scrollTo).toHaveBeenCalledWith(2);
    expect(
      screen
        .getByRole('button', { name: 'Show testimonial 1' })
        .getAttribute('aria-current')
    ).toBe('true');

    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(embla.scrollNext).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(embla.scrollPrev).toHaveBeenCalledTimes(1);
    // No autoplay plugin is ever passed.
    expect(
      emblaOptions.every((options) => !('plugins' in (options as object)))
    ).toBe(true);
  });

  it('follows the reading direction in Arabic and slides instantly under reduced motion', () => {
    setMatchMedia(true);
    wrap(
      <T1Testimonials
        config={{ title: lt('x', 'آراء'), items: items(false) }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    expect(emblaOptions.at(-1)).toMatchObject({
      direction: 'rtl',
      duration: 0,
    });
    const region = screen.getByRole('region', { name: 'آراء المتعلّمين' });
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(embla.scrollNext).toHaveBeenCalledTimes(1);
  });

  it('renders a plain list where the browser has no matchMedia', () => {
    const { container } = wrap(
      <T1Testimonials
        config={{ items: items(false) }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(container.querySelector('[data-t1-carousel]')).toBeNull();
    expect(container.querySelectorAll('figure')).toHaveLength(3);
  });
});

/* ------------------------------------------------------------------ */
/* FAQ                                                                  */
/* ------------------------------------------------------------------ */

describe('T1Faq', () => {
  const questions = Array.from({ length: 6 }, (_, i) => ({
    id: `q${i}`,
    question: lt(`Question ${i + 1}?`),
    answer: lt(`Answer ${i + 1}.`),
  }));

  it('as the Home teaser shows the first N and links to the rest', () => {
    wrap(
      <T1Faq
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
    expect(screen.getAllByRole('button', { name: /Question/ })).toHaveLength(4);
    expect(
      screen
        .getByRole('link', { name: /See all questions/ })
        .getAttribute('href')
    ).toBe('/faqs');
  });

  it('without maxItems lists every question; nothing without questions', () => {
    wrap(<T1Faq config={{ items: questions }} academyId="a1" pages={PAGES} />);
    expect(screen.getAllByRole('button', { name: /Question/ })).toHaveLength(6);
    cleanup();
    const empty = wrap(
      <T1Faq config={{ items: [] }} academyId="a1" pages={PAGES} />
    );
    expect(empty.container.querySelector('section')).toBeNull();
  });
});
