/**
 * The learner dashboard shell and its routes (P64 Phase 2 §E.1, §E.6).
 *
 * WHAT THESE PROTECT, and why each is worth a test rather than a review:
 *
 * 1. THE BOTTOM BAR IS EXACTLY FOUR ITEMS, AND HIDDEN IN THE PLAYER. Both
 *    are product decisions (§E.1, §E.6) that a later "just add Certificates
 *    to the bar" will quietly undo, and neither is visible in a diff of the
 *    navigation declaration — the bar reads its items from a second list.
 *    The player exception is a regex, which is the other thing that looks
 *    right and is off by one segment.
 *
 * 2. AN INDETERMINATE PROGRESS BAR CARRIES NO `aria-valuenow`. This is the
 *    one accessibility rule here that is actively easy to "fix" wrongly:
 *    defaulting the value to `0` satisfies every linter and announces "0%
 *    complete" — a wrong fact — to the only user who cannot see that the
 *    page is still loading.
 *
 * Every section is a lazy chunk, so every render here has to be awaited —
 * and with a timeout well above the 1 s default, which the full suite
 * running in parallel does exceed for a first chunk resolution.
 *
 * 3. ARABIC LINKS KEEP THE `/ar` PREFIX. Every link on this surface is
 *    built through the injected `buildHref`; the failure mode of building
 *    one locally instead is that a single click drops the learner back
 *    into English, which is exactly the bug
 *    `usePublicWebsiteLinkRenderer` was written to end.
 *
 * THE HARNESS GREW PROVIDERS WHEN THE SECTIONS GREW DATA (P64 Phase 2
 * §E.1). Every section now reads through TanStack Query and identifies the
 * learner through the identity context, so both have to exist for a
 * section to render at all. The signed-in user is deliberately left
 * UNDEFINED: every learner query is gated on `!!user?.id`, so this
 * harness exercises the shell, the routes, the navigation and each
 * section's own empty/loading state without a single request leaving
 * jsdom — which is exactly what these tests are about. What each section
 * does with real data belongs in that section's own suite.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext, ToastContext } from '@app/providers';
import type { IdentityContextValue, ToastContextValue } from '@app/providers';
import type { PublicWebsiteLocale } from '@types';
import { LearnerRouter } from './LearnerRouter';
import { isLearnerPlayerPath } from './hooks/useLearnerBottomNavVisibility';

/**
 * A session that exists but carries no user yet — the state `/my/*` is in
 * while the identity provider is still restoring. Enough for the shell and
 * every section header to render, and not enough for any query to fire.
 */
const RESTORING_IDENTITY = {
  session: { status: 'restoring' },
  isRestoring: true,
  user: undefined,
  organization: undefined,
  isAuthenticated: false,
  signIn: async () => undefined,
  completeTwoFactor: async () => undefined,
  signOut: async () => undefined,
  switchOrganization: () => undefined,
  refreshSession: async () => undefined,
} as unknown as IdentityContextValue;

/**
 * Notifications go nowhere here.
 *
 * `useApiMutation` reads the toast context unconditionally, so a section
 * that owns a mutation cannot render without one — and the real
 * `AtlasToastProvider` depends on the theme and localization providers in
 * turn. These tests assert routing and section structure, not what any
 * notification says, so the delivery is stubbed rather than staged.
 */
const SILENT_TOASTS: ToastContextValue = {
  notify: () => undefined,
  notifySuccess: () => undefined,
  notifyError: () => undefined,
  dismissAll: () => undefined,
};

/** The real `usePublicWebsiteHrefBuilder` behaviour, minus the dev-preview param. */
function hrefBuilder(locale: PublicWebsiteLocale) {
  return (path: string) => (locale === 'en' ? path : `/ar${path}`);
}

