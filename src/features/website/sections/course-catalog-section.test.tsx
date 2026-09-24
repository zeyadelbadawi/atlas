/**
 * CourseCatalogSection — the contracts a public visitor relies on:
 *
 *   - every control is a real, labelled form control (a visitor on a
 *     screen reader must be able to find "Level", not an unnamed combobox);
 *   - a filter change is a NEW QUERY to the server, not a client-side
 *     narrowing of the page already on screen, and it returns to page 1;
 *   - cards are real navigation when a `linkRenderer` is supplied, and the
 *     result count is announced through a live region.
 *
 * `usePublicCourses` is replaced by a recorder so the assertion is on the
 * exact `CourseListQuery` the section builds — the thing `toCollectionParams`
 * turns into `?level=beginner&page=1…`. Everything else (state, handlers,
 * pagination, card markup, i18n) is the production code.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { WebsiteThemeScope } from '../renderer/WebsiteThemeScope';
import { PublicWebsiteLocaleProvider } from '../renderer/PublicWebsiteLocaleContext';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import type { UsePublicCoursesOptions } from '@/shared/hooks/usePublicCourses';
import type {
  Course,
  CourseCatalogSectionConfig,
  PaginatedResult,
} from '@types';

/* ------------------------------------------------------------------ */
/* Mocks                                                               */
/* ------------------------------------------------------------------ */

interface RecordedCall {
  readonly academyId: string | undefined;
  readonly options: UsePublicCoursesOptions | undefined;
}

/** Every `usePublicCourses` render-call, oldest first. */
const calls: RecordedCall[] = [];

/** What the "server" returns for the next render. */
let page: PaginatedResult<Course> | null = null;

vi.mock('@/shared/hooks/usePublicCourses', () => ({
  usePublicCourses: (
    academyId: string | undefined,
    options?: UsePublicCoursesOptions
  ) => {
    calls.push({ academyId, options });
    return { data: page, isLoading: false, error: null, refetch: vi.fn() };
  },
}));

// `Pagination` formats numbers through the dashboard's localization
// context; the section under test does not own that provider.
vi.mock('@/shared/hooks/useLanguage', () => ({
  useLanguage: () => ({
    language: 'en',
    direction: 'ltr',
    isRtl: false,
    locale: 'en-US',
  }),
}));

/*
  The filter controls are Radix `Select`s. Opening one in jsdom never
  completes (Radix's positioning depends on layout APIs jsdom lacks) — see
  `academy-students-roster.test.tsx` for the same substitution and its
  reasoning. Only the presentation primitive is replaced by the native
  control it stands in for; the trigger's `id` is carried onto the native
  `<select>` so the section's own visible `<Label htmlFor>` still names it.
*/
vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  type AnyProps = Record<string, unknown> & {
    readonly children?: React.ReactNode;
  };

  const SelectTrigger = (): null => null;

  const triggerProps = (children: React.ReactNode): Record<string, unknown> => {
    let props: Record<string, unknown> = {};
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === SelectTrigger) {
        const { id, 'aria-label': ariaLabel } = child.props as AnyProps;
        props = { id, 'aria-label': ariaLabel };
      }
    });
    return props;
  };

  return {
    Select: ({ value, onValueChange, children }: AnyProps) =>
      React.createElement(
        'select',
        {
          ...triggerProps(children),
          value: value as string,
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            (onValueChange as (next: string) => void)(event.target.value),
        },
        children
      ),
    SelectTrigger,
    SelectValue: () => null,
    SelectContent: ({ children }: AnyProps) =>
      React.createElement(React.Fragment, null, children),
    SelectItem: ({ value, children }: AnyProps) =>
      React.createElement('option', { value: value as string }, children),
  };
});

const { CourseCatalogSection } = await import('./CourseCatalogSection');

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const i18n = createI18nInstance('en');
const theme = getWebsiteTheme('modern-education');

/** See the roster suite: user-event's defaults are too slow for this tree in jsdom. */
const USER_EVENT_OPTIONS = { delay: null, pointerEventsCheck: 0 } as const;

const DEFAULT_CONFIG: CourseCatalogSectionConfig = {
  title: { en: 'All courses', ar: 'كل الدورات' },
  pageSize: 12,
  defaultSort: 'newest',
  showSearch: true,
  showLevelFilter: true,
  showPricingFilter: true,
  showSort: true,
};

function course(
  overrides: Partial<Course> & Pick<Course, 'id' | 'title'>
): Course {
  return {
    academyId: 'academy-1',
    slug: overrides.id,
    status: 'published',
    visibility: 'public',
    pricing: { type: 'free' },
    instructors: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function pageOf(items: readonly Course[], totalItems = items.length) {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: 12,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / 12)),
    },
  } satisfies PaginatedResult<Course>;
}

const TWO_COURSES = pageOf([
  course({
    id: 'course-1',
    title: 'Intro to Python',
    level: 'beginner',
    pricing: { type: 'paid', amount: 49, currency: 'USD' },
  }),
  course({ id: 'course-2', title: 'Advanced Kubernetes', level: 'advanced' }),
]);

