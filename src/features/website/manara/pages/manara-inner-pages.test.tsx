/**
 * Manara inner pages: the banner block (h1/h2 rule, trail, image tile, the
 * course search hand-off, the FAQ filter), the page intro, the catalogue
 * (pill filters, URL state, grid, pagination, empty / launching / error /
 * loading states), the contact tiles and form (channels, validation, spam
 * trap, success / failure), the 404 and Coming Soon posters, in English
 * and Arabic.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { publicWebsiteService } from '@services';
import { WebsiteThemeScope } from '@/features/website/renderer/WebsiteThemeScope';
import { PublicWebsiteLocaleProvider } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { PageHeadingProvider } from '@/features/website/renderer/PageHeadingContext';
import { getWebsiteTheme } from '@/features/website/themes/website-theme.registry';
import { useFaqFilter } from '@/features/website/modern-education/t1-faq-filter';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import type {
  Course,
  PublicWebsiteLocale,
  SectionConfigMap,
  WebsiteNavigationItem,
  WebsitePage,
} from '@types';
import {
  MANARA_PAGES,
  MANARA_PAGE_RENDERERS,
  ManaraComingSoon,
  ManaraContact,
  ManaraCourseCatalog,
  ManaraCourseDetails,
  ManaraNotFound,
  ManaraPageHeader,
  ManaraPageIntro,
} from '.';

/* ------------------------------------------------------------------ */
/* Live data (controllable per test)                                    */
/* ------------------------------------------------------------------ */

let courses: Course[] = [];
let coursesLoading = false;
let coursesError: Error | null = null;
let totalItems: number | undefined;
const refetchCourses = vi.fn();
const courseQueries: { pagination?: { page: number } }[] = [];

vi.mock('@/shared/hooks/usePublicCourses', () => ({
  usePublicCourses: (
    _academyId: string,
    options?: { query?: { pagination?: { page: number } } }
  ) => {
    courseQueries.push(options?.query ?? {});
    const total = totalItems ?? courses.length;
    return {
      data:
        coursesLoading || coursesError
          ? undefined
          : {
              items: courses,
              pagination: {
                page: options?.query?.pagination?.page ?? 1,
                pageSize: 9,
                totalItems: total,
                totalPages: Math.max(1, Math.ceil(total / 9)),
              },
            },
      isLoading: coursesLoading,
      error: coursesError,
      refetch: refetchCourses,
    };
  },
}));
vi.mock('@/shared/hooks/usePublicCourseCategories', () => ({
  usePublicCourseCategories: () => ({
    data: [
      { id: 'cat-1', name: 'Physics', slug: 'physics', courseCount: 2 },
      { id: 'cat-2', name: 'Chemistry', slug: 'chemistry', courseCount: 1 },
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
    data: { contactEmail: 'hello@academy.example', contactPhone: '+20 2 555' },
  }),
}));

/* ------------------------------------------------------------------ */
/* Harness                                                              */
/* ------------------------------------------------------------------ */

const lt = (en: string, ar = '') => ({ en, ar });

const linkRenderer: WebsiteLinkRenderer = ({
  href,
  className,
  ariaCurrent,
  children,
}) => (
  <a href={href} className={className} aria-current={ariaCurrent}>
    {children}
  </a>
);

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">{`${location.pathname}${location.search}`}</output>
  );
}