function renderLearner(path: string, locale: PublicWebsiteLocale = 'en') {
  const i18n = createI18nInstance(locale);
  const entry = locale === 'en' ? path : `/ar${path}`;

  // Retries off: a disabled query never runs, but a section that ever
  // does reach the network in jsdom should fail once and fast rather than
  // hold the suite open through a back-off schedule.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <IdentityContext.Provider value={RESTORING_IDENTITY}>
          <ToastContext.Provider value={SILENT_TOASTS}>
            <MemoryRouter initialEntries={[entry]}>
              <Routes>
                <Route
                  path={locale === 'en' ? '/my/*' : '/ar/my/*'}
                  element={
                    <LearnerRouter
                      academyId="aca-1"
                      locale={locale}
                      buildHref={hrefBuilder(locale)}
                    />
                  }
                />
              </Routes>
            </MemoryRouter>
          </ToastContext.Provider>
        </IdentityContext.Provider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

/** Generous enough to survive the whole suite competing for the event loop. */
const LAZY_CHUNK_TIMEOUT = { timeout: 10_000 };

/** The `<h1>` a lazily loaded section renders once its chunk has resolved. */
function findSectionHeading(name: RegExp | string) {
  return screen.findByRole('heading', { level: 1, name }, LAZY_CHUNK_TIMEOUT);
}

afterEach(cleanup);

describe('learner dashboard shell', () => {
  it('mounts every section under /my', async () => {
    const sections: readonly [string, RegExp][] = [
      ['/my', /overview/i],
      ['/my/courses', /my courses/i],
      ['/my/courses/c-1', /course progress/i],
      ['/my/assessments', /assessments/i],
      ['/my/certificates', /certificates/i],
      ['/my/purchases', /purchases/i],
      ['/my/devices', /devices/i],
      ['/my/profile', /profile/i],
      ['/my/security', /security/i],
    ];

    for (const [path, heading] of sections) {
      renderLearner(path);
      expect(await findSectionHeading(heading), path).toBeTruthy();
      cleanup();
    }
    // Nine lazy chunks in one test: each `findBy` already waits up to
    // LAZY_CHUNK_TIMEOUT, so the test itself needs more than vitest's 5 s
    // default when the whole suite is competing for the event loop.
  }, 60_000);

  it('carries exactly Overview, Courses, Assessments and Profile in the bottom bar', async () => {
    renderLearner('/my');
    await findSectionHeading(/overview/i);

    const bar = screen.getByRole('navigation', { name: /learner navigation/i });
    const links = within(bar).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual([
      'Overview',
      'Courses',
      'Assessments',
      'Profile',
    ]);
  });

  it('keeps the bottom bar on the course page', async () => {
    renderLearner('/my/courses/c-1');
    await findSectionHeading(/course progress/i);
    expect(
      screen.queryByRole('navigation', { name: /learner navigation/i })
    ).toBeTruthy();
  });

  /*
   * Asserted on the rule rather than through the router: the player's own
   * routes are §E.2's, so `/my/courses/c-1/learn/l-1` currently falls to
   * this tree's catch-all and redirects — which would make a rendered
   * assertion pass for the wrong reason, and keep passing if the rule were
   * deleted outright.
   */
  it('treats any screen below one course as the player, and the course page as not', () => {
    expect(isLearnerPlayerPath('/my/courses')).toBe(false);
    expect(isLearnerPlayerPath('/my/courses/c-1')).toBe(false);
    expect(isLearnerPlayerPath('/my/courses/c-1/learn/l-1')).toBe(true);
    expect(isLearnerPlayerPath('/my/courses/c-1/activities/a-1')).toBe(true);
    expect(isLearnerPlayerPath('/my/assessments')).toBe(false);
  });

  it('announces progress as indeterminate rather than as zero per cent', async () => {
    renderLearner('/my/courses/c-1');
    const bar = await screen.findByRole(
      'progressbar',
      undefined,
      LAZY_CHUNK_TIMEOUT
    );

    expect(bar.getAttribute('aria-valuenow')).toBeNull();
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(bar.getAttribute('aria-busy')).toBe('true');
  });

  it('keeps every Arabic link inside /ar', async () => {
    renderLearner('/my/courses', 'ar');
    await findSectionHeading('دوراتي');

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href, href ?? '').toMatch(/^\/ar\//);
    }
  });
});