function renderSection(
  config: Partial<CourseCatalogSectionConfig> = {},
  linkRenderer?: React.ComponentProps<
    typeof CourseCatalogSection
  >['linkRenderer']
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <WebsiteThemeScope theme={theme}>
        <PublicWebsiteLocaleProvider locale="en">
          <CourseCatalogSection
            academyId="academy-1"
            config={{ ...DEFAULT_CONFIG, ...config }}
            linkRenderer={linkRenderer}
          />
        </PublicWebsiteLocaleProvider>
      </WebsiteThemeScope>
    </I18nextProvider>
  );
}

function lastQuery() {
  const last = calls[calls.length - 1];
  if (!last) throw new Error('usePublicCourses was never called');
  return last.options?.query;
}

beforeAll(() => {
  // Radix-derived components probe pointer capture / ResizeObserver, which
  // jsdom does not implement.
  const proto = window.HTMLElement.prototype as unknown as Record<
    string,
    unknown
  >;
  proto.hasPointerCapture = () => false;
  proto.setPointerCapture = () => undefined;
  proto.releasePointerCapture = () => undefined;
  proto.scrollIntoView = () => undefined;
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  calls.length = 0;
  page = null;
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */

describe('CourseCatalogSection — controls', () => {
  it('renders every control with an accessible name', () => {
    page = TWO_COURSES;
    renderSection();

    expect(
      screen.getByRole('searchbox', { name: 'Search courses' })
    ).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Level' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Pricing' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toBeTruthy();
  });

  it('offers the four course levels plus "any" in the level filter', () => {
    page = TWO_COURSES;
    renderSection();

    const level = screen.getByRole('combobox', { name: 'Level' });
    const options = Array.from(level.querySelectorAll('option')).map(
      (option) => option.textContent
    );
    expect(options).toEqual([
      'Any level',
      'Beginner',
      'Intermediate',
      'Advanced',
      'All levels',
    ]);
  });

  it('hides a control the Owner switched off, and then never applies it', () => {
    page = TWO_COURSES;
    renderSection({ showLevelFilter: false, showSearch: false });

    expect(screen.queryByRole('combobox', { name: 'Level' })).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(lastQuery()?.filters?.level).toBeUndefined();
    expect(lastQuery()?.search).toBeUndefined();
  });
});

describe('CourseCatalogSection — the query it sends', () => {
  it('asks for page 1 at the configured page size with the default sort', () => {
    page = TWO_COURSES;
    renderSection({ pageSize: 24, defaultSort: 'title' });

    expect(lastQuery()?.pagination).toEqual({ page: 1, pageSize: 24 });
    expect(lastQuery()?.sort).toEqual({ field: 'title', direction: 'asc' });
    expect(calls[0]?.academyId).toBe('academy-1');
  });

  it('clamps an out-of-bounds persisted page size instead of sending it', () => {
    page = TWO_COURSES;
    renderSection({ pageSize: 500 });
    expect(lastQuery()?.pagination?.pageSize).toBe(48);
  });

  it('re-queries with `level` when the level filter changes', async () => {
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    page = TWO_COURSES;
    renderSection();
    expect(lastQuery()?.filters?.level).toBeUndefined();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Level' }),
      'beginner'
    );

    expect(lastQuery()?.filters?.level).toBe('beginner');
    // The filter is a server query — the page on screen is not narrowed
    // locally, so `pricingType` is untouched and pagination restarts.
    expect(lastQuery()?.filters?.pricingType).toBeUndefined();
    expect(lastQuery()?.pagination?.page).toBe(1);
  });

  it('re-queries with `pricingType` and a new sort descriptor', async () => {
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    page = TWO_COURSES;
    renderSection();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Pricing' }),
      'free'
    );
    expect(lastQuery()?.filters?.pricingType).toBe('free');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort by' }),
      'priceDesc'
    );
    expect(lastQuery()?.sort).toEqual({ field: 'price', direction: 'desc' });
  });

  it('returns to page 1 when a filter changes on a later page', async () => {
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    // 30 courses at 12 per page = 3 pages, so pagination is rendered.
    page = pageOf(TWO_COURSES.items, 30);
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(lastQuery()?.pagination?.page).toBe(2);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Level' }),
      'advanced'
    );
    expect(lastQuery()?.filters?.level).toBe('advanced');
    expect(lastQuery()?.pagination?.page).toBe(1);
  });

  it('does not render pagination when everything fits on one page', () => {
    page = TWO_COURSES;
    renderSection();
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
  });
});

