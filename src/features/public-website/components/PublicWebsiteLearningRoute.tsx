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
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
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
import {
  usePublicWebsiteLinkRenderer,
  usePublicWebsiteHrefBuilder,
} from '../utils/public-website-link-renderer';
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
  const linkRenderer = usePublicWebsiteLinkRenderer(locale);
  // Locale- and dev-preview-aware path builder — see
  // `usePublicWebsiteHrefBuilder`'s own doc comment. Every path this file
  // hands to `LearningPathsProvider`/`onNavigate`/the sign-in redirect
  // goes through this one function (consumed via plain `navigate()`, not
  // `linkRenderer` — `LearningPaths` never touches CMS nav), so every one
  // of them gets the same locale/dev-param handling for free.
  const buildHref = usePublicWebsiteHrefBuilder(locale);

  if (data.status !== 'ready') {
    return <PublicWebsiteStatus state={data} />;
  }

  const { academy, configuration, pages } = data;
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
        to={buildHref(`/sign-in?returnTo=${encodeURIComponent(unprefixedPathname)}`)}
        replace
        state={{ from: unprefixedPathname }}
      />
    );
  }

  const authState = session.user
    ? {
        name: session.user.name,
        onSignOut: () => void signOut(),
        // Bare path — `linkRenderer` (via `WebsiteHeader`) applies the
        // locale prefix itself; pre-applying it here too would double it.
        myLearningHref: '/my-learning',
      }
    : undefined;

  const onNavigate = (pageId: string) => {
    const target = pages.find((candidate) => candidate.id === pageId);
    const path = target ? resolvePagePath(target) : undefined;
    if (path) navigate(buildHref(path));
  };

  const websiteLearningPaths: LearningPaths = {
    myLearning: () => buildHref('/my-learning'),
    courses: () => buildHref('/courses'),
    courseDetail: (courseId) => buildHref(`/my-learning/courses/${courseId}`),
    courseLearn: (courseId) => buildHref(`/my-learning/courses/${courseId}/learn`),
    lesson: (courseId, lessonId) =>
      buildHref(`/my-learning/courses/${courseId}/learn/${lessonId}`),
    quiz: (courseId, quizId) =>
      buildHref(`/my-learning/courses/${courseId}/quizzes/${quizId}`),
    assignment: (courseId, assignmentId) =>
      buildHref(`/my-learning/courses/${courseId}/assignments/${assignmentId}`),
    discussions: () => undefined,
    signIn: (returnTo) => buildHref(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`),
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
