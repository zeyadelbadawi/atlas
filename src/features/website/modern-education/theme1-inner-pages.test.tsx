/**
 * Theme 1 inner pages (plan Phase 6 tests):
 * - page heroes: About's editorial composition with the page's h1, the
 *   Courses hero handing its search to the catalog below, the FAQ filter;
 * - the fallback page hero for existing (v1) pages without one;
 * - the catalog: filters, URL state, the "no courses yet" state;
 * - Course Details' primary action for signed-out, enrolled, free and
 *   paid (behaviour unchanged, now from `useCourseDetails`);
 * - the contact form's success and error states;
 * - the gallery lightbox's keyboard, direction-aware;
 * - 404 and Coming Soon, with Themes 2–5 keeping the shared pages.
 */
import type * as ThemeAssetRegistry from '../theme-assets/theme-asset.registry';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { LEARNER_ROUTES, buildPath } from '@app/routes/route-paths';
import { publicWebsiteService } from '@services';
import { PublicWebsiteLocaleProvider } from '../renderer/PublicWebsiteLocaleContext';
import { useCourseDetails } from '../renderer/useCourseDetails';
import {
  WebsiteComingSoon,
  hasThemeComingSoon,
  hasThemeNotFound,
} from '../renderer/WebsiteSystemPages';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import { SELECTABLE_WEBSITE_THEME_KEYS, WEBSITE_THEME_KEYS } from '@types';
import type {
  Course,
  SectionConfigMap,
  WebsiteNavigationItem,
  WebsitePage,
} from '@types';
import { T1PageHeader, T1PageIntro } from './T1PageHeader';
import { T1CourseCatalog } from './T1CourseCatalog';
import { T1Contact, T1Gallery } from './t1-page-sections';
import { T1Faq } from './T1Faq';
import { T1NotFound } from './T1SystemPages';
import { matchesFaqFilter, setFaqFilter } from './t1-faq-filter';

/* ------------------------------------------------------------------ */
/* Theme assets                                                         */
/* ------------------------------------------------------------------ */

// Every Theme 1 photograph is released (plan §V), but the designed
// "not released yet" state is still real behaviour (a future asset or
// theme). These slots are pinned to it here, as they were before release;
// the released rendering is covered by `theme-assets/`, the visual
// baseline and the in-context image QA.
vi.mock('../theme-assets/theme-asset.registry', async (importOriginal) => {
  const actual = await importOriginal<typeof ThemeAssetRegistry>();
  const pending = new Set([
    'about-header',
    'gallery-1',
    'gallery-2',
    'gallery-3',
    'gallery-4',
    'gallery-5',
  ]);
  return {
    ...actual,
    findThemeAsset: (...args: Parameters<typeof actual.findThemeAsset>) => {
      const found = actual.findThemeAsset(...args);
      if (!found || !pending.has(found.entry.key)) return found;
      const { version: _v, lqip: _l, provenance: _p, ...entry } = found.entry;
      return { ...found, entry: { ...entry, status: 'pending' as const } };
    },
  };
});

/* ------------------------------------------------------------------ */
/* Live data                                                            */
/* ------------------------------------------------------------------ */

let courses: Course[] = [];
const courseQueries: unknown[] = [];

