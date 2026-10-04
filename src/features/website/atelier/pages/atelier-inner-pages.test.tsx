/**
 * Atelier inner pages: the masthead (h1/h2 rule, trail, image, the course
 * search hand-off, the FAQ filter), the page intro, the catalog (filters,
 * URL state, pagination, empty / launching / error / loading states), the
 * contact letter (channels, validation, spam trap, success / failure), the
 * 404 and Coming Soon posters, in English and Arabic.
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
import fragmentEn from '../i18n/pages.en.json';
import fragmentAr from '../i18n/pages.ar.json';
import {
  ATELIER_PAGES,
  ATELIER_PAGE_RENDERERS,
  AtelierComingSoon,
  AtelierContact,
  AtelierCourseCatalog,
  AtelierCourseDetails,
  AtelierNotFound,
  AtelierPageHeader,
  AtelierPageIntro,
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

/* ------------------------------------------------------------------ */
/* Harness                                                              */
/* ------------------------------------------------------------------ */

const lt = (en: string, ar = '') => ({ en, ar });

function i18nFor(locale: PublicWebsiteLocale) {
  const i18n = createI18nInstance(locale);
  i18n.addResourceBundle(
    locale,
    'website',
    { atelier: locale === 'en' ? fragmentEn : fragmentAr },
    true,
    true
  );
  return i18n;
}

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
      <I18nextProvider i18n={i18nFor(locale)}>
        <MemoryRouter initialEntries={['/courses']}>
          <WebsiteThemeScope theme={getWebsiteTheme('atelier')}>
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
  title: lt('We teach the craft', 'نعلّم الحِرفة'),
  description: lt(
    'Small classes, real projects.',
    'صفوف صغيرة ومشاريع حقيقية.'
  ),
  image: 'theme-asset:atelier/about-header',
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
    pricing: { type: 'paid', price: 99, currency: 'USD' },
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
    expect(ATELIER_PAGES).toEqual({
      PageIntro: AtelierPageIntro,
      CourseDetails: AtelierCourseDetails,
      NotFound: AtelierNotFound,
      ComingSoon: AtelierComingSoon,
    });
    expect(ATELIER_PAGE_RENDERERS).toEqual({
      pageHeader: AtelierPageHeader,
      courseCatalog: AtelierCourseCatalog,
      contact: AtelierContact,
    });
  });
});

/* ------------------------------------------------------------------ */
/* Masthead                                                             */
/* ------------------------------------------------------------------ */

describe('AtelierPageHeader', () => {
  it('opens the page: its h1, a trail back Home, the lead and the arch image', () => {
    const { container } = wrap(
      <AtelierPageHeader
        config={ABOUT_HEADER}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'We teach the craft'
    );
    expect(
      screen.getByRole('region', { name: 'We teach the craft' })
    ).toBeTruthy();
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(
      within(trail).getByRole('link', { name: 'Home' }).getAttribute('href')
    ).toBe('/');
    expect(
      within(trail).getByText('Our story').getAttribute('aria-current')
    ).toBe('page');
    expect(screen.getByText('Small classes, real projects.')).toBeTruthy();
    expect(
      container.querySelector('.at-frame[data-shape="arch"]')
    ).toBeTruthy();
  });

  it('is an h2 when another section owns the page h1 (same look)', () => {
    wrap(
      <PageHeadingProvider value="h2">
        <AtelierPageHeader config={ABOUT_HEADER} academyId="a1" pages={PAGES} />
      </PageHeadingProvider>
    );
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('heading', { level: 2 }).className).toContain(
      'at-display'
    );
  });

  it('without its page (a single-section preview) the eyebrow stands alone', () => {
    wrap(
      <AtelierPageHeader
        config={{ ...ABOUT_HEADER }}
        academyId="a1"
        pages={PAGES}
      />
    );
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.getByText('Our story')).toBeTruthy();
  });

  it('Courses: the search is handed to the catalog on the same page, with the live summary', () => {
    courses = [course('c1'), course('c2')];
    wrap(
      <>
        <AtelierPageHeader
          config={{ title: lt('The index'), search: 'courses' }}
          academyId="a1"
          pages={PAGES}
          linkRenderer={linkRenderer}
        />
        <AtelierCourseCatalog
          config={CATALOG}
          academyId="a1"
          pages={PAGES}
          linkRenderer={linkRenderer}
        />
      </>
    );
    expect(screen.getByText('3 courses in 2 categories')).toBeTruthy();
    const [search] = screen.getAllByRole('search');
    fireEvent.change(within(search).getByLabelText('Search courses'), {
      target: { value: 'design' },
    });
    fireEvent.submit(search);
    expect(screen.getByTestId('location').textContent).toBe('/courses');
    expect(courseQueries.at(-1)).toMatchObject({ search: 'design' });
  });

  it('Courses with no catalog on the page: the search opens the catalog', () => {
    wrap(
      <AtelierPageHeader
        config={{ title: lt('Find a course'), search: 'courses' }}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const search = screen.getByRole('search');
    fireEvent.change(within(search).getByRole('searchbox'), {
      target: { value: 'type' },
    });
    fireEvent.submit(search);
    expect(screen.getByTestId('location').textContent).toBe('/courses?q=type');
  });

  it('FAQs: the filter feeds the shared question filter and clears it on leaving', () => {
    let filter = '';
    function Probe() {
      filter = useFaqFilter();
      return null;
    }
    const view = wrap(
      <>
        <AtelierPageHeader
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
      <AtelierPageHeader
        config={ABOUT_HEADER}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'نعلّم الحِرفة'
    );
    expect(
      screen.getByRole('navigation', { name: 'مسار التنقل' })
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toBeTruthy();
    expect(
      container.querySelector('[dir="rtl"] [data-atelier-masthead]')
    ).toBeTruthy();
  });
});

