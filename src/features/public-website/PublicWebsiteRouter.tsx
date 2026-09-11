/**
 * Public Website Router (Prompt 11).
 *
 * The entire public-runtime route tree — mounted by `AppRouter` INSTEAD
 * OF the normal dashboard/auth/marketing tree whenever
 * `resolvePublicWebsiteContext` decides the current hostname is an
 * Academy website, never alongside it (so there is no path collision
 * with Atlas's own `/` marketing route — see `Reports/ARCHITECTURE.md`,
 * Prompt 11, "Public Runtime Mounting").
 *
 * There is exactly one data-driven catch-all page route: which
 * `WebsitePage` renders is resolved from `pathname` at runtime
 * (`resolvePathToPage`), not from a fixed set of `<Route path>` entries
 * — Custom Pages and the Home/About/Courses/FAQs/Contact core pages all
 * flow through the same one path, matching how they are genuinely
 * data, not compile-time routes.
 *
 * Phase 6 (Bilingual Academy Websites) — every Academy website is
 * bilingual by default, with English unprefixed (`/about`) and Arabic
 * under a `/ar` prefix (`/ar/about`), per `locale.constants.ts`'s own
 * routing decision. `/robots.txt`/`/sitemap.xml` are matched BEFORE the
 * locale split — they are site-wide infrastructure files, never
 * duplicated per locale.
 */
import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PublicWebsiteStatus } from './components/PublicWebsiteStatus';
import { PublicWebsitePage } from './components/PublicWebsitePage';
import { PublicWebsiteRobotsRoute } from './components/PublicWebsiteRobotsRoute';
import { PublicWebsiteSitemapRoute } from './components/PublicWebsiteSitemapRoute';
import { PublicWebsiteSignInPage } from './components/PublicWebsiteSignInPage';
import { PublicWebsiteSignUpPage } from './components/PublicWebsiteSignUpPage';
import { PublicWebsiteLearningRoute } from './components/PublicWebsiteLearningRoute';
import { usePublicWebsiteData } from './hooks/usePublicWebsiteData';
import type { PublicWebsiteContext } from './utils/hostname-resolution.utils';
import type { PublicWebsiteLocale } from '@types';

// The Student Learning experience, reused unmodified from
// `@features/learning`/`@features/profile` — see
// `PublicWebsiteLearningRoute`'s own doc comment for how these render
// inside this Academy's own branded chrome instead of the internal
// dashboard shell. Lazy so a visitor who never signs in never downloads
// this code.
const StudentMyLearningPage = lazy(
  () => import('@features/learning/pages/StudentMyLearningPage')
);
const StudentCourseDetailsPage = lazy(
  () => import('@features/learning/pages/StudentCourseDetailsPage')
);
const CourseLearnRedirectPage = lazy(
  () => import('@features/learning/pages/CourseLearnRedirectPage')
);
const LessonPage = lazy(() => import('@features/learning/pages/LessonPage'));
const QuizPage = lazy(() => import('@features/learning/pages/QuizPage'));
const AssignmentPage = lazy(
  () => import('@features/learning/pages/AssignmentPage')
);
const ProfilePage = lazy(() => import('@features/profile/pages/ProfilePage'));

export interface PublicWebsiteRouterProps {
  readonly context: Extract<PublicWebsiteContext, { mode: 'academy-website' }>;
}

/** `window.location.hostname` for a real subdomain/custom-domain visit (both cases the context's `value` already equals it); the dev-override slug in local development only. */
function resolveLookupKey(
  context: PublicWebsiteRouterProps['context']
): string {
  return context.lookupType === 'dev-override'
    ? context.value
    : window.location.hostname;
}

function PublicWebsiteShell({
  lookupKey,
  locale,
}: {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
}): JSX.Element {
  const data = usePublicWebsiteData(lookupKey);

  if (data.status !== 'ready') {
    return <PublicWebsiteStatus state={data} />;
  }

  return <PublicWebsitePage data={data} locale={locale} />;
}

