/**
 * Public Website Learning Route.
 *
 * The shared shell every Academy-website-embedded Student Learning route
 * (`/my-learning`, `/my-learning/courses/:courseId`, `.../learn`,
 * `.../learn/:lessonId`, `.../quizzes/:quizId`, `.../assignments/:id`,
 * `/my-account`) mounts through — matching `PublicWebsiteSignInPage`'s own
 * precedent exactly (fetch this Academy's real website data, render the
 * real `WebsiteChrome`, reuse the real session), but for an AUTHENTICATED-
 * ONLY surface: an unauthenticated visitor is redirected to this Academy's
 * own real Sign In page instead of seeing a form. Every one of the
 * reused `@features/learning` pages/components renders unmodified inside
 * `children(academyId)` — this file supplies the three things they need
 * that `/dashboard/learning/*` used to supply for free: the Academy's own
 * branded chrome, a locale-aware path-building implementation
 * (`LearningPathsProvider`), and `WebsiteBrandBridge` (`@features/website`)
 * so the existing shadcn Button/Card components those pages already use
 * render in the Academy's real brand color with zero per-component
 * changes — see that component's own doc comment for the full reasoning.
 *
 * `courses()` (see `LearningPaths.context.tsx`) intentionally resolves to
 * THIS Academy's own public Courses page, never the cross-Academy
 * `/dashboard/learning/courses` discovery catalog — that catalog is a
 * genuinely different, Atlas-cross-tenant surface with no natural home
 * inside one Academy's own branded website (see this Academy's own
 * Courses core page for that role instead). `discussions()` returns
 * `undefined` here — the Course Forum (`CourseForumPage`/
 * `ForumThreadPage`) is not wired into the Academy website in this pass;
 * every consumer of `LearningPaths.discussions` already treats
 * `undefined` as "hide this link," so this is a real, disclosed, but
 * non-breaking scope decision, not an oversight.
 */
import { useLocation, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth, useSignOut } from '@hooks';
import {
  WebsiteChrome,
  resolvePagePath,
  WebsiteBrandBridge,
  usePublicWebsiteDocumentDirection,
} from '@features/website';
import {
  LearningPathsProvider,
  type LearningPaths,
} from '@features/learning/context/LearningPaths.context';
import { usePublicWebsiteData } from '../hooks/usePublicWebsiteData';
import { PublicWebsiteStatus } from './PublicWebsiteStatus';
import { usePublicWebsiteLinkRenderer } from '../utils/public-website-link-renderer';
import { DEV_OVERRIDE_PARAM } from '../utils/hostname-resolution.utils';
import type { PublicWebsiteLocale } from '@types';

export interface PublicWebsiteLearningRouteProps {
  readonly lookupKey: string;
  readonly locale: PublicWebsiteLocale;
  readonly children: (context: { readonly academyId: string }) => React.ReactNode;
}