describe('AtelierPageIntro (existing pages without a page header)', () => {
  it('titles the masthead from the navigation label, with a neutral lead; not a region', () => {
    const navigation = [
      { id: 'n1', pageId: 'p-about', label: lt('Our story', 'قصتنا') },
    ] as unknown as WebsiteNavigationItem[];
    wrap(<AtelierPageIntro page={PAGES[1]} navigation={navigation} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Our story'
    );
    expect(
      screen.getByText('The people, purpose and craft behind our courses.')
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
      <AtelierPageIntro page={custom} navigation={[]} />
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Team');
    expect(container.querySelector('.at-lead')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Catalog                                                              */
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

describe('AtelierCourseCatalog', () => {
  it('an index of numbered rows linking to each course', () => {
    courses = [
      course('c1', { level: 'beginner' } as Partial<Course>),
      course('c2'),
    ];
    const { container } = wrap(
      <AtelierCourseCatalog
        config={CATALOG}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const rows = container.querySelectorAll('ol.atp-index > li');
    expect(rows).toHaveLength(2);
    const first = rows[0].querySelector('a')!;
    expect(first.getAttribute('href')).toBe('/courses/c1');
    expect(first.querySelector('.atp-row-no')?.textContent).toBe('01');
    expect(within(first).getByRole('heading', { level: 3 }).textContent).toBe(
      'Course c1'
    );
    expect(first.textContent).toContain('Beginner');
    expect(first.textContent).toContain('by Layla Haddad');
    expect(container.querySelector('p[role="status"]')?.textContent).toBe(
      '2 courses'
    );
  });

  it('previews: rows are articles, nothing navigates', () => {
    courses = [course('c1')];
    const { container } = wrap(
      <AtelierCourseCatalog config={CATALOG} academyId="a1" pages={PAGES} />
    );
    expect(container.querySelector('article.atp-row')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('filters by category, level and search, keeps the state in the URL, and removes a filter', async () => {
    courses = [course('c1'), course('c2')];
    wrap(
      <AtelierCourseCatalog
        config={CATALOG}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const design = screen.getByRole('button', { name: /Design/ });
    expect(design.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(design);
    expect(design.getAttribute('aria-pressed')).toBe('true');
    fireEvent.change(screen.getByLabelText('Level'), {
      target: { value: 'beginner' },
    });
    fireEvent.change(screen.getByLabelText('Search courses'), {
      target: { value: 'type' },
    });
    expect(courseQueries.at(-1)).toMatchObject({
      search: 'type',
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
      <AtelierCourseCatalog
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
      <AtelierCourseCatalog
        config={CATALOG}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />
    );
    const nav = await screen.findByRole('navigation', { name: 'Course pages' });
    expect(
      within(nav)
        .getByRole('button', { name: 'Page 1' })
        .getAttribute('aria-current')
    ).toBe('page');
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

  it('no courses yet: no filters, just the statement set in type', () => {
    const { container } = wrap(
      <AtelierCourseCatalog config={CATALOG} academyId="a1" pages={PAGES} />
    );
    expect(
      container.querySelector('[data-atelier-catalog-toolbar]')
    ).toBeNull();
    expect(
      container.querySelector('[data-catalog-empty]')?.textContent
    ).toContain('The first courses are in preparation');
    expect(container.querySelector('p[role="status"]')?.textContent).toBe('');
  });

  it('nothing matches the filters: says so and offers to clear them', async () => {
    const user = userEvent.setup({ delay: null });
    window.history.replaceState(null, '', '/courses?level=advanced');
    const { container } = wrap(
      <AtelierCourseCatalog
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

  it('a failed load is an error with a retry, never "in preparation"', async () => {
    const user = userEvent.setup({ delay: null });
    coursesError = new Error('network');
    const { container } = wrap(
      <AtelierCourseCatalog config={CATALOG} academyId="a1" pages={PAGES} />
    );
    expect(container.querySelector('[data-catalog-error]')).toBeTruthy();
    expect(
      screen.queryByText('The first courses are in preparation')
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetchCourses).toHaveBeenCalled();
  });

  it('loading: row-shaped skeletons, marked busy', () => {
    coursesLoading = true;
    const { container } = wrap(
      <AtelierCourseCatalog config={CATALOG} academyId="a1" pages={PAGES} />
    );
    const busy = container.querySelector('[aria-busy="true"]')!;
    expect(busy.getAttribute('aria-label')).toBe('Loading courses');
    expect(busy.querySelectorAll('.atp-row').length).toBeGreaterThan(0);
  });

  it('Arabic: right to left, Arabic-Indic numbering and labels', () => {
    courses = [course('c1')];
    const { container } = wrap(
      <AtelierCourseCatalog
        config={CATALOG}
        academyId="a1"
        pages={PAGES}
        linkRenderer={linkRenderer}
      />,
      'ar'
    );
    expect(
      container.querySelector('[dir="rtl"] .atp-row-no')?.textContent
    ).toBe('٠١');
    expect(screen.getByRole('group', { name: 'تنقيح الفهرس' })).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* Contact                                                              */
/* ------------------------------------------------------------------ */

const CONTACT: SectionConfigMap['contact'] = {
  title: lt('Write to the studio'),
  showForm: true,
};

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Sara');
  await user.type(screen.getByLabelText('Email'), 'sara@example.com');
  await user.type(screen.getByLabelText('Message'), 'Hello there');
}

describe('AtelierContact', () => {
  it('lists the academy channels, each actionable', () => {
    const { container } = wrap(
      <AtelierContact config={CONTACT} academyId="a1" pages={PAGES} />
    );
    const channels = container.querySelector(
      '[data-atelier-channels]'
    ) as HTMLElement;
    expect(
      within(channels).getByText('hello@academy.example').getAttribute('href')
    ).toBe('mailto:hello@academy.example');
    expect(within(channels).getByText('+971 4 555').getAttribute('href')).toBe(
      'tel:+9714555'
    );
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Write to the studio'
    );
  });

  it('validates like Theme 1: required, bounded fields; blank input sends nothing', () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    wrap(<AtelierContact config={CONTACT} academyId="a1" pages={PAGES} />);
    const name = screen.getByLabelText('Name');
    expect(name.hasAttribute('required')).toBe(true);
    expect(name.getAttribute('maxlength')).toBe('200');
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
      <AtelierContact config={CONTACT} academyId="a1" pages={PAGES} />
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
    expect(screen.getByText('Your letter is on its way')).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Write another message' })
    );
    expect(screen.getByLabelText('Message')).toBeTruthy();
  });

  it('a bot that fills the trap sends it (the backend then discards it)', async () => {
    const user = userEvent.setup({ delay: null });
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    const { container } = wrap(
      <AtelierContact config={CONTACT} academyId="a1" pages={PAGES} />
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
    wrap(<AtelierContact config={CONTACT} academyId="a1" pages={PAGES} />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(
      (screen.getByLabelText('Message') as HTMLTextAreaElement).value
    ).toBe('Hello there');
  });

  it('without the form: the channels alone', () => {
    wrap(
      <AtelierContact
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
      <AtelierContact config={CONTACT} academyId="a1" pages={PAGES} />,
      'ar'
    );
    expect(
      container.querySelector('[dir="rtl"] [data-atelier-channels]')
    ).toBeTruthy();
    expect(screen.getByText('طرق التواصل')).toBeTruthy();
    expect(screen.getByText('راسلنا')).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* 404 and Coming Soon                                                  */
/* ------------------------------------------------------------------ */

describe('Atelier system pages', () => {
  it('404: an h1 and the next useful places', () => {
    wrap(<AtelierNotFound pages={PAGES} linkRenderer={linkRenderer} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'This page is not in our index'
    );
    expect(
      screen.getByRole('link', { name: /Back to home/ }).getAttribute('href')
    ).toBe('/');
    expect(
      screen
        .getByRole('link', { name: 'Browse the courses' })
        .getAttribute('href')
    ).toBe('/courses');
    expect(
      screen.getByRole('link', { name: 'Contact us' }).getAttribute('href')
    ).toBe('/contact');
  });

  it('404: no catalog or contact page → no links to them; previews are inert', () => {
    wrap(<AtelierNotFound pages={[page('p-home', 'home')]} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: /Back to home/ })).toBeTruthy();
    expect(screen.queryByText('Browse the courses')).toBeNull();
  });

  it('404 in Arabic: right to left, Arabic-Indic figure', () => {
    const { container } = wrap(
      <AtelierNotFound pages={PAGES} linkRenderer={linkRenderer} />,
      'ar'
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'هذه الصفحة ليست في فهرسنا'
    );
    expect(
      container.querySelector('[dir="rtl"] .atp-poster-figure')?.textContent
    ).toBe('٤٠٤');
  });

  it('Coming Soon: the poster names the Academy in its h1, with logo or wordmark', () => {
    wrap(<AtelierComingSoon academyName="Horizon Academy" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Horizon Academy is being prepared'
    );
    expect(screen.getByTestId('academy-coming-soon').tagName).toBe('MAIN');
    cleanup();
    wrap(
      <AtelierComingSoon
        academyName="Horizon Academy"
        academyLogo="https://cdn.example/logo.png"
      />
    );
    expect(screen.getByRole('img', { name: 'Horizon Academy' })).toBeTruthy();
  });
});
