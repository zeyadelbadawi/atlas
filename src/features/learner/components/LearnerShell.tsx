/**
 * The learner dashboard shell (P64 Phase 2 §E.1).
 *
 * THE BRANDED HEADER IS NOT BUILT HERE. `/my/*` is mounted inside
 * `WebsiteChrome`, which already renders the academy's own logo, navigation,
 * language switcher and account menu in the academy's own theme — a second
 * header stacked beneath it would be two headers, not a branded one, and
 * would drift from the academy's brand the moment the CMS changed it. What
 * this shell adds is what a dashboard needs and a website does not: a
 * persistent section rail on desktop, the same sections in a drawer below
 * that breakpoint, a four-item bottom bar, and the breadcrumb trail each
 * page renders through `LearnerPageHeader`.
 *
 * ONE `<main>` PER DOCUMENT. `WebsiteChrome` owns the page's `<main>`; this
 * is a `<div>` inside it. Two `<main>` elements are invalid HTML and leave
 * "skip to main content" landing on whichever the browser picked.
 *
 * The bottom bar's height is paid for here, by the same boolean that
 * decides whether it renders (`useLearnerBottomNavVisibility`) — if the two
 * ever disagree, either the last action on a page sits underneath the bar
 * or an empty strip appears where it is not.
 */
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isPathActive } from '@app/routes/route-paths';
import { SectionLoader } from '@components/loading';
import { cn } from '@utils';
import { LearnerBottomNav } from './LearnerBottomNav';
import { LearnerNavigationDrawer } from './LearnerNavigationDrawer';
import { LearnerNotificationBell } from './LearnerNotificationBell';
import { LearnerNavigationList } from './LearnerNavigationList';
import { LEARNER_NAVIGATION } from '../constants/learner-navigation.constants';
import { useLearnerSurface } from '../context/LearnerSurface.context';
import { useLearnerBottomNavVisibility } from '../hooks/useLearnerBottomNavVisibility';

export function LearnerShell(): JSX.Element {
  const { t } = useTranslation();
  const { pathname } = useLearnerSurface();
  const showBottomNav = useLearnerBottomNavVisibility();
  // Declaration order decides ties, and Overview is declared first with
  // exact matching — so `/my/courses` resolves to Courses, not to the root.
  const activeSection = LEARNER_NAVIGATION.find((item) =>
    isPathActive(pathname, item.path, item.matchNestedPaths)
  );

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-content px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
        showBottomNav && 'pb-20 md:pb-6 lg:pb-8'
      )}
    >
      {/* Client-side navigation moves no focus and fires no page load, so
          a screen reader is told nothing when a section changes — and a
          lazily loaded section changes twice, once into its Suspense
          fallback and once into the page. Naming the section here is the
          one announcement that covers both. */}
      <p role="status" aria-live="polite" className="sr-only">
        {activeSection ? t(activeSection.labelKey) : ''}
      </p>

      {/* Below the rail breakpoint the sections live in a drawer, opened
          from here, with the notification bell beside it. From the rail
          breakpoint up this row is not drawn at all: the rail is on screen
          and its Notifications entry carries the unread count, and a row
          holding only a bell was a band of empty space between the
          Academy's header and the page. */}
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <LearnerNavigationDrawer />
        <LearnerNotificationBell className="ms-auto" />
      </div>

      <div className="lg:grid lg:grid-cols-[var(--layout-sidebar-width)_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <nav
            aria-label={t('learning:learnerDashboard.nav.label')}
            // Sticks while a long course list scrolls, so the sections stay
            // reachable without scrolling back up. A plain top offset, not
            // one clearing the academy header: `WebsiteHeader` scrolls away
            // with the page rather than sticking, so reserving its height
            // here would leave a permanent gap above the rail.
            className="sticky top-6"
          >
            <LearnerNavigationList />
          </nav>
        </aside>

        <div className="min-w-0 space-y-6 lg:space-y-8">
          {/* Only the section suspends, never the navigation around it.
              `SectionLoader` is already a `role="status"` live region, so
              a lazily arriving section is announced rather than appearing
              in silence. */}
          <Suspense fallback={<SectionLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </div>

      <LearnerBottomNav />
    </div>
  );
}