describe('CourseCatalogSection — results', () => {
  it('renders a card per course with its title, level badge and price', () => {
    page = TWO_COURSES;
    const { container } = renderSection();

    // Scoped to the cards: the level and pricing filters also contain the
    // words "Beginner"/"Advanced"/"Free" as options.
    const cards = Array.from(container.querySelectorAll('article')).map(
      (article) => article.textContent ?? ''
    );
    expect(cards).toHaveLength(2);
    expect(cards[0]).toContain('Intro to Python');
    expect(cards[0]).toContain('Beginner');
    expect(cards[0]).toContain('$49.00');
    expect(cards[1]).toContain('Advanced Kubernetes');
    expect(cards[1]).toContain('Advanced');
    expect(cards[1]).toContain('Free');
  });

  it('announces the total through a polite live region', () => {
    page = pageOf(TWO_COURSES.items, 30);
    renderSection();

    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('30 courses');
  });

  it('renders inert articles without a linkRenderer (dashboard preview)', () => {
    page = TWO_COURSES;
    const { container } = renderSection();

    expect(container.querySelectorAll('article')).toHaveLength(2);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('links each card to /courses/:id through the injected linkRenderer', () => {
    page = TWO_COURSES;
    renderSection({}, ({ href, className, children }) => (
      <a href={href} className={className}>
        {children}
      </a>
    ));

    const link = screen.getByRole('link', { name: /Intro to Python/ });
    expect(link.getAttribute('href')).toBe('/courses/course-1');
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('shows the shared empty state when the academy has no courses', () => {
    page = pageOf([]);
    renderSection();

    expect(screen.getByText('No courses to show yet')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('0 courses');
  });

  it('shows a "no match" empty state when a filter is what emptied it', async () => {
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    page = pageOf([]);
    renderSection();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Level' }),
      'intermediate'
    );

    expect(screen.getByText('No courses match your filters')).toBeTruthy();
    expect(screen.queryByText('No courses to show yet')).toBeNull();
  });
});


describe('CourseCatalogSection — card metadata from `stats`', () => {
  const cardText = (container: HTMLElement, index = 0): string =>
    container.querySelectorAll('article')[index]?.textContent ?? '';

  it('renders duration, lesson count, free-preview badge and rating', () => {
    page = pageOf([
      course({
        id: 'course-1',
        title: 'Intro to Python',
        level: 'beginner',
        shortDescription: 'From zero to scripts.',
        instructors: [{ id: 'i-1', name: 'Ada Lovelace' }],
        stats: {
          totalSections: 4,
          totalLessons: 12,
          durationSeconds: 4800,
          hasPreview: true,
          averageRating: 4.5,
          totalReviews: 12,
        },
      }),
    ]);
    const { container } = renderSection();

    const text = cardText(container);
    expect(text).toContain('1h 20m');
    expect(text).toContain('12 lessons');
    expect(text).toContain('Free preview');
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('From zero to scripts.');
    expect(text).toContain('4.5');
    expect(text).toContain('(12)');
    expect(text).toContain('12 reviews');

    // The stars are one labelled image; the score is never colour-only.
    const stars = screen.getByRole('img', { name: 'Rated 4.5 out of 5' });
    expect(container.querySelector('article')?.contains(stars)).toBe(true);
  });

  it('formats a sub-hour duration as minutes only', () => {
    page = pageOf([
      course({
        id: 'course-1',
        title: 'Quick start',
        stats: { totalSections: 1, totalLessons: 1, durationSeconds: 720 },
      }),
    ]);
    const { container } = renderSection();

    const text = cardText(container);
    expect(text).toContain('12m');
    expect(text).toContain('1 lesson');
    expect(text).not.toContain('1h');
  });

  it('hides the rating entirely when there are no reviews', () => {
    page = pageOf([
      course({
        id: 'course-1',
        title: 'Unrated course',
        stats: {
          totalSections: 2,
          totalLessons: 5,
          durationSeconds: 600,
          hasPreview: false,
          averageRating: 0,
          totalReviews: 0,
        },
      }),
    ]);
    const { container } = renderSection();

    expect(screen.queryByRole('img', { name: /Rated/ })).toBeNull();
    const text = cardText(container);
    expect(text).not.toContain('0.0');
    expect(text).not.toContain('(0)');
    expect(text).not.toContain('Free preview');
    expect(text).toContain('10m');
  });

  it('hides the duration when the backend has none', () => {
    page = pageOf([
      course({
        id: 'course-1',
        title: 'No duration yet',
        stats: {
          totalSections: 1,
          totalLessons: 3,
          durationSeconds: null,
          hasPreview: false,
          averageRating: 0,
          totalReviews: 0,
        },
      }),
    ]);
    const { container } = renderSection();

    const text = cardText(container);
    expect(text).toContain('3 lessons');
    expect(text).not.toMatch(/\d+m\b/);
    expect(text).not.toContain('0m');
  });

  it('still renders a plain card when the list carries no `stats` at all', () => {
    page = TWO_COURSES;
    const { container } = renderSection();

    expect(container.querySelectorAll('article')).toHaveLength(2);
    expect(screen.queryByRole('img', { name: /Rated/ })).toBeNull();
    expect(cardText(container)).not.toContain('Free preview');
  });
});