function wrap(children: ReactNode, locale: PublicWebsiteLocale = 'en') {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <MemoryRouter initialEntries={['/courses']}>
          <WebsiteThemeScope theme={getWebsiteTheme('manara')}>
            <PublicWebsiteLocaleProvider locale={locale}>
              {children}
              <LocationProbe />
            </PublicWebsiteLocaleProvider>
          </WebsiteThemeScope>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const ABOUT_HEADER: SectionConfigMap['pageHeader'] = {
  eyebrow: lt('Our story', 'قصتنا'),
  title: lt('Teachers who get results', 'معلّمون يصنعون النتائج'),
  description: lt(
    'Small groups, weekly exams, real scores.',
    'مجموعات صغيرة وامتحانات أسبوعية ودرجات حقيقية.'
  ),
  image: 'theme-asset:manara/about-header',
};

const page = (
  id: string,
  coreType: string,
  sections: unknown[] = []
): WebsitePage =>
  ({
    id,
    coreType,
    slug: coreType,
    title: coreType[0].toUpperCase() + coreType.slice(1),
    sections,
  }) as unknown as WebsitePage;

const PAGES = [
  page('p-home', 'home'),
  page('p-about', 'about', [
    { id: 's1', type: 'pageHeader', enabled: true, config: ABOUT_HEADER },
  ]),
  page('p-courses', 'courses'),
  page('p-contact', 'contact'),
];

function course(id: string, fields: Partial<Course> = {}): Course {
  return {
    id,
    title: `Course ${id}`,
    shortDescription: 'A short summary.',
    pricing: { type: 'paid', amount: 99, currency: 'USD' },
    instructors: [{ id: 'i1', name: 'Layla Haddad' }],
    ...fields,
  } as unknown as Course;
}

beforeEach(() => {
  courses = [];
  coursesLoading = false;
  coursesError = null;
  totalItems = undefined;
  courseQueries.length = 0;
  window.history.replaceState(null, '', '/courses');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  refetchCourses.mockReset();
});

describe('exports', () => {
  it('supplies the four pages and the three inner-page renderers', () => {
    expect(MANARA_PAGES).toEqual({
      PageIntro: ManaraPageIntro,
      CourseDetails: ManaraCourseDetails,
      NotFound: ManaraNotFound,
      ComingSoon: ManaraComingSoon,
    });
    expect(MANARA_PAGE_RENDERERS).toEqual({
      pageHeader: ManaraPageHeader,
      courseCatalog: ManaraCourseCatalog,
      contact: ManaraContact,
    });
  });
});

/* ------------------------------------------------------------------ */
/* Banner block                                                         */
/* ------------------------------------------------------------------ */

describe('ManaraPageHeader', () => {
  it('opens the page: a seamed brand block with its h1, a trail back Home, the lead and the slanted image tile', () => {
    const { container } = wrap(
      <ManaraPageHeader
        config={ABOUT_HEADER}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Teachers who get results'
    );
    expect(screen.getByRole('heading', { level: 1 }).className).toContain(
      'mn-display'
    );
    const region = screen.getByRole('region', {
      name: 'Teachers who get results',
    });
    expect(region.getAttribute('data-env')).toBe('block');
    expect(region.hasAttribute('data-seam-bottom')).toBe(true);
    expect(region.querySelector('.mn-beam[data-position="end"]')).toBeTruthy();
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(
      within(trail).getByRole('link', { name: 'Home' }).getAttribute('href')
    ).toBe('/');
    expect(
      within(trail).getByText('Our story').getAttribute('aria-current')
    ).toBe('page');
    expect(
      screen.getByText('Small groups, weekly exams, real scores.')
    ).toBeTruthy();
    const tile = container.querySelector(
      '.mnp-banner-image .mn-frame[data-shape="slant"]'
    )!;
    expect(tile).toBeTruthy();
    expect(tile.className).toContain('aspect-[4/3]');
    expect(tile.className).toContain('lg:aspect-[21/9]');
  });

  it('is an h2 when another section owns the page h1 (same look)', () => {
    wrap(
      <PageHeadingProvider value="h2">
        <ManaraPageHeader config={ABOUT_HEADER} academyId="a1" pages={PAGES} />
      </PageHeadingProvider>
    );
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('heading', { level: 2 }).className).toContain(
      'mn-display'
    );
  });

  it('without its page (a single-section preview) the eyebrow stands alone', () => {
    wrap(
      <ManaraPageHeader
        config={{ ...ABOUT_HEADER }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByText('Our story')).toBeTruthy();
  });

  it('Courses: the search is handed to the catalogue on the same page, with the live summary', () => {
    courses = [course('c1'), course('c2')];
    wrap(
      <>
        <ManaraPageHeader
          config={{ title: lt('Pick your course'), search: 'courses' }}
          academyId="a1"
          pages={PAGES}
          linkRenderer={linkRenderer}
        />
        <ManaraCourseCatalog
          config={CATALOG}
          academyId="a1"
          pages={PAGES}
          linkRenderer={linkRenderer}
        />
      </>
    );
    expect(screen.getByText('3 courses across 2 tracks')).toBeTruthy();
    const [search] = screen.getAllByRole('search');
    expect(search.className).toContain('mnp-banner-search');
    fireEvent.change(within(search).getByLabelText('Search courses'), {
      target: { value: 'physics' },
    });
    fireEvent.submit(search);
    expect(screen.getByTestId('location').textContent).toBe('/courses');
    expect(courseQueries.at(-1)).toMatchObject({ search: 'physics' });
  });

  it('Courses with no catalogue on the page: the search opens the catalogue', () => {
    wrap(
      <ManaraPageHeader
        config={{ title: lt('Find a course'), search: 'courses' }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const search = screen.getByRole('search');
    fireEvent.change(within(search).getByRole('searchbox'), {
      target: { value: 'maths' },
    });
    fireEvent.submit(search);
    expect(screen.getByTestId('location').textContent).toBe('/courses?q=maths');
  });

  it('FAQs: the filter feeds the shared question filter and clears it on leaving', () => {
    let filter = '';
    function Probe() {
      filter = useFaqFilter();
      return null;
    }
    const view = wrap(
      <>
        <ManaraPageHeader
          config={{ title: lt('Questions'), search: 'faq' }}
          academyId="a1"
          pages={PAGES}
        />
        <Probe />
      </>
    );
    fireEvent.change(screen.getByLabelText('Search the questions'), {
      target: { value: 'refund' },
    });
    expect(filter).toBe('refund');
    view.rerender(<></>);
    cleanup();
    wrap(<Probe />);
    expect(filter).toBe('');
  });

  it('Arabic: right to left, with the Arabic trail', () => {
    const { container } = wrap(
      <ManaraPageHeader
        config={ABOUT_HEADER}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'معلّمون يصنعون النتائج'
    );
    expect(
      screen.getByRole('navigation', { name: 'مسار التنقل' })
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toBeTruthy();
    expect(
      container.querySelector('[dir="rtl"] [data-manara-banner]')
    ).toBeTruthy();
  });
});

describe('ManaraPageIntro (existing pages without a page header)', () => {
  it('titles the banner from the navigation label, with a neutral lead; not a region', () => {
    const navigation = [
      { id: 'n1', pageId: 'p-about', label: lt('Our story', 'قصتنا') },
    ] as unknown as WebsiteNavigationItem[];
    wrap(<ManaraPageIntro page={PAGES[1]} navigation={navigation} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Our story'
    );
    expect(
      screen.getByText(
        'Who teaches here, how we teach, and the results behind it.'
      )
    ).toBeTruthy();
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('falls back to the page title, with no lead for a custom page', () => {
    const custom = {
      id: 'p-x',
      slug: 'team',
      title: 'Team',
      sections: [],
    } as unknown as WebsitePage;
    const { container } = wrap(
      <ManaraPageIntro page={custom} navigation={[]} />
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Team');
    expect(container.querySelector('.mn-lead')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Catalogue                                                            */
/* ------------------------------------------------------------------ */

const CATALOG: SectionConfigMap['courseCatalog'] = {
  title: lt('All courses'),
  pageSize: 9,
  defaultSort: 'newest',
  showSearch: true,
  showLevelFilter: true,
  showPricingFilter: true,
  showSort: true,
};

describe('ManaraCourseCatalog', () => {
  it('a grid of poster cards linking to each course, with the level pill and the price', () => {
    courses = [
      course('c1', { level: 'beginner' } as Partial<Course>),
      course('c2'),
    ];
    const { container } = wrap(
      <ManaraCourseCatalog
        config={CATALOG}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const cards = container.querySelectorAll('[data-manara-catalog-grid] > li');
    expect(cards).toHaveLength(2);
    const first = cards[0].querySelector('a')!;
    expect(first.getAttribute('href')).toBe('/courses/c1');
    expect(first.className).toContain('mn-card');
    expect(first.querySelector('.mn-frame[data-shape="slant"]')).toBeTruthy();
    expect(first.querySelector('.mnp-card-level')?.textContent).toBe(
      'Beginner'
    );
    expect(within(first).getByRole('heading', { level: 3 }).textContent).toBe(
      'Course c1'
    );
    expect(first.textContent).toContain('with Layla Haddad');
    expect(first.textContent).toMatch(/99/);
    expect(cards[1].querySelector('.mnp-card-level')).toBeNull();
    expect(container.querySelector('p[role="status"]')?.textContent).toBe(
      '2 courses'
    );
  });

  it('previews: cards are articles, nothing navigates', () => {
    courses = [course('c1')];
    const { container } = wrap(
      <ManaraCourseCatalog config={CATALOG} academyId="a1" pages={PAGES} />
    );
    expect(container.querySelector('article.mnp-course-card')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('the sticky pill bar filters by track, level and search, keeps the state in the URL, and removes a filter', async () => {
    courses = [course('c1'), course('c2')];
    const { container } = wrap(
      <ManaraCourseCatalog
        config={CATALOG}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const bar = container.querySelector('[data-manara-catalog-toolbar]')!;
    expect(bar.className).toContain('mnp-filterbar');
    const all = screen.getByRole('button', { name: 'All tracks' });
    expect(all.getAttribute('aria-pressed')).toBe('true');
    const physics = screen.getByRole('button', { name: /Physics/ });
    expect(physics.className).toContain('mnp-filter-pill');
    expect(physics.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(physics);
    expect(physics.getAttribute('aria-pressed')).toBe('true');
    expect(all.getAttribute('aria-pressed')).toBe('false');
    fireEvent.change(screen.getByLabelText('Level'), {
      target: { value: 'beginner' },
    });
    fireEvent.change(screen.getByLabelText('Search courses'), {
      target: { value: 'optics' },
    });
    expect(courseQueries.at(-1)).toMatchObject({
      search: 'optics',
      filters: { categoryId: 'cat-1', level: 'beginner' },
    });
    await waitFor(() => {
      expect(window.location.search).toContain('cat-1');
      expect(window.location.search).toContain('beginner');
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove the filter Physics' })
    );
    expect(courseQueries.at(-1)).toMatchObject({
      filters: { categoryId: undefined, level: 'beginner' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(courseQueries.at(-1)).toMatchObject({
      search: undefined,
      filters: { categoryId: undefined, level: undefined },
    });
  });

  it('reads its initial state from a shared link', () => {
    window.history.replaceState(null, '', '/courses?level=advanced');
    courses = [course('c1')];
    wrap(
      <ManaraCourseCatalog
        config={CATALOG}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(courseQueries[0]).toMatchObject({ filters: { level: 'advanced' } });
  });

  it('numbered pagination: the current page is marked, another page is requested', async () => {
    const user = userEvent.setup({ delay: null });
    courses = Array.from({ length: 9 }, (_, index) => course(`c${index + 1}`));
    totalItems = 20;
    wrap(
      <ManaraCourseCatalog
        config={CATALOG}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const nav = await screen.findByRole('navigation', { name: 'Course pages' });
    const first = within(nav).getByRole('button', { name: 'Page 1' });
    expect(first.getAttribute('aria-current')).toBe('page');
    expect(first.className).toContain('mn-btn-quiet');
    expect(
      within(nav)
        .getByRole('button', { name: 'Previous page' })
        .hasAttribute('disabled')
    ).toBe(true);
    await user.click(within(nav).getByRole('button', { name: 'Page 2' }));
    expect(courseQueries.at(-1)).toMatchObject({ pagination: { page: 2 } });
    expect(
      within(nav)
        .getByRole('button', { name: 'Page 2' })
        .getAttribute('aria-current')
    ).toBe('page');
  });

  it('no courses yet: no filters, just "launching soon" on a night tile', () => {
    const { container } = wrap(
      <ManaraCourseCatalog config={CATALOG} academyId="a1" pages={PAGES} />
    );
    expect(container.querySelector('[data-manara-catalog-toolbar]')).toBeNull();
    const empty = container.querySelector('[data-catalog-empty]')!;
    expect(empty.textContent).toContain('Launching soon');
    expect(empty.className).toContain('mn-tile');
    expect(empty.getAttribute('data-tone')).toBe('night');
    expect(container.querySelector('p[role="status"]')?.textContent).toBe('');
  });

  it('nothing matches the filters: says so and offers to clear them', async () => {
    const user = userEvent.setup({ delay: null });
    window.history.replaceState(null, '', '/courses?level=advanced');
    const { container } = wrap(
      <ManaraCourseCatalog
        config={CATALOG}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const empty = container.querySelector(
      '[data-catalog-empty]'
    ) as HTMLElement;
    expect(empty.textContent).toContain('No courses match your filters');
    await user.click(within(empty).getByRole('button', { name: 'Clear all' }));
    expect(courseQueries.at(-1)).toMatchObject({
      filters: { level: undefined },
    });
  });

  it('a failed load is an error with a retry, never "launching soon"', async () => {
    const user = userEvent.setup({ delay: null });
    coursesError = new Error('network');
    const { container } = wrap(
      <ManaraCourseCatalog config={CATALOG} academyId="a1" pages={PAGES} />
    );
    expect(container.querySelector('[data-catalog-error]')).toBeTruthy();
    expect(screen.queryByText('Launching soon')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetchCourses).toHaveBeenCalled();
  });

  it('loading: card-shaped skeletons, marked busy', () => {
    coursesLoading = true;
    const { container } = wrap(
      <ManaraCourseCatalog config={CATALOG} academyId="a1" pages={PAGES} />
    );
    const busy = container.querySelector('[aria-busy="true"]')!;
    expect(busy.getAttribute('aria-label')).toBe('Loading courses');
    expect(busy.querySelectorAll('.mnp-card-skeleton').length).toBeGreaterThan(
      0
    );
  });

  it('Arabic: right to left, Arabic-Indic counts and labels', () => {
    courses = [course('c1')];
    const { container } = wrap(
      <ManaraCourseCatalog
        config={CATALOG}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    expect(
      container.querySelector('[dir="rtl"] [data-manara-catalog-grid]')
    ).toBeTruthy();
    expect(container.querySelector('[dir="rtl"] .mnp-count')?.textContent).toBe(
      '٢'
    );
    expect(screen.getByRole('group', { name: 'تصفية الدورات' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'كل المسارات' })).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* Contact                                                              */
/* ------------------------------------------------------------------ */

const CONTACT: SectionConfigMap['contact'] = {
  title: lt('Talk to the team'),
  showForm: true,
};

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Sara');
  await user.type(screen.getByLabelText('Email'), 'sara@example.com');
  await user.type(screen.getByLabelText('Message'), 'Hello there');
}

describe('ManaraContact', () => {
  it('lists the academy channels as dyed tiles, each actionable', () => {
    const { container } = wrap(
      <ManaraContact config={CONTACT} academyId="a1" pages={PAGES} />
    );
    const channels = container.querySelector(
      '[data-manara-channels]'
    ) as HTMLElement;
    const tiles = channels.querySelectorAll('.mn-tile');
    expect(tiles).toHaveLength(2);
    expect(tiles[0].getAttribute('data-tone')).toBe('block');
    expect(tiles[1].getAttribute('data-tone')).toBe('accent');
    expect(
      within(channels).getByText('hello@academy.example').getAttribute('href')
    ).toBe('mailto:hello@academy.example');
    expect(within(channels).getByText('+20 2 555').getAttribute('href')).toBe(
      'tel:+202555'
    );
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Talk to the team'
    );
  });

  it('validates like Theme 1: required, bounded fields; blank input sends nothing', () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    wrap(<ManaraContact config={CONTACT} academyId="a1" pages={PAGES} />);
    const name = screen.getByLabelText('Name');
    expect(name.hasAttribute('required')).toBe(true);
    expect(name.getAttribute('maxlength')).toBe('200');
    expect(name.className).toContain('mn-input');
    expect(screen.getByLabelText('Email').getAttribute('type')).toBe('email');
    expect(screen.getByLabelText('Email').getAttribute('maxlength')).toBe(
      '320'
    );
    expect(screen.getByLabelText('Message').getAttribute('maxlength')).toBe(
      '5000'
    );
    fireEvent.change(name, { target: { value: '   ' } });
    fireEvent.submit(name.closest('form')!);
    expect(submit).not.toHaveBeenCalled();
  });

  it('a person never meets the spam trap; a sent message is confirmed', async () => {
    const user = userEvent.setup({ delay: null });
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    const { container } = wrap(
      <ManaraContact config={CONTACT} academyId="a1" pages={PAGES} />
    );
    const trap = container.querySelector<HTMLInputElement>(
      'input[name="company"]'
    )!;
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden]')).toBeTruthy();
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(submit).toHaveBeenCalledWith('a1', {
      name: 'Sara',
      email: 'sara@example.com',
      message: 'Hello there',
    });
    await waitFor(() =>
      expect(container.querySelector('[data-contact-success]')).toBeTruthy()
    );
    expect(
      container.querySelector('[data-contact-success]')?.getAttribute('role')
    ).toBe('status');
    expect(screen.getByText('Your message is in')).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Send another message' })
    );
    expect(screen.getByLabelText('Message')).toBeTruthy();
  });

  it('a bot that fills the trap sends it (the backend then discards it)', async () => {
    const user = userEvent.setup({ delay: null });
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    const { container } = wrap(
      <ManaraContact config={CONTACT} academyId="a1" pages={PAGES} />
    );
    await fill(user);
    fireEvent.change(container.querySelector('input[name="company"]')!, {
      target: { value: 'Acme' },
    });
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(submit.mock.calls[0][1]).toMatchObject({ company: 'Acme' });
  });

  it('a failed send says so and keeps the message', async () => {
    const user = userEvent.setup({ delay: null });
    vi.spyOn(publicWebsiteService, 'submitContactMessage').mockRejectedValue(
      new Error('network')
    );
    wrap(<ManaraContact config={CONTACT} academyId="a1" pages={PAGES} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(
      (screen.getByLabelText('Message') as HTMLTextAreaElement).value
    ).toBe('Hello there');
  });

  it('without the form: the channels alone', () => {
    wrap(
      <ManaraContact
        config={{ ...CONTACT, showForm: false }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('hello@academy.example')).toBeTruthy();
  });

  it('Arabic: right to left, Arabic labels', () => {
    const { container } = wrap(
      <ManaraContact config={CONTACT} academyId="a1" pages={PAGES} />,
      'ar'
    );
    expect(
      container.querySelector('[dir="rtl"] [data-manara-channels]')
    ).toBeTruthy();
    expect(screen.getByText('طرق التواصل')).toBeTruthy();
    expect(screen.getByText('أرسل لنا رسالة')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* 404 and Coming Soon                                                  */
/* ------------------------------------------------------------------ */

describe('Manara system pages', () => {
  it('404: a night poster with the giant figure, an h1 and the next useful places', () => {
    const { container } = wrap(
      <ManaraNotFound pages={PAGES} linkRenderer={linkRenderer} />
    );
    const poster = container.querySelector('[data-manara-poster="not-found"]')!;
    const block = poster.closest('.mn-block')!;
    expect(block.getAttribute('data-env')).toBe('night');
    expect(block.querySelector('.mn-beam')).toBeTruthy();
    expect(
      poster.querySelector('.mnp-poster-figure .mn-numeral')?.textContent
    ).toBe('404');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      "This page isn't on the timetable"
    );
    expect(
      screen.getByRole('link', { name: /Back to home/ }).getAttribute('href')
    ).toBe('/');
    expect(
      screen.getByRole('link', { name: 'See the courses' }).getAttribute('href')
    ).toBe('/courses');
    expect(
      screen.getByRole('link', { name: 'Contact us' }).getAttribute('href')
    ).toBe('/contact');
  });

  it('404: no catalogue or contact page → no links to them; previews are inert', () => {
    wrap(<ManaraNotFound pages={[page('p-home', 'home')]} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: /Back to home/ })).toBeTruthy();
    expect(screen.queryByText('See the courses')).toBeNull();
  });

  it('404 in Arabic: right to left, Arabic-Indic figure', () => {
    const { container } = wrap(
      <ManaraNotFound pages={PAGES} linkRenderer={linkRenderer} />,
      'ar'
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'هذه الصفحة ليست في الجدول'
    );
    expect(
      container.querySelector('[dir="rtl"] .mnp-poster-figure')?.textContent
    ).toBe('٤٠٤');
  });

  it('Coming Soon: a night poster that names the Academy giant and in its h1, with logo or wordmark', () => {
    const { container } = wrap(
      <ManaraComingSoon academyName="Horizon Academy" />
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Horizon Academy opens soon'
    );
    expect(screen.getByTestId('academy-coming-soon').tagName).toBe('MAIN');
    expect(container.querySelector('.mnp-poster-name')?.textContent).toBe(
      'Horizon Academy'
    );
    expect(
      container.querySelector('.mn-block[data-env="night"] .mn-beam')
    ).toBeTruthy();
    expect(screen.getByText('Powered by Atlas')).toBeTruthy();
    cleanup();
    wrap(
      <ManaraComingSoon
        academyName="Horizon Academy"
        academyLogo="https://cdn.example/logo.png"
      />
    );
    expect(screen.getByRole('img', { name: 'Horizon Academy' })).toBeTruthy();
  });

  it('Coming Soon in Arabic', () => {
    wrap(<ManaraComingSoon academyName="أكاديمية الأفق" />, 'ar');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'أكاديمية الأفق تفتح أبوابها قريبًا'
    );
  });
});