/** One locale's worth of real page routes — mounted once for `en` (unprefixed) and once for `ar` (under `/ar`), see `PublicWebsiteRouter` below. */
function PublicWebsiteLocaleRoutes({
  lookupKey,
  locale,
}: {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
}): JSX.Element {
  return (
    <Routes>
      {/* Phase 1 (Extended Scope, Decision 11, dependency C) — two
          separate pages, matching the confirmed product requirement,
          reached before the data-driven catch-all so they are never
          shadowed by a Custom Page happening to share the same slug. */}
      <Route
        path="sign-in"
        element={
          <PublicWebsiteSignInPage lookupKey={lookupKey} locale={locale} />
        }
      />
      <Route
        path="sign-up"
        element={
          <PublicWebsiteSignUpPage lookupKey={lookupKey} locale={locale} />
        }
      />

      {/* Student Learning — the Academy-website-embedded LMS experience.
          Same "reached before the data-driven catch-all" precedent as
          sign-in/sign-up immediately above: an Academy that happens to
          have authored a Custom Page at one of these exact slugs would
          have it permanently shadowed, matching that already-accepted
          risk (never silently — the Pages list still shows the page,
          it's simply unreachable at this specific path). */}
      <Route
        path="my-learning"
        element={
          <PublicWebsiteLearningRoute lookupKey={lookupKey} locale={locale}>
            {({ academyId }) => <StudentMyLearningPage academyId={academyId} />}
          </PublicWebsiteLearningRoute>
        }
      />
      <Route
        path="my-learning/courses/:courseId"
        element={
          <PublicWebsiteLearningRoute lookupKey={lookupKey} locale={locale}>
            {() => <StudentCourseDetailsPage />}
          </PublicWebsiteLearningRoute>
        }
      />
      <Route
        path="my-learning/courses/:courseId/learn"
        element={
          <PublicWebsiteLearningRoute lookupKey={lookupKey} locale={locale}>
            {() => <CourseLearnRedirectPage />}
          </PublicWebsiteLearningRoute>
        }
      />
      <Route
        path="my-learning/courses/:courseId/learn/:lessonId"
        element={
          <PublicWebsiteLearningRoute lookupKey={lookupKey} locale={locale}>
            {() => <LessonPage />}
          </PublicWebsiteLearningRoute>
        }
      />
      <Route
        path="my-learning/courses/:courseId/quizzes/:quizId"
        element={
          <PublicWebsiteLearningRoute lookupKey={lookupKey} locale={locale}>
            {() => <QuizPage />}
          </PublicWebsiteLearningRoute>
        }
      />
      <Route
        path="my-learning/courses/:courseId/assignments/:assignmentId"
        element={
          <PublicWebsiteLearningRoute lookupKey={lookupKey} locale={locale}>
            {() => <AssignmentPage />}
          </PublicWebsiteLearningRoute>
        }
      />
      <Route
        path="my-account"
        element={
          <PublicWebsiteLearningRoute lookupKey={lookupKey} locale={locale}>
            {() => <ProfilePage />}
          </PublicWebsiteLearningRoute>
        }
      />

      <Route
        path="*"
        element={<PublicWebsiteShell lookupKey={lookupKey} locale={locale} />}
      />
    </Routes>
  );
}

export function PublicWebsiteRouter({
  context,
}: PublicWebsiteRouterProps): JSX.Element {
  const lookupKey = resolveLookupKey(context);

  return (
    <Routes>
      <Route
        path="/robots.txt"
        element={<PublicWebsiteRobotsRoute lookupKey={lookupKey} />}
      />
      <Route
        path="/sitemap.xml"
        element={<PublicWebsiteSitemapRoute lookupKey={lookupKey} />}
      />
      <Route
        path="/ar/*"
        element={
          <PublicWebsiteLocaleRoutes lookupKey={lookupKey} locale="ar" />
        }
      />
      <Route
        path="/*"
        element={
          <PublicWebsiteLocaleRoutes lookupKey={lookupKey} locale="en" />
        }
      />
    </Routes>
  );
}

/** Default export so `AppRouter` can `lazy()`-load this route tree exactly like every other top-level route component. */
export default PublicWebsiteRouter;
