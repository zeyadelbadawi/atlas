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
import { lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PublicWebsiteStatus } from './components/PublicWebsiteStatus';
import { AcademyComingSoon } from './components/AcademyComingSoon';
import { PublicWebsitePage } from './components/PublicWebsitePage';
import { PublicWebsiteRobotsRoute } from './components/PublicWebsiteRobotsRoute';
import { PublicWebsiteSitemapRoute } from './components/PublicWebsiteSitemapRoute';
import { PublicWebsiteSignInPage } from './components/PublicWebsiteSignInPage';
import { PublicWebsiteSignUpPage } from './components/PublicWebsiteSignUpPage';
import { PublicWebsiteForgotPasswordPage } from './components/PublicWebsiteForgotPasswordPage';
import { PublicWebsiteResetPasswordPage } from './components/PublicWebsiteResetPasswordPage';
import { PublicWebsiteVerifyEmailPage } from './components/PublicWebsiteVerifyEmailPage';
import { PublicWebsiteLearningRoute } from './components/PublicWebsiteLearningRoute';
import { PublicWebsiteRedirect } from './components/PublicWebsiteRedirect';
import { usePublicWebsiteData } from './hooks/usePublicWebsiteData';
import { RETIRED_ACADEMY_LEARNER_ROUTES } from '@app/routes/route-paths';
import type { PublicWebsiteContext } from './utils/hostname-resolution.utils';
import {
  probeHostAnswers,
  resolveCanonicalRedirect,
} from './utils/canonical-redirect.utils';
import { ENV } from '@config';
import type { PublicWebsiteLocale } from '@types';

// The Student Learning experience, reused unmodified from
// `@features/learning` — see `PublicWebsiteLearningRoute`'s own doc
// comment for how these render inside this Academy's own branded chrome
// instead of the internal dashboard shell. Lazy so a visitor who never
// signs in never downloads this code.
//
// P64 Phase 2 §E.1 — what is left here is the PLAYER (course details, the
// lesson/quiz/assignment activities), which §E.2 moves on its own
// schedule. The two pages that were the learner's dashboard —
// `StudentMyLearningPage` at `/my-learning` and the shared `ProfilePage`
// at `/my-account` — are gone from this tree: those URLs now redirect into
// `/my/*`, where the learner dashboard owns both.
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
// P64 Phase 2 §E.1 — the learner dashboard: one lazy chunk for the whole
// `/my/*` tree, which then splits again per section (`LearnerRouter`). A
// visitor who never signs in never downloads any of it.
const LearnerRouter = lazy(() => import('@features/learner/LearnerRouter'));

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

/**
 * P63 — once the hostname has resolved, a visitor on the non-canonical
 * host (e.g. the Atlas subdomain of an Academy whose custom domain is
 * connected) is moved to the canonical one. `replace`, not `assign`, so the
 * non-canonical URL does not linger in history. Runs only in production
 * builds; local development keeps whatever host it is on.
 */
function useCanonicalHostRedirect(canonicalHost: string | undefined): void {
  useEffect(() => {
    const target = resolveCanonicalRedirect(
      window.location,
      canonicalHost,
      ENV.isDevelopment
    );
    if (!target) return;
    // P63g — never bounce a visitor from a working host to a dead one: the
    // server names the canonical host from its last check, which can be up
    // to a sweep interval old. Confirm the target answers first; if it does
    // not, stay on the host that is serving this visitor right now.
    let cancelled = false;
    void probeHostAnswers(target).then((answers) => {
      if (!cancelled && answers) window.location.replace(target);
    });
    return () => {
      cancelled = true;
    };
  }, [canonicalHost]);
}

function PublicWebsiteShell({
  lookupKey,
  locale,
}: {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
}): JSX.Element {
  const data = usePublicWebsiteData(lookupKey);
  const academy =
    data.status === 'ready' || data.status === 'unpublished'
      ? data.academy
      : undefined;
  useCanonicalHostRedirect(academy?.canonicalHost);

  // An Academy that exists but has not published its website is a normal
  // product state, not a failure — it gets a branded Coming Soon page
  // rather than the outage screen. Every other non-ready state still goes
  // through `PublicWebsiteStatus`, so a genuine platform failure is still
  // reported as one.
  if (data.status === 'unpublished') {
    return <AcademyComingSoon academy={data.academy} locale={locale} />;
  }

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

      {/* P64 Phase 1 — the rest of the account-recovery/verification set,
          on the academy host itself. Atlas's own `/auth/*` tree is not
          mounted here at all (`AppRouter` swaps the entire route tree for
          an academy hostname), so before this a "Forgot password?" click
          and every emailed reset/verification link on an academy domain
          fell through to the CMS catch-all and rendered "page not found".
          Mounted inside `PublicWebsiteLocaleRoutes`, so each exists in
          both the `/` (English) and `/ar/` trees, and — like sign-in and
          sign-up — ahead of the data-driven catch-all so a Custom Page
          sharing one of these slugs can never shadow account recovery. */}
      <Route
        path="forgot-password"
        element={
          <PublicWebsiteForgotPasswordPage
            lookupKey={lookupKey}
            locale={locale}
          />
        }
      />
      <Route
        path="reset-password"
        element={
          <PublicWebsiteResetPasswordPage
            lookupKey={lookupKey}
            locale={locale}
          />
        }
      />
      <Route
        path="verify-email"
        element={
          <PublicWebsiteVerifyEmailPage lookupKey={lookupKey} locale={locale} />
        }
      />

      {/* P64 Phase 2 §E.1 (D2 / AD-12) — THE learner surface. Reached
          before the data-driven catch-all for the same reason sign-in is:
          a Custom Page authored at one of these slugs must never be able
          to shadow a learner's own dashboard.

          `my/*`, not nine sibling routes: `LearnerRouter` owns the
          sections below it, so adding one is a change in that feature
          rather than a second edit here that someone will forget. */}
      <Route
        path="my/*"
        element={
          <PublicWebsiteLearningRoute lookupKey={lookupKey} locale={locale}>
            {({ academyId, buildHref }) => (
              <LearnerRouter
                academyId={academyId}
                locale={locale}
                buildHref={buildHref}
              />
            )}
          </PublicWebsiteLearningRoute>
        }
      />

      {/* The URLs the learner dashboard replaced. Bookmarked, emailed and
          linked from the academy's own chrome, so they keep answering —
          as permanent redirects, never as a second copy of the page. The
          table itself lives in `route-paths.ts` with every other path
          declaration (`RETIRED_ACADEMY_LEARNER_ROUTES`).

          Only the two exact paths D2 retired: the `/my-learning/courses/
          ...` activity URLs still serve the player, which Phase 2 §E.2
          moves on its own schedule. Redirecting them now would break a
          working screen to reach a page that does not exist yet. */}
      {RETIRED_ACADEMY_LEARNER_ROUTES.map(({ from, to }) => (
        <Route
          key={from}
          // Bare, because these are relative to this locale's subtree.
          path={from.replace(/^\//, '')}
          element={<PublicWebsiteRedirect to={to} locale={locale} />}
        />
      ))}

      {/* Student Learning — the Academy-website-embedded LMS experience,
          now the PLAYER half of it (§E.2 owns where these finally live;
          the dashboard half moved to `/my/*` above). Same "reached before
          the data-driven catch-all" precedent as sign-in/sign-up: an
          Academy that happens to have authored a Custom Page at one of
          these exact slugs would have it permanently shadowed, matching
          that already-accepted risk (never silently — the Pages list
          still shows the page, it's simply unreachable at this specific
          path). */}
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
