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
 */
export const SHARED_CASES = [
  { name: 'not-found', state: 'new', page: NOT_FOUND },
  { name: 'coming-soon', state: 'unpublished', page: HOME },
] as const;

/**
 * Brand colours are the one Academy input that changes a theme's look.
 * Theme 1's Home in `new` state under the plan's first brand-matrix
 * palettes (EN only): the "before" for the Brand System (§F.4, §I.2).
 */
export const BRAND_PALETTES = [
  'orange',
  'purple',
  'neon-yellow',
  'near-black',
] as const;

export function fixtureSlug(
  theme: ThemeKey,
  state: DataState,
  palette = 'default'
): string {
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
