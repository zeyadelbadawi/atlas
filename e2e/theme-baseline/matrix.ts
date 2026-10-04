/**
 * Theme baseline matrix (Theme 1 plan, Phase 0).
 *
 * The regression reference every later phase is measured against:
 * 5 themes × pages × EN/AR × 1440/1024/390, in the two data states every
 * theme must handle (`new`: a just-provisioned Academy; `rich`: an
 * established one). See `server/fixture-server.mjs` for how a slug selects
 * a fixture.
 */

export const THEMES = [
  'modern-education',
  'premium-academy',
  'corporate-learning',
  'minimal-editorial',
  'bold-creative',
  // Theme 2 — Atelier (Reports/THEME_2_ATELIER_PLAN.md).
  'atelier',
] as const;
export type ThemeKey = (typeof THEMES)[number];

export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];

export const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
  { name: '390', width: 390, height: 844 },
] as const;
export type Viewport = (typeof VIEWPORTS)[number];

export type DataState = 'new' | 'rich' | 'unpublished';

export interface BaselinePage {
  /** Stable name used in snapshot and report file names. */
  readonly name: string;
  /** Unprefixed public path; the AR variant is served under `/ar`. */
  readonly path: string;
}

const HOME: BaselinePage = { name: 'home', path: '/' };
const ABOUT: BaselinePage = { name: 'about', path: '/about' };
const COURSES: BaselinePage = { name: 'courses', path: '/courses' };
const FAQS: BaselinePage = { name: 'faqs', path: '/faqs' };
const CONTACT: BaselinePage = { name: 'contact', path: '/contact' };
const SIGN_IN: BaselinePage = { name: 'sign-in', path: '/sign-in' };
const SIGN_UP: BaselinePage = { name: 'sign-up', path: '/sign-up' };
const COURSE_DETAILS: BaselinePage = {
  name: 'course-details',
  path: '/courses/fx-course-1',
};
const NOT_FOUND: BaselinePage = { name: 'not-found', path: '/no-such-page' };

/** Pages rendered for every theme, per data state. */
export const THEMED_PAGES: Record<'new' | 'rich', readonly BaselinePage[]> = {
  // Everything a visitor can reach on a just-provisioned Academy.
  new: [HOME, ABOUT, COURSES, FAQS, CONTACT, SIGN_IN, SIGN_UP],
  // The pages whose rendering depends on live Academy data.
  rich: [HOME, COURSES, COURSE_DETAILS],
};

/**
 * Surfaces that don't use the theme (they render outside
 * `WebsiteThemeScope`), captured once rather than five identical times.
 * Rendered with a Themes 2–5 Academy (`SHARED_CASE_THEME`): since Phase 6
 * Theme 1 draws its own 404 and Coming Soon (`THEME1_C1_PAGES`,
 * `THEME1_COMING_SOON`), and these snapshots keep proving the shared pages
 * the other themes still use are unchanged.
 */
export const SHARED_CASE_THEME: ThemeKey = 'premium-academy';
export const SHARED_CASES = [
  { name: 'not-found', state: 'new', page: NOT_FOUND },
  { name: 'coming-soon', state: 'unpublished', page: HOME },
] as const;

/**
 * Brand colours are the one Academy input that changes a theme's look.
 * Phase 0 recorded Theme 1's Home under the first four palettes; Phase 5
 * widened this to the full §I.2 identity matrix (the fixture's `default`
 * blue plus these 11), rendered on the §C.1 Home (EN only).
 */
export const BRAND_PALETTES = [
  'orange',
  'purple',
  'neon-yellow',
  'near-black',
  'pastel-pink',
  'monochrome',
  'red',
  'teal',
  'brown',
  'multi-colour',
  'no-logo',
] as const;

/**
 * Theme 1's Home with the plan's §C.1 composition: the fixture server's
 * `c1` slug, which since Phase 7 is exactly what template v2 provisions
 * (`generated/modern-education.json`), in both data states. The v1 Home
 * existing Academies still have stays covered by `THEMED_PAGES`.
 */
export const THEME1_HOME_C1_STATES = ['new', 'rich'] as const;

/**
 * Theme 1's inner pages with their Phase 6 compositions (the fixture
 * server's `c1` pages: page heroes, catalog, contact, gallery, FAQ filter),
 * plus its own 404. The v1 pages in `THEMED_PAGES` stay covered too: they
 * are what existing Academies have (Phase 6's fallback page hero).
 */
export const THEME1_C1_PAGES: Record<'new' | 'rich', readonly BaselinePage[]> =
  {
    new: [ABOUT, COURSES, FAQS, CONTACT, NOT_FOUND],
    rich: [ABOUT, COURSES, COURSE_DETAILS, FAQS, CONTACT],
  };

/** Theme 1's own Coming Soon (Phase 6), before the website is published. */
export const THEME1_COMING_SOON = {
  name: 'coming-soon',
  state: 'unpublished',
  page: HOME,
} as const;

/**
 * The brand matrix on every Theme 1 inner page (Phase 6), EN at 1440: the
 * rich `c1` pages, the 404 and Coming Soon under each palette.
 */
export const THEME1_BRAND_PAGES: readonly {
  readonly page: BaselinePage;
  readonly state: DataState;
}[] = [
  ...THEME1_C1_PAGES.rich.map((page) => ({ page, state: 'rich' as const })),
  { page: NOT_FOUND, state: 'rich' },
  { page: { name: 'coming-soon', path: '/' }, state: 'unpublished' },
];

/**
 * Atelier (Theme 2) beyond `THEMED_PAGES`: its rich inner pages and 404,
 * its own Coming Soon, and the identity matrix on its Home.
 */
export const ATELIER_PAGES: readonly BaselinePage[] = [
  ABOUT,
  FAQS,
  CONTACT,
  NOT_FOUND,
];
export const ATELIER_COMING_SOON = THEME1_COMING_SOON;

export function fixtureSlug(
  theme: ThemeKey,
  state: DataState,
  palette = 'default',
  composition?: 'c1' | 'migrated'
): string {
  if (composition) return `fx--${theme}--${state}--${palette}--${composition}`;
  return palette === 'default'
    ? `fx--${theme}--${state}`
    : `fx--${theme}--${state}--${palette}`;
}

export function fixtureUrl(
  page: BaselinePage,
  locale: Locale,
  slug: string
): string {
  const localized =
    locale === 'en' ? page.path : `/ar${page.path === '/' ? '/' : page.path}`;
  return `${localized}?__atlas_academy_preview=${slug}`;
}