vi.mock('@/shared/hooks/usePublicCourses', () => ({
  usePublicCourses: (_academyId: string, options?: { query?: unknown }) => {
    courseQueries.push(options?.query);
    return {
      data: {
        items: courses,
        pagination: {
          page: 1,
          pageSize: 9,
          totalItems: courses.length,
          totalPages: 1,
        },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  },
}));
vi.mock('@/shared/hooks/usePublicCourseCategories', () => ({
  usePublicCourseCategories: () => ({
    data: [
      { id: 'cat-1', name: 'Design', slug: 'design', courseCount: 2 },
      { id: 'cat-2', name: 'Business', slug: 'business', courseCount: 1 },
    ],
    isLoading: false,
  }),
}));
vi.mock('@/shared/hooks/usePublicWebsiteStatistics', () => ({
  usePublicWebsiteStatistics: () => ({
    data: { courses: 3, students: 10, instructors: 2 },
    isLoading: false,
  }),
}));
vi.mock('@/shared/hooks/useAcademyIdentity', () => ({
  useAcademyIdentity: () => ({
    data: { contactEmail: 'hello@academy.example', contactPhone: '+971 4 555' },
  }),
}));

// Course Details: the public course, the visitor's session and enrolment.
let publicCourse: Partial<Course> | undefined;
let authenticated = false;
let enrollment:
  | {
      status: string;
      progress?: { learningState?: string; completionState?: string };
    }
  | undefined;
const enroll = vi.fn();
vi.mock('@/shared/hooks/usePublicCourse', () => ({
  usePublicCourse: () => ({
    data: publicCourse,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  usePublicCourseCurriculum: () => ({ data: undefined, isLoading: false }),
}));
vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { status: authenticated ? 'authenticated' : 'anonymous' },
  }),
}));
vi.mock('@features/learning', () => ({
  useEnrollment: () => ({ data: enrollment }),
  useEnroll: () => ({ mutateAsync: enroll, isPending: false }),
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
    id: 'p-about',
    coreType: 'about',
    slug: 'about',
    title: 'About',
    sections: [],
  },
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

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">{`${location.pathname}${location.search}`}</output>
  );
}

function Providers({
  children,
  locale = 'en',
}: {
  children: ReactNode;
  locale?: 'en' | 'ar';
}) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={locale === 'en' ? i18nEn : i18nAr}>
        <MemoryRouter initialEntries={['/courses/c1']}>
          <PublicWebsiteLocaleProvider locale={locale}>
            {children}
            <LocationProbe />
          </PublicWebsiteLocaleProvider>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const wrap = (children: ReactNode, locale: 'en' | 'ar' = 'en') =>
  render(<Providers locale={locale}>{children}</Providers>);

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

beforeEach(() => {
  courses = [];
  courseQueries.length = 0;
  publicCourse = undefined;
  authenticated = false;
  enrollment = undefined;
  window.history.replaceState(null, '', '/courses');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  enroll.mockReset();
  setFaqFilter('');
});

/* ------------------------------------------------------------------ */
/* Page heroes                                                          */
/* ------------------------------------------------------------------ */

describe('T1PageHeader', () => {
  it('About: the editorial hero — the page h1, lead, and the image slot as a neutral placeholder', () => {
    const { container } = wrap(
      <T1PageHeader
        config={{
          eyebrow: lt('About Horizon'),
          title: lt('We help people learn'),
          description: lt('Practical courses.'),
          image: 'theme-asset:modern-education/about-header',
        }}
        academyId="a1"
        pages={PAGES}
      />
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('We help people learn');
    expect(container.querySelector('.t1-hero-editorial')).toBeTruthy();
    expect(screen.getByText('Practical courses.')).toBeTruthy();
    // The unreleased photograph renders the neutral placeholder (§E.6).
    expect(container.querySelector('[data-image-placeholder]')).toBeTruthy();
  });

  it('Courses: the hero search is handed to the catalog on the same page, not a navigation', () => {
    courses = [course('c1'), course('c2')];
    wrap(
      <>
        <T1PageHeader
          config={{ title: lt('Find your next course'), search: 'courses' }}
          academyId="a1"
          pages={PAGES}
          linkRenderer={linkRenderer}
        />
        <T1CourseCatalog
          config={CATALOG}
          academyId="a1"
          pages={PAGES}
          linkRenderer={linkRenderer}
        />
      </>
    );
    const [heroSearch] = screen.getAllByRole('search');
    fireEvent.change(heroSearch.querySelector('input')!, {
      target: { value: 'design' },
    });
    fireEvent.submit(heroSearch);
    expect(screen.getByTestId('location').textContent).toBe('/courses/c1');
    expect(courseQueries.at(-1)).toMatchObject({ search: 'design' });
  });

  it('FAQs: typing in the hero filters the questions below, with a no-match state', () => {
    const { container } = wrap(
      <>
        <T1PageHeader
          config={{ title: lt('Frequently asked questions'), search: 'faq' }}
          academyId="a1"
          pages={PAGES}
        />
        <T1Faq
          config={{
            items: [
              {
                id: 'f1',
                question: lt('Can I learn on my phone?'),
                answer: lt('Yes.'),
              },
              {
                id: 'f2',
                question: lt('How do I pay?'),
                answer: lt('By card.'),
              },
            ],
          }}
          academyId="a1"
          pages={PAGES}
        />
      </>
    );
    // Untitled under the hero: a hidden h2 keeps h1 → h2 → question h3s.
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'All questions'
    );
    const input = screen.getByLabelText('Search the questions');
    fireEvent.change(input, { target: { value: 'PHONE' } });
    expect(screen.queryByText('How do I pay?')).toBeNull();
    expect(screen.getByText('Can I learn on my phone?')).toBeTruthy();
    fireEvent.change(input, { target: { value: 'refund' } });
    expect(container.querySelector('[data-faq-no-match]')).toBeTruthy();
  });

  it('the FAQ filter ignores case and Arabic diacritics and letter variants', () => {
    expect(matchesFaqFilter('Can I learn on my PHONE?', 'phone')).toBe(true);
    expect(matchesFaqFilter('هل يمكنني التعلّم؟', 'التعلم')).toBe(true);
    expect(matchesFaqFilter('أين المدرسة', 'اين')).toBe(true);
    expect(matchesFaqFilter('anything', '')).toBe(true);
    expect(matchesFaqFilter('How do I pay?', 'refund')).toBe(false);
  });
});

