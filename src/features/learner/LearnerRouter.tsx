/**
 * The `/my/*` route tree (P64 Phase 2 §E.1, AD-12).
 *
 * Mounted by `PublicWebsiteRouter` INSIDE `PublicWebsiteLearningRoute`, so
 * everything below it already has the academy's branded chrome, the
 * academy's theme, and — the part that matters most — the real
 * authenticated-only guard: an unauthenticated visitor is sent to this
 * academy's own Sign In with a `returnTo`, and every endpoint these pages
 * will call re-enforces that server-side regardless. Nothing here is a
 * second authorization decision, and nothing here should become one.
 *
 * The paths are declared RELATIVE (`courses`, `courses/:courseId`) because
 * this tree is mounted at `my/*` inside a locale-scoped parent: the same
 * declarations serve `/my/...` in English and `/ar/my/...` in Arabic with
 * no second registration. The absolute forms live in `LEARNER_ROUTES` and
 * are what link-building reads.
 *
 * Every page is lazy, matching `AppRouter`'s own convention — a learner who
 * only ever opens their courses never downloads Devices or Security. The
 * Suspense boundary those chunks need sits INSIDE the shell, around the
 * `<Outlet>` (see `LearnerShell`): put it here instead and the first visit
 * to an unloaded section would blank the rail, the drawer button and the
 * bottom bar along with the content, which is the whole point of a layout
 * route undone by where one boundary was placed.
 */
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { SectionLoader } from '@components/loading';
import { LEARNER_ROUTES } from '@app/routes/route-paths';
import type { PublicWebsiteLocale } from '@types';
import { LearnerShell } from './components/LearnerShell';
import { LearnerSurfaceProvider } from './context/LearnerSurface.context';

const LearnerOverviewPage = lazy(
  () => import('./pages/LearnerOverviewPage')
);
const LearnerCoursesPage = lazy(() => import('./pages/LearnerCoursesPage'));
const LearnerCourseProgressPage = lazy(
  () => import('./pages/LearnerCourseProgressPage')
);
const LearnerAssessmentsPage = lazy(
  () => import('./pages/LearnerAssessmentsPage')
);
const LearnerCertificatesPage = lazy(
  () => import('./pages/LearnerCertificatesPage')
);
const LearnerPurchasesPage = lazy(() => import('./pages/LearnerPurchasesPage'));
const CourseCheckoutPage = lazy(() => import('./pages/CourseCheckoutPage'));
const LearnerDevicesPage = lazy(() => import('./pages/LearnerDevicesPage'));
const LearnerNotificationsPage = lazy(
  () => import('./pages/LearnerNotificationsPage')
);
const LearnerProfilePage = lazy(() => import('./pages/LearnerProfilePage'));
const LearnerSecurityPage = lazy(() => import('./pages/LearnerSecurityPage'));

/**
 * The unified player (§E.2), mounted OUTSIDE `LearnerShell` deliberately.
 *
 * The shell exists to give a dashboard section its persistent furniture —
 * a section rail on desktop, the same sections in a drawer, a four-item
 * bottom bar, a breadcrumb trail. The player wants none of it: it brings
 * its own curriculum rail, its own back link and its own single action
 * bar, and stacking the dashboard's navigation around all three would put
 * two rails on one screen and a fixed bottom bar over the action bar the
 * learner is meant to use. §E.6's "mobile bottom nav hidden inside the
 * player" is therefore satisfied structurally here rather than by a rule
 * — and `useLearnerBottomNavVisibility` keeps that rule anyway, as the
 * second line of defence for any player screen a later phase does mount
 * inside the shell.
 */
const LearnerPlayerPage = lazy(() => import('./pages/LearnerPlayerPage'));

export interface LearnerRouterProps {
  /** The academy this dashboard belongs to, from the resolved hostname. */
  readonly academyId: string;
  readonly locale: PublicWebsiteLocale;
  /**
   * Turns a bare `LEARNER_ROUTES` path into a real href on this host.
   * Supplied by the public-website side (which owns the `/ar` prefix and
   * the dev-preview parameter) rather than rebuilt here — see
   * `LearnerSurface.context.tsx`.
   */
  readonly buildHref: (path: string) => string;
}

export function LearnerRouter({
  academyId,
  locale,
  buildHref,
}: LearnerRouterProps): JSX.Element {
  return (
    <LearnerSurfaceProvider
      academyId={academyId}
      locale={locale}
      buildHref={buildHref}
    >
      <Routes>
          {/* The player, ahead of the shell's own `courses/:courseId` so
              a deeper path is never swallowed by the course page. Its own
              Suspense boundary, because it is not inside the shell's. */}
          <Route
            path="courses/:courseId/learn/:lessonId"
            element={
              <Suspense fallback={<SectionLoader />}>
                <LearnerPlayerPage />
              </Suspense>
            }
          />
          <Route
            path="courses/:courseId/activities/:itemId"
            element={
              <Suspense fallback={<SectionLoader />}>
                <LearnerPlayerPage />
              </Suspense>
            }
          />

          {/* A layout route: the shell renders once and survives every
              move between sections, so the rail and the bottom bar do not
              unmount and remount (and re-announce) on each navigation. */}
          <Route element={<LearnerShell />}>
            <Route index element={<LearnerOverviewPage />} />
            <Route path="courses" element={<LearnerCoursesPage />} />
            <Route
              path="courses/:courseId"
              element={<LearnerCourseProgressPage />}
            />
            <Route
              path="courses/:courseId/checkout"
              element={<CourseCheckoutPage />}
            />
            <Route path="assessments" element={<LearnerAssessmentsPage />} />
            <Route path="certificates" element={<LearnerCertificatesPage />} />
            <Route path="purchases" element={<LearnerPurchasesPage />} />
            <Route path="devices" element={<LearnerDevicesPage />} />
            <Route
              path="notifications"
              element={<LearnerNotificationsPage />}
            />
            <Route path="profile" element={<LearnerProfilePage />} />
            <Route path="security" element={<LearnerSecurityPage />} />

            {/* An unknown `/my/...` path is a learner's mistyped or stale
                bookmark, not a missing website page — the academy's own
                404 would be the wrong answer, and the CMS catch-all never
                sees these paths anyway. Send them to their overview. */}
            <Route
              path="*"
              element={<Navigate to={buildHref(LEARNER_ROUTES.root)} replace />}
            />
        </Route>
      </Routes>
    </LearnerSurfaceProvider>
  );
}

/** Default export so the academy website can `lazy()`-load this whole tree. */
export default LearnerRouter;
