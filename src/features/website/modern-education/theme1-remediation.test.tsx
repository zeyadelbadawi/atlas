/**
 * Theme 1 production-readiness remediation (audit F-2, F-3, F-4, F-5,
 * F-6, F-7, F-10) and the Academy logo → Home link.
 *
 * - The logo (header and footer) is a real link to THIS Academy's Home,
 *   locale-aware, with an accessible name; never a link while Home isn't
 *   a visible page.
 * - On the public site a link whose target page is hidden renders nothing
 *   (header, footer, section actions) — previews keep their inert buttons.
 * - An unknown course renders the theme's "page not found"; a failed load
 *   says so with a retry.
 * - Featured Courses "selected" fetches exactly the picked courses, in the
 *   Owner's order; a failed load is never shown as "launching soon".
 * - A page has exactly one `<h1>`.
 * - The public `<main>` is the skip link's target; previews have no id.
 * - Owner-uploaded images load lazily except a hero's.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import { usePublicWebsiteLinkRenderer } from '@/features/public-website/utils/public-website-link-renderer';
import { WebsiteThemeScope } from '../renderer/WebsiteThemeScope';
import { PublicWebsiteLocaleProvider } from '../renderer/PublicWebsiteLocaleContext';
import { WebsiteRenderer } from '../renderer/WebsiteRenderer';
import { PUBLIC_WEBSITE_MAIN_ID } from '../renderer/WebsiteChrome';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';
import type { WebsiteHeaderProps } from '../renderer/WebsiteHeader';
import type {
  Course,
  PublicWebsiteLocale,
  SectionConfigMap,
  SectionInstance,
  WebsiteConfiguration,
  WebsitePage,
} from '@types';
import { ModernEducationHeader } from './ModernEducationHeader';
import { ModernEducationFooter } from './ModernEducationFooter';
import { T1Action, T1Media } from './t1-parts';
import {
  T1CourseCategories,
  T1FeaturedCourses,
  T1Statistics,
} from './t1-live-sections';
import { T1CourseDetails } from './T1CourseDetails';
import { T1Contact } from './t1-page-sections';
import { publicWebsiteService } from '@services';

/* ------------------------------------------------------------------ */
/* Live data (controllable per test)                                    */
/* ------------------------------------------------------------------ */

interface QueryState<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: ReturnType<typeof vi.fn>;
}
const state = <T,>(data: T | undefined, fails = false): QueryState<T> => ({
  data,
  isLoading: false,
  isError: fails,
  error: fails ? new Error('network') : null,
  refetch: vi.fn(),
});

let coursesState: QueryState<{ items: Course[] }>;
let categoriesState: QueryState<unknown[]>;
let statisticsState: QueryState<Record<string, number>>;
let courseState: QueryState<Course | null>;
const courseQueries: unknown[] = [];