describe('T1PageIntro (existing pages without a page hero)', () => {
  it('titles the hero from the navigation label, with a neutral lead for a core page', () => {
    const navigation = [
      { id: 'n1', pageId: 'p-about', label: lt('Our story', 'قصتنا') },
    ] as unknown as WebsiteNavigationItem[];
    wrap(<T1PageIntro page={PAGES[1]} navigation={navigation} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Our story'
    );
    expect(
      screen.getByText('The people, purpose and approach behind our courses.')
    ).toBeTruthy();
    // Not a second region: its name can repeat the page's first section.
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('falls back to the page title, and adds no lead for a custom page', () => {
    const custom = {
      id: 'p-x',
      slug: 'team',
      title: 'Team',
      sections: [],
    } as unknown as WebsitePage;
    const { container } = wrap(<T1PageIntro page={custom} navigation={[]} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Team');
    expect(container.querySelector('.t1-lead')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Catalog                                                              */
/* ------------------------------------------------------------------ */

const CATALOG: SectionConfigMap['courseCatalog'] = {
  title: lt('All courses'),
  pageSize: 9,
  defaultSort: 'newest',
  showSearch: false,
  showLevelFilter: true,
  showPricingFilter: true,
  showSort: true,
};

describe('T1CourseCatalog', () => {
  it('filters by category and level, keeps the state in the URL, and removes a filter from its chip', async () => {
    courses = [course('c1'), course('c2')];
    wrap(
      <T1CourseCatalog
        config={CATALOG}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(screen.getByText('Course c1')).toBeTruthy();
    const design = screen.getByRole('button', { name: /Design/ });
    expect(design.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(design);
    expect(design.getAttribute('aria-pressed')).toBe('true');
    expect(courseQueries.at(-1)).toMatchObject({
      filters: { categoryId: 'cat-1' },
    });
    const [level] = screen.getAllByLabelText('Level');
    fireEvent.change(level, { target: { value: 'beginner' } });
    expect(courseQueries.at(-1)).toMatchObject({
      filters: { categoryId: 'cat-1', level: 'beginner' },
    });
    await waitFor(() => {
      expect(window.location.search).toContain('cat-1');
      expect(window.location.search).toContain('beginner');
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove the filter Design' })
    );
    expect(courseQueries.at(-1)).toMatchObject({
      filters: { categoryId: undefined, level: 'beginner' },
    });
  });

  it('reads its initial state from a shared link', () => {
    window.history.replaceState(null, '', '/courses?level=advanced');
    courses = [course('c1')];
    wrap(
      <T1CourseCatalog
        config={CATALOG}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(courseQueries[0]).toMatchObject({
      filters: { level: 'advanced' },
    });
  });

  it('an Academy with no courses yet: no filters to use, just the launching-soon panel', () => {
    const { container } = wrap(
      <T1CourseCatalog config={CATALOG} academyId="a1" pages={PAGES} />
    );
    expect(container.querySelector('[data-t1-catalog-toolbar]')).toBeNull();
    expect(screen.getByText('Courses launching soon')).toBeTruthy();
    expect(screen.queryByText('0 courses')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Course Details                                                       */
/* ------------------------------------------------------------------ */

describe('useCourseDetails — the primary action', () => {
  const run = () => {
    const result = renderHook(
      () => ({
        details: useCourseDetails('a1', 'c1'),
        location: useLocation(),
      }),
      { wrapper: ({ children }) => <Providers>{children}</Providers> }
    );
    return result.result;
  };

  it('signed out → sign in, returning to this course', () => {
    publicCourse = course('c1');
    const result = run();
    expect(result.current.details.action.kind).toBe('signIn');
    act(() => result.current.details.action.onSelect());
    expect(result.current.location.pathname).toBe('/sign-in');
    expect(result.current.location.search).toBe(
      `?returnTo=${encodeURIComponent('/courses/c1')}`
    );
  });

  // Task E: "Continue" used to be shown for ANY enrolment, including one
  // with nothing started. The backend's learning state now decides.
  it.each([
    ['not started', { learningState: 'not_started' }, 'start', 'Start course'],
    [
      'started',
      { learningState: 'in_progress' },
      'continue',
      'Continue Learning',
    ],
    [
      'completed',
      { learningState: 'completed' },
      'completed',
      'Course completed · Review',
    ],
    // An older response without the field: nothing finished → Start.
    [
      'older response',
      { completionState: 'incomplete' },
      'start',
      'Start course',
    ],
  ])(
    'enrolled, %s → %s, to the course progress',
    (_label, progress, kind, label) => {
      publicCourse = course('c1');
      authenticated = true;
      enrollment = { status: 'enrolled', progress };
      const result = run();
      expect(result.current.details.action.kind).toBe(kind);
      expect(i18nEn.t(result.current.details.action.labelKey)).toBe(label);
      act(() => result.current.details.action.onSelect());
      expect(result.current.location.pathname).toBe(
        buildPath(LEARNER_ROUTES.courseProgress, { courseId: 'c1' })
      );
    }
  );

  it('signed in, free → the real free enrolment', async () => {
    publicCourse = course('c1', {
      pricing: { type: 'free' },
    } as Partial<Course>);
    authenticated = true;
    enroll.mockResolvedValue(undefined);
    const result = run();
    expect(result.current.details.action.kind).toBe('enroll');
    await act(async () => result.current.details.action.onSelect());
    expect(enroll).toHaveBeenCalledWith({ courseId: 'c1' });
  });

  it('signed in, paid → the checkout', () => {
    publicCourse = course('c1');
    authenticated = true;
    enrollment = { status: 'available' };
    const result = run();
    expect(result.current.details.action.kind).toBe('buy');
    act(() => result.current.details.action.onSelect());
    expect(result.current.location.pathname).toBe(
      buildPath(LEARNER_ROUTES.courseCheckout, { courseId: 'c1' })
    );
  });
});

/* ------------------------------------------------------------------ */
/* Contact                                                              */
/* ------------------------------------------------------------------ */

const CONTACT: SectionConfigMap['contact'] = {
  title: lt('Get in touch'),
  showForm: true,
};

function fillContactForm() {
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Omar' },
  });
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'omar@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Message'), {
    target: { value: 'Hello there' },
  });
  fireEvent.submit(screen.getByLabelText('Message').closest('form')!);
}

describe('T1Contact', () => {
  it('shows the Academy’s real contact methods and confirms a sent message', async () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined as never);
    const { container } = wrap(
      <T1Contact config={CONTACT} academyId="a1" pages={PAGES} />
    );
    expect(screen.getByText('hello@academy.example')).toBeTruthy();
    fillContactForm();
    await waitFor(() =>
      expect(container.querySelector('[data-contact-success]')).toBeTruthy()
    );
    expect(submit).toHaveBeenCalledWith('a1', {
      name: 'Omar',
      email: 'omar@example.com',
      message: 'Hello there',
    });
  });

  it('keeps the message and says so when sending fails', async () => {
    vi.spyOn(publicWebsiteService, 'submitContactMessage').mockRejectedValue(
      new Error('network')
    );
    wrap(<T1Contact config={CONTACT} academyId="a1" pages={PAGES} />);
    fillContactForm();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(
      (screen.getByLabelText('Message') as HTMLTextAreaElement).value
    ).toBe('Hello there');
  });
});

/* ------------------------------------------------------------------ */
/* Gallery                                                              */
/* ------------------------------------------------------------------ */

const GALLERY: SectionConfigMap['gallery'] = {
  title: lt('Life at the Academy'),
  images: [1, 2, 3].map((n) => ({
    id: `g${n}`,
    image: `https://cdn.example/g${n}.jpg`,
    imageAlt: lt(`Photo ${n}`),
  })),
};

describe('T1Gallery', () => {
  it('opens the lightbox and moves with the arrow keys (LTR)', () => {
    wrap(<T1Gallery config={GALLERY} academyId="a1" pages={PAGES} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Open image: Photo 1' })
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('img')?.getAttribute('alt')).toBe('Photo 1');
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(dialog.querySelector('img')?.getAttribute('alt')).toBe('Photo 2');
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
    // Wraps around from the first to the last.
    expect(dialog.querySelector('img')?.getAttribute('alt')).toBe('Photo 3');
  });

  it('mirrors the arrow keys in Arabic', () => {
    wrap(<T1Gallery config={GALLERY} academyId="a1" pages={PAGES} />, 'ar');
    fireEvent.click(screen.getAllByRole('button')[0]);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('dir')).toBe('rtl');
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
    expect(dialog.querySelector('img')?.getAttribute('alt')).toBe('Photo 2');
  });

  it('five images form the bento; theme placeholders do not open the lightbox', () => {
    const { container } = wrap(
      <T1Gallery
        config={{
          images: [1, 2, 3, 4, 5].map((n) => ({
            id: `g${n}`,
            image: `theme-asset:modern-education/gallery-${n}`,
          })),
        }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(container.querySelector('ul.t1-bento')?.children).toHaveLength(5);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(container.querySelectorAll('[data-image-placeholder]').length).toBe(
      5
    );
  });
});

/* ------------------------------------------------------------------ */
/* 404 and Coming Soon                                                  */
/* ------------------------------------------------------------------ */

describe('Theme 1 system pages', () => {
  it('404: an h1 and the next useful places', () => {
    wrap(<T1NotFound pages={PAGES} linkRenderer={linkRenderer} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      "We can't find that page"
    );
    expect(
      screen.getByRole('link', { name: /Back to home/ }).getAttribute('href')
    ).toBe('/');
    expect(
      screen.getByRole('link', { name: 'Browse courses' }).getAttribute('href')
    ).toBe('/courses');
    expect(
      screen.getByRole('link', { name: 'Contact us' }).getAttribute('href')
    ).toBe('/contact');
  });

  it('the selectable themes draw their own 404 and Coming Soon; retired Themes 2–5 keep the shared pages', () => {
    for (const key of WEBSITE_THEME_KEYS) {
      const own = (SELECTABLE_WEBSITE_THEME_KEYS as readonly string[]).includes(
        key
      );
      expect(hasThemeNotFound(key)).toBe(own);
      expect(hasThemeComingSoon({ themeKey: key, brand: {} })).toBe(own);
    }
    // No lookup data, or a theme this build does not know: the shared page.
    expect(hasThemeComingSoon(undefined)).toBe(false);
    expect(hasThemeComingSoon({ themeKey: 'retired-theme', brand: {} })).toBe(
      false
    );
  });

  it('Coming Soon: the Academy name as h1, in its brand colours, and nothing for other themes', () => {
    const { container } = wrap(
      <WebsiteComingSoon
        presentation={{
          themeKey: 'modern-education',
          brand: { primaryColor: '#7c3aed' },
        }}
        academyName="Horizon Academy"
        locale="en"
      />
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Horizon Academy is getting ready'
    );
    expect(screen.getByTestId('academy-coming-soon')).toBeTruthy();
    const scope = container.querySelector<HTMLElement>('[style*="--website"]');
    expect(scope?.getAttribute('style')).toBeTruthy();
    cleanup();
    const other = wrap(
      <WebsiteComingSoon
        presentation={{ themeKey: 'bold-creative', brand: {} }}
        academyName="Horizon Academy"
        locale="en"
      />
    );
    expect(other.queryByTestId('academy-coming-soon')).toBeNull();
  });
});
