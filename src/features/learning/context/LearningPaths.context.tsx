/**
 * Learning Paths Context.
 *
 * Every reused Student Learning page/component (`StudentMyLearningPage`,
 * `StudentCourseDetailsPage`, `CourseLearnRedirectPage`, `LessonPage`,
 * `QuizPage`, `AssignmentPage`, `CurriculumNav`, `LearningLayout`)
 * previously built its own internal navigation ("back to course", "next
 * lesson", "take this quiz") by hardcoding `DASHBOARD_ROUTES.learning*` +
 * `buildPath` — correct as long as these pages only ever render under
 * `/dashboard/learning/...`. Embedding the exact same pages inside an
 * Academy's public website (a real, separate route tree,
 * `PublicWebsiteRouter`) under a `/my-learning/...` prefix instead means
 * every one of those internal links must resolve differently depending on
 * WHERE the page is mounted — without forking any of the reused
 * components.
 *
 * This context is that seam: a small set of path-builder functions,
 * swappable for a locale-prefix-aware implementation
 * (`PublicWebsiteLearningRoute`, `features/public-website/`) when mounted
 * under the Academy website.
 *
 * P64 Phase 2 (D2 / AD-12) — the default below no longer describes
 * `/dashboard/learning/...`, because those routes no longer exist: the
 * learner surface is the academy website, full stop. What the default
 * describes now is that same surface in its plainest form — English, no
 * `/ar` prefix, no dev-preview query param — which is precisely what the
 * website provider then re-expresses through `buildHref`. It is a
 * fallback, not a second surface: every real mount supplies the provider.
 *
 * `courses()` is deliberately NOT "my courses" — inside one Academy's own
 * website, "browse more courses" means that Academy's own public Courses
 * page, never a cross-tenant catalog of every Academy's courses (the
 * cross-Academy discovery catalog was a dashboard surface, and D2 retired
 * it with the rest of them). See `PublicWebsiteLearningRoute`'s own doc
 * comment.
 *
 * `discussions()` returns `undefined` when the current context has no
 * forum surface wired in (the website-embedded implementation, for now —
 * see that provider's doc comment) — every consumer treats `undefined` as
 * "hide this link," never as an error.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { LEARNER_ROUTES } from '@app/routes/route-paths';

export interface LearningPaths {
  readonly myLearning: () => string;
  readonly courses: () => string;
  readonly courseDetail: (courseId: string) => string;
  readonly courseLearn: (courseId: string) => string;
  readonly lesson: (courseId: string, lessonId: string) => string;
  readonly quiz: (courseId: string, quizId: string) => string;
  readonly assignment: (courseId: string, assignmentId: string) => string;
  readonly discussions: (courseId: string) => string | undefined;
  /** Where "sign in to continue" should send an unauthenticated visitor back to, once signed in. */
  readonly signIn: (returnTo: string) => string;
}

/**
 * The learner surface in its plainest form — see this file's doc comment.
 *
 * The activity paths still say `/my-learning/courses/...` because that is
 * where the player genuinely still lives: Phase 2 §E.1 moved the DASHBOARD
 * to `/my/*`, and §E.2's unified player has not moved yet. Pointing them at
 * a `/my/*` URL that nothing serves would trade a working link for a broken
 * one, so they move when the player does, not before.
 */
export const LEARNER_SURFACE_PATHS: LearningPaths = {
  myLearning: () => LEARNER_ROUTES.courses,
  courses: () => '/courses',
  courseDetail: (courseId) => `/my-learning/courses/${courseId}`,
  courseLearn: (courseId) => `/my-learning/courses/${courseId}/learn`,
  lesson: (courseId, lessonId) =>
    `/my-learning/courses/${courseId}/learn/${lessonId}`,
  quiz: (courseId, quizId) =>
    `/my-learning/courses/${courseId}/quizzes/${quizId}`,
  assignment: (courseId, assignmentId) =>
    `/my-learning/courses/${courseId}/assignments/${assignmentId}`,
  discussions: () => undefined,
  signIn: (returnTo) => `/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
};

const LearningPathsContext = createContext<LearningPaths>(
  LEARNER_SURFACE_PATHS
);

export interface LearningPathsProviderProps {
  readonly paths: LearningPaths;
  readonly children: ReactNode;
}

export function LearningPathsProvider({
  paths,
  children,
}: LearningPathsProviderProps): JSX.Element {
  return (
    <LearningPathsContext.Provider value={paths}>
      {children}
    </LearningPathsContext.Provider>
  );
}

export function useLearningPaths(): LearningPaths {
  return useContext(LearningPathsContext);
}