export function PublicWebsiteLearningRoute({
  lookupKey,
  locale,
  children,
}: PublicWebsiteLearningRouteProps): JSX.Element {
  // Matches `PublicWebsiteSignInPage`/`PublicWebsiteSignUpPage`'s identical
  // call — `WebsiteChrome` flips `dir` off the `locale` prop directly, but
  // every reused `@features/learning` page's own `t()` calls read the
  // shared i18next instance's ACTIVE language, which only this hook's
  // `i18n.changeLanguage(locale)` side effect ever changes. Omitting it
  // reproduced live as chrome/nav/footer correctly mirroring to Arabic
  // while every page's own copy ("My Learning", "Discover Courses", ...)
  // stayed in English.
  usePublicWebsiteDocumentDirection(locale);
  const data = usePublicWebsiteData(lookupKey);
  const { session } = useAuth();
  const { signOut } = useSignOut();
  const navigate = useNavigate();
  const location = useLocation();
  const linkRenderer = usePublicWebsiteLinkRenderer();
  const [searchParams] = useSearchParams();
  const devSlug = searchParams.get(DEV_OVERRIDE_PARAM);

  if (data.status !== 'ready') {
    return <PublicWebsiteStatus state={data} />;
  }

  const { academy, configuration, pages } = data;
  // Appends the dev-preview query param whenever it's already present —
  // see `usePublicWebsiteLinkRenderer`'s own doc comment for the exact
  // real bug this mirrors: client-side `navigate()` to a bare path drops
  // any existing query string, and in local dev the Academy's identity
  // lives in THIS param (a real subdomain/custom-domain deployment
  // carries it in the hostname instead and is entirely unaffected). Every
  // path this file hands to `LearningPathsProvider`/`onNavigate`/the
  // sign-in redirect goes through this one function, so every one of
  // them — not just page-to-page CMS nav — gets the same fix for free.
  const withLocale = (path: string): string => {
    const localized = locale === 'en' ? path : `/ar${path}`;
    if (!devSlug) return localized;
    const separator = localized.includes('?') ? '&' : '?';
    return `${localized}${separator}${DEV_OVERRIDE_PARAM}=${encodeURIComponent(devSlug)}`;
  };
  const unprefixedPathname =
    locale === 'en' ? location.pathname : location.pathname.replace(/^\/ar/, '') || '/';

  // Real, backend-enforced route protection, not a UI-hiding convenience:
  // every reused learning page/hook below assumes a real, authenticated
  // session (they call `JwtAuthGuard`-protected endpoints), so an
  // unauthenticated visitor is redirected to the real Sign In page —
  // never shown a broken/empty learning page — before any of them mount.
  // The backend independently re-enforces this on every single request
  // regardless of what the frontend does (see the completion report's
  // "Security/role-boundary validation" section).
  if (session.status !== 'authenticated') {
    return (
      <Navigate
        to={withLocale(`/sign-in?returnTo=${encodeURIComponent(unprefixedPathname)}`)}
        replace
        state={{ from: unprefixedPathname }}
      />
    );
  }

  const authState = session.user
    ? {
        name: session.user.name,
        onSignOut: () => void signOut(),
        myLearningHref: withLocale('/my-learning'),
      }
    : undefined;

  const onNavigate = (pageId: string) => {
    const target = pages.find((candidate) => candidate.id === pageId);
    const path = target ? resolvePagePath(target) : undefined;
    if (path) navigate(withLocale(path));
  };

  const websiteLearningPaths: LearningPaths = {
    myLearning: () => withLocale('/my-learning'),
    courses: () => withLocale('/courses'),
    courseDetail: (courseId) => withLocale(`/my-learning/courses/${courseId}`),
    courseLearn: (courseId) => withLocale(`/my-learning/courses/${courseId}/learn`),
    lesson: (courseId, lessonId) =>
      withLocale(`/my-learning/courses/${courseId}/learn/${lessonId}`),
    quiz: (courseId, quizId) =>
      withLocale(`/my-learning/courses/${courseId}/quizzes/${quizId}`),
    assignment: (courseId, assignmentId) =>
      withLocale(`/my-learning/courses/${courseId}/assignments/${assignmentId}`),
    discussions: () => undefined,
    signIn: (returnTo) => withLocale(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`),
  };

  return (
    <WebsiteChrome
      academyName={academy.academyName}
      academyLogo={academy.academyLogo}
      configuration={configuration}
      pages={pages}
      onNavigate={onNavigate}
      linkRenderer={linkRenderer}
      locale={locale}
      onLocaleChange={(target) =>
        navigate(`${target === 'en' ? unprefixedPathname : `/ar${unprefixedPathname}`}${location.search}`)
      }
      authState={authState}
    >
      <LearningPathsProvider paths={websiteLearningPaths}>
        <WebsiteBrandBridge>
          {children({ academyId: academy.academyId })}
        </WebsiteBrandBridge>
      </LearningPathsProvider>
    </WebsiteChrome>
  );
}