vi.mock('@/shared/hooks/usePublicCourses', () => ({
  usePublicCourses: (_academyId: string, options?: { query?: unknown }) => {
    courseQueries.push(options?.query);
    return coursesState;
  },
}));
vi.mock('@/shared/hooks/usePublicCourseCategories', () => ({
  usePublicCourseCategories: () => categoriesState,
}));
vi.mock('@/shared/hooks/usePublicWebsiteStatistics', () => ({
  usePublicWebsiteStatistics: () => statisticsState,
}));
vi.mock('@/shared/hooks/useAcademyIdentity', () => ({
  useAcademyIdentity: () => ({ data: {} }),
}));
vi.mock('@/shared/hooks/usePublicCourse', () => ({
  usePublicCourse: () => courseState,
  usePublicCourseCurriculum: () => ({ data: undefined, isLoading: false }),
}));
vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ session: { status: 'anonymous' } }),
}));
vi.mock('@features/learning', () => ({
  useEnrollment: () => ({ data: undefined }),
  useEnroll: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

/* ------------------------------------------------------------------ */
/* Harness                                                              */
/* ------------------------------------------------------------------ */

const lt = (en: string, ar = '') => ({ en, ar });

const testLinkRenderer: WebsiteLinkRenderer = ({
  href,
  className,
  ariaCurrent,
  ariaLabel,
  children,
}) => (
  <a
    href={href}
    className={className}
    aria-current={ariaCurrent}
    aria-label={ariaLabel}
  >
    {children}
  </a>
);

const page = (
  id: string,
  coreType: string,
  sections: SectionInstance[] = []
): WebsitePage =>
  ({
    id,
    coreType,
    slug: coreType,
    title: coreType[0].toUpperCase() + coreType.slice(1),
    sections,
  }) as unknown as WebsitePage;

const HOME = page('p-home', 'home');
const COURSES = page('p-courses', 'courses');
const CONTACT = page('p-contact', 'contact');
/** The public API returns visible pages only: FAQs is hidden here. */
const VISIBLE_PAGES = [HOME, COURSES, CONTACT];
const HIDDEN_FAQS_ID = 'p-faqs';

function Providers({
  children,
  locale = 'en',
  path = '/',
}: {
  readonly children: ReactNode;
  readonly locale?: PublicWebsiteLocale;
  readonly path?: string;
}) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={createI18nInstance(locale)}>
        <MemoryRouter initialEntries={[path]}>
          <WebsiteThemeScope theme={getWebsiteTheme('modern-education')}>
            <PublicWebsiteLocaleProvider locale={locale}>
              {children}
            </PublicWebsiteLocaleProvider>
          </WebsiteThemeScope>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const wrap = (
  children: ReactNode,
  options: { locale?: PublicWebsiteLocale; path?: string } = {}
) => render(<Providers {...options}>{children}</Providers>);

/** The real public-runtime link renderer (locale prefix included). */
function RealLinks({
  locale,
  children,
}: {
  readonly locale: PublicWebsiteLocale;
  readonly children: (linkRenderer: WebsiteLinkRenderer) => ReactNode;
}) {
  return <>{children(usePublicWebsiteLinkRenderer(locale))}</>;
}

const HEADER: WebsiteHeaderProps = {
  academyName: 'Horizon Academy',
  navigation: [
    { id: 'n1', label: lt('Home'), pageId: 'p-home', order: 0 },
    { id: 'n2', label: lt('Courses'), pageId: 'p-courses', order: 1 },
    { id: 'n3', label: lt('FAQs'), pageId: HIDDEN_FAQS_ID, order: 2 },
  ] as WebsiteHeaderProps['navigation'],
  pages: VISIBLE_PAGES,
  header: {},
  activePageId: 'p-courses',
  onNavigate: () => undefined,
};

function course(id: string): Course {
  return {
    id,
    title: `Course ${id}`,
    shortDescription: 'A short summary.',
    pricing: { type: 'paid', price: 99, currency: 'USD' },
    instructors: [{ id: 'i1', name: 'Layla Haddad' }],
  } as unknown as Course;
}

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView ??= () => undefined;
});
beforeEach(() => {
  coursesState = state({ items: [] });
  categoriesState = state([]);
  statisticsState = state({});
  courseState = state<Course | null>(null);
  courseQueries.length = 0;
});
afterEach(cleanup);

/* ------------------------------------------------------------------ */
/* Logo → Home                                                          */
/* ------------------------------------------------------------------ */

describe('Academy logo links to its own Home page', () => {
  it('header (English): a link to "/" named for the Academy, with a focus style', () => {
    wrap(
      <ModernEducationHeader
        {...HEADER}
        logo="https://cdn.example/logo.png"
        linkRenderer={testLinkRenderer}
      />
    );
    const home = screen.getByRole('link', { name: 'Horizon Academy home' });
    expect(home.getAttribute('href')).toBe('/');
    expect(home.className).toContain('t1-focus');
    // The logo image itself is still what's shown, unchanged.
    expect(within(home).getByRole('img').getAttribute('src')).toBe(
      'https://cdn.example/logo.png'
    );
    // Not the current page here (Courses is).
    expect(home.getAttribute('aria-current')).toBeNull();
  });

  it('header (Arabic, real public link renderer): goes to "/ar", the RTL Home', () => {
    wrap(
      <RealLinks locale="ar">
        {(linkRenderer) => (
          <ModernEducationHeader
            {...HEADER}
            locale="ar"
            linkRenderer={linkRenderer}
          />
        )}
      </RealLinks>,
      { locale: 'ar', path: '/ar/courses' }
    );
    const home = screen.getByRole('link', {
      name: 'الصفحة الرئيسية لـ Horizon Academy',
    });
    expect(home.getAttribute('href')).toBe('/ar');
  });

  it('header: marks itself current on Home, and is reachable by keyboard', async () => {
    const user = userEvent.setup({ delay: null });
    wrap(
      <ModernEducationHeader
        {...HEADER}
        activePageId="p-home"
        linkRenderer={testLinkRenderer}
      />
    );
    const home = screen.getByRole('link', { name: 'Horizon Academy home' });
    expect(home.getAttribute('aria-current')).toBe('page');
    await user.tab();
    expect(document.activeElement).toBe(home);
  });

  it('header: one logo link serves every breakpoint (it sits outside the desktop-only nav)', () => {
    wrap(<ModernEducationHeader {...HEADER} linkRenderer={testLinkRenderer} />);
    const homeLinks = screen.getAllByRole('link', {
      name: 'Horizon Academy home',
    });
    expect(homeLinks).toHaveLength(1);
    expect(homeLinks[0].closest('nav')).toBeNull();
  });

  it('header: no Home among the visible pages → the logo is not a link', () => {
    wrap(
      <ModernEducationHeader
        {...HEADER}
        pages={[COURSES, CONTACT]}
        linkRenderer={testLinkRenderer}
      />
    );
    expect(
      screen.queryByRole('link', { name: 'Horizon Academy home' })
    ).toBeNull();
    expect(screen.getByText('Horizon Academy')).toBeTruthy();
  });

  it('header preview (no link renderer): a button that opens Home in the preview', async () => {
    const user = userEvent.setup({ delay: null });
    const onNavigate = vi.fn();
    wrap(<ModernEducationHeader {...HEADER} onNavigate={onNavigate} />);
    await user.click(
      screen.getByRole('button', { name: 'Horizon Academy home' })
    );
    expect(onNavigate).toHaveBeenCalledWith('p-home');
  });

  it('footer: the logo links to Home too (locale-aware)', () => {
    wrap(
      <RealLinks locale="ar">
        {(linkRenderer) => (
          <ModernEducationFooter
            academyId="a1"
            academyName="Horizon Academy"
            footer={{ groups: [], socialLinks: [] } as never}
            pages={VISIBLE_PAGES}
            onNavigate={() => undefined}
            linkRenderer={linkRenderer}
            attribution={null}
          />
        )}
      </RealLinks>,
      { locale: 'ar', path: '/ar' }
    );
    expect(
      screen
        .getByRole('link', { name: 'الصفحة الرئيسية لـ Horizon Academy' })
        .getAttribute('href')
    ).toBe('/ar');
  });
});

/* ------------------------------------------------------------------ */
/* F-2 — links to hidden pages                                          */
/* ------------------------------------------------------------------ */

describe('F-2: a link to a hidden page is left out on the public site', () => {
  it('header: the hidden page has no nav entry; visible ones are links', () => {
    wrap(<ModernEducationHeader {...HEADER} linkRenderer={testLinkRenderer} />);
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
    expect(within(nav).queryByText('FAQs')).toBeNull();
    expect(within(nav).getByRole('link', { name: 'Courses' })).toBeTruthy();
    // No inert control anywhere in the bar.
    expect(within(nav).queryAllByRole('button')).toHaveLength(0);
  });

  it('header: a configured CTA pointing at a hidden page is left out', () => {
    wrap(
      <ModernEducationHeader
        {...HEADER}
        header={{ cta: { label: lt('Read FAQs'), pageId: HIDDEN_FAQS_ID } }}
        linkRenderer={testLinkRenderer}
      />
    );
    expect(screen.queryByText('Read FAQs')).toBeNull();
  });

  it('header preview keeps every item (an inert button)', () => {
    wrap(<ModernEducationHeader {...HEADER} />);
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0];
    expect(within(nav).getByRole('button', { name: 'FAQs' })).toBeTruthy();
  });

  it('footer: links to hidden pages are left out, and a group with none left disappears', () => {
    wrap(
      <ModernEducationFooter
        academyId="a1"
        academyName="Horizon Academy"
        attribution={null}
        footer={
          {
            groups: [
              {
                id: 'g1',
                title: lt('Explore'),
                links: [
                  { id: 'l1', label: lt('Courses'), pageId: 'p-courses' },
                  { id: 'l2', label: lt('FAQs'), pageId: HIDDEN_FAQS_ID },
                ],
              },
              {
                id: 'g2',
                title: lt('Help'),
                links: [
                  { id: 'l3', label: lt('FAQs'), pageId: HIDDEN_FAQS_ID },
                ],
              },
            ],
            socialLinks: [],
          } as never
        }
        pages={VISIBLE_PAGES}
        onNavigate={() => undefined}
        linkRenderer={testLinkRenderer}
      />
    );
    expect(
      screen.getAllByRole('link', { name: 'Courses' }).length
    ).toBeGreaterThan(0);
    expect(screen.queryByText('FAQs')).toBeNull();
    expect(screen.queryByText('Help')).toBeNull();
    expect(screen.getAllByText('Explore').length).toBeGreaterThan(0);
  });

  it('section action: a CTA to a hidden page renders nothing publicly, a button in previews', () => {
    const cta = { label: lt('See all questions'), pageId: HIDDEN_FAQS_ID };
    const { unmount } = wrap(
      <T1Action
        cta={cta}
        pages={VISIBLE_PAGES}
        linkRenderer={testLinkRenderer}
      />
    );
    expect(screen.queryByText('See all questions')).toBeNull();
    unmount();
    wrap(<T1Action cta={cta} pages={VISIBLE_PAGES} />);
    expect(
      screen.getByRole('button', { name: 'See all questions' })
    ).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* F-3 — unknown course                                                 */
/* ------------------------------------------------------------------ */

describe('F-3: Course Details states', () => {
  const details = (
    <T1CourseDetails
      academyId="a1"
      courseId="missing"
      pages={VISIBLE_PAGES}
      linkRenderer={testLinkRenderer}
    />
  );

  it('an unknown, unpublished or private course shows "page not found", not a connection error', () => {
    courseState = state<Course | null>(null);
    wrap(details, { path: '/courses/missing' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      "We can't find that page"
    );
    expect(screen.queryByText(/couldn't load this course/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('a failed request says so plainly and offers a retry', async () => {
    const user = userEvent.setup({ delay: null });
    courseState = state<Course | null>(undefined, true);
    wrap(details, { path: '/courses/c1' });
    expect(screen.getByText("We couldn't load this course")).toBeTruthy();
    expect(screen.queryByText(/check your connection/i)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(courseState.refetch).toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* F-4 / F-5 — Featured Courses                                         */
/* ------------------------------------------------------------------ */

describe('F-4/F-5: Featured Courses', () => {
  const base: SectionConfigMap['featuredCourses'] = {
    title: lt('Featured courses'),
    mode: 'latest',
    layout: 'grid',
    count: 3,
    showPrice: true,
    showInstructor: true,
  };
  const renderFeatured = (config = base) =>
    wrap(
      <T1FeaturedCourses
        config={config}
        academyId="a1"
        pages={VISIBLE_PAGES}
        linkRenderer={testLinkRenderer}
      />
    );
  const shownTitles = () =>
    screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);

  it('"selected": fetches exactly the picked ids and shows them in the Owner\'s order', () => {
    // The API answers in its own order and drops an ineligible id ("c9").
    coursesState = state({ items: [course('c1'), course('c2'), course('c3')] });
    renderFeatured({
      ...base,
      mode: 'selected',
      courseIds: ['c3', 'c9', 'c1', 'c2'],
      count: 2,
    });
    expect(courseQueries[0]).toEqual({
      pagination: { page: 1, pageSize: 4 },
      filters: { ids: 'c3,c9,c1,c2' },
    });
    // In the picked order, the missing one skipped, capped at `count`.
    expect(shownTitles()).toEqual(['Course c3', 'Course c1']);
  });

  it('"selected" with nothing picked yet keeps showing the latest courses (unchanged)', () => {
    coursesState = state({ items: [course('c1'), course('c2')] });
    renderFeatured({ ...base, mode: 'selected', courseIds: [] });
    expect(courseQueries[0]).toEqual({ pagination: { page: 1, pageSize: 3 } });
    expect(shownTitles()).toEqual(['Course c1', 'Course c2']);
  });

  it('"latest" requests the latest `count` courses (unchanged)', () => {
    coursesState = state({ items: [course('c1')] });
    renderFeatured();
    expect(courseQueries[0]).toEqual({ pagination: { page: 1, pageSize: 3 } });
  });

  it('a failed load is an error with a retry — never "courses launching soon"', async () => {
    const user = userEvent.setup({ delay: null });
    coursesState = state<{ items: Course[] }>(undefined, true);
    const { container } = renderFeatured();
    expect(container.querySelector('[data-courses-launching]')).toBeNull();
    expect(screen.queryByText('Courses launching soon')).toBeNull();
    expect(container.querySelector('[data-courses-error]')).toBeTruthy();
    expect(
      screen.getByText("Courses couldn't be loaded right now")
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(coursesState.refetch).toHaveBeenCalled();
  });

  it('no courses (a successful, empty answer) still shows the designed "launching soon" state', () => {
    coursesState = state({ items: [] });
    const { container } = renderFeatured();
    expect(container.querySelector('[data-courses-launching]')).toBeTruthy();
  });
});

describe('F-5: other live sections on a failed load', () => {
  const statisticsConfig = {
    title: lt('By the numbers'),
    items: [
      { id: 's1', label: lt('Courses'), metric: 'courses' },
      { id: 's2', label: lt('Learners'), metric: 'students' },
    ],
  } as unknown as SectionConfigMap['statistics'];
  const categoriesConfig = {
    title: lt('Explore'),
    maxItems: 8,
  } as unknown as SectionConfigMap['courseCategories'];

  it('public site: the section steps aside without claiming anything', () => {
    statisticsState = state<Record<string, number>>(undefined, true);
    categoriesState = state<unknown[]>(undefined, true);
    const { container } = wrap(
      <>
        <T1Statistics
          config={statisticsConfig}
          academyId="a1"
          pages={VISIBLE_PAGES}
          linkRenderer={testLinkRenderer}
        />
        <T1CourseCategories
          config={categoriesConfig}
          academyId="a1"
          pages={VISIBLE_PAGES}
          linkRenderer={testLinkRenderer}
        />
      </>
    );
    expect(container.querySelector('section')).toBeNull();
    expect(container.querySelector('[data-preview-note]')).toBeNull();
  });

  it('preview: says the live data failed to load (not "fewer than two")', () => {
    statisticsState = state<Record<string, number>>(undefined, true);
    categoriesState = state<unknown[]>(undefined, true);
    wrap(
      <>
        <T1Statistics
          config={statisticsConfig}
          academyId="a1"
          pages={VISIBLE_PAGES}
        />
        <T1CourseCategories
          config={categoriesConfig}
          academyId="a1"
          pages={VISIBLE_PAGES}
        />
      </>
    );
    expect(
      screen.getAllByText(
        "Live data couldn't be loaded, so visitors don't see this section right now."
      )
    ).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
/* F-6 / F-7 — one h1, skip-link target                                 */
/* ------------------------------------------------------------------ */

const hero = (id: string, title: string): SectionInstance =>
  ({
    id,
    type: 'hero',
    enabled: true,
    config: { title: lt(title), highlights: [] },
  }) as unknown as SectionInstance;
const pageHeader = (id: string, title: string): SectionInstance =>
  ({
    id,
    type: 'pageHeader',
    enabled: true,
    config: { title: lt(title), search: 'none' },
  }) as unknown as SectionInstance;
const text = (id: string): SectionInstance =>
  ({
    id,
    type: 'cta',
    enabled: true,
    config: { title: lt('Talk to us'), description: lt('') },
  }) as unknown as SectionInstance;

const CONFIGURATION = {
  themeKey: 'modern-education',
  brand: {},
  navigation: [],
  header: {},
  footer: { groups: [], socialLinks: [] },
} as unknown as Pick<
  WebsiteConfiguration,
  'themeKey' | 'brand' | 'navigation' | 'header' | 'footer'
>;

function renderPage(target: WebsitePage, linkRenderer?: WebsiteLinkRenderer) {
  const pages = [target, COURSES, CONTACT];
  return wrap(
    <WebsiteRenderer
      academyId="a1"
      academyName="Horizon Academy"
      configuration={CONFIGURATION}
      pages={pages}
      page={target}
      onNavigate={() => undefined}
      linkRenderer={linkRenderer}
    />
  );
}
const h1Texts = () =>
  screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent);

describe('F-6: exactly one h1 per page', () => {
  it('Home opening with a hero: that hero is the h1', () => {
    renderPage(page('p-home', 'home', [hero('s1', 'Learn with us')]));
    expect(h1Texts()).toEqual(['Learn with us']);
  });

  it('Home with two heroes: the first is the h1, the second an h2 (same look)', () => {
    renderPage(
      page('p-home', 'home', [hero('s1', 'First'), hero('s2', 'Second')])
    );
    expect(h1Texts()).toEqual(['First']);
    const second = screen.getByRole('heading', { level: 2, name: 'Second' });
    expect(second.className).toContain('t1-display');
  });

  it('Home whose hero is not first: the hero is still the one h1', () => {
    renderPage(page('p-home', 'home', [text('s0'), hero('s1', 'Learn')]));
    expect(h1Texts()).toEqual(['Learn']);
  });

  it('Home with no hero: a visually hidden h1 names the Academy', () => {
    renderPage(page('p-home', 'home', [text('s0')]));
    const [h1] = screen.getAllByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Horizon Academy');
    expect(h1.className).toContain('sr-only');
    expect(h1Texts()).toHaveLength(1);
  });

  it('an inner page without a leading header: the intro is the h1, a later header an h2', () => {
    renderPage(
      page('p-about', 'about', [text('s0'), pageHeader('s1', 'Our story')])
    );
    expect(h1Texts()).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Our story' })
    ).toBeTruthy();
  });

  it('an inner page opening with its header: that header is the h1 (no intro)', () => {
    renderPage(page('p-about', 'about', [pageHeader('s1', 'About us')]));
    expect(h1Texts()).toEqual(['About us']);
  });
});

describe('F-7: the skip link target', () => {
  it('public site: <main> carries the skip-link id and can take focus', () => {
    const { container } = renderPage(
      page('p-home', 'home', [hero('s1', 'Learn')]),
      testLinkRenderer
    );
    const main = container.querySelector('main');
    expect(main?.id).toBe(PUBLIC_WEBSITE_MAIN_ID);
    expect(main?.getAttribute('tabindex')).toBe('-1');
    // The header comes before it, so skipping lands past the header.
    const header = container.querySelector('header')!;
    expect(
      header.compareDocumentPosition(main!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('previews: no id (a dashboard can show several previews at once)', () => {
    const { container } = renderPage(
      page('p-home', 'home', [hero('s1', 'Learn')])
    );
    expect(container.querySelector('main')?.id).toBe('');
  });
});

/* ------------------------------------------------------------------ */
/* F-10 — Owner-uploaded images                                         */
/* ------------------------------------------------------------------ */

describe('F-10: Owner-uploaded images', () => {
  it('load lazily and decode asynchronously by default', () => {
    wrap(
      <T1Media value="https://cdn.example/a.jpg" alt="Studio" sizes="100vw" />
    );
    const img = screen.getByRole('img', { name: 'Studio' });
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('fetchpriority')).toBeNull();
  });

  it('a hero image loads eagerly, at high priority', () => {
    wrap(
      <T1Media
        priority
        value="https://cdn.example/hero.jpg"
        alt="Campus"
        sizes="100vw"
      />
    );
    const img = screen.getByRole('img', { name: 'Campus' });
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });
});

/* ------------------------------------------------------------------ */
/* F-8 — Contact form abuse protection (frontend half)                  */
/* ------------------------------------------------------------------ */

describe('F-8: contact form', () => {
  const config = {
    title: lt('Get in touch'),
    showForm: true,
  } as unknown as SectionConfigMap['contact'];

  const fill = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText('Name'), 'Sara');
    await user.type(screen.getByLabelText('Email'), 'sara@example.com');
    await user.type(screen.getByLabelText('Message'), 'Hello there');
  };

  it('bounds each field like the backend does', () => {
    wrap(
      <T1Contact
        config={config}
        academyId="a1"
        pages={VISIBLE_PAGES}
        linkRenderer={testLinkRenderer}
      />
    );
    expect(screen.getByLabelText('Name').getAttribute('maxlength')).toBe('200');
    expect(screen.getByLabelText('Email').getAttribute('maxlength')).toBe(
      '320'
    );
    expect(screen.getByLabelText('Message').getAttribute('maxlength')).toBe(
      '5000'
    );
  });

  it('a person never meets the spam trap: hidden from assistive tech, out of the tab order, not sent', async () => {
    const user = userEvent.setup({ delay: null });
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    const { container } = wrap(
      <T1Contact
        config={config}
        academyId="a1"
        pages={VISIBLE_PAGES}
        linkRenderer={testLinkRenderer}
      />
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
    submit.mockRestore();
  });

  it('a bot that fills the trap sends it (the backend then discards the message)', async () => {
    const user = userEvent.setup({ delay: null });
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    const { container } = wrap(
      <T1Contact
        config={config}
        academyId="a1"
        pages={VISIBLE_PAGES}
        linkRenderer={testLinkRenderer}
      />
    );
    await fill(user);
    fireEvent.change(container.querySelector('input[name="company"]')!, {
      target: { value: 'Acme' },
    });
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(submit.mock.calls[0][1]).toMatchObject({ company: 'Acme' });
    submit.mockRestore();
  });
});
