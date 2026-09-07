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
 * defaulting to today's `/dashboard/learning/...` behaviour (so nothing
 * under `/dashboard` changes unless explicitly opted in), swappable for a
 * locale-prefix-aware `/my-learning/...` implementation
 * (`WebsiteLearningPathsProvider`, `features/public-website/`) when
 * mounted under the Academy website instead.
 *
 * `courses()` is deliberately NOT a 1:1 mapping of
 * `DASHBOARD_ROUTES.learningCourses` (the cross-Academy "Discover
 * Courses" catalog) — inside one Academy's own website, "browse more
 * courses" means that Academy's own public Courses page, not a
 * cross-tenant catalog of every Academy's courses. See
 * `WebsiteLearningPathsProvider`'s own doc comment.
 *
 * `discussions()` returns `undefined` when the current context has no
 * forum surface wired in (the website-embedded implementation, for now —
 * see that provider's doc comment) — every consumer treats `undefined` as
 * "hide this link," never as an error.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { AUTH_ROUTES, DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';

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

export const DASHBOARD_LEARNING_PATHS: LearningPaths = {
  myLearning: () => DASHBOARD_ROUTES.myLearning,
  courses: () => DASHBOARD_ROUTES.learningCourses,
  courseDetail: (courseId) =>
    buildPath(DASHBOARD_ROUTES.learningCourseDetail, { courseId }),
  courseLearn: (courseId) =>
    buildPath(DASHBOARD_ROUTES.learningCourseLearn, { courseId }),
  lesson: (courseId, lessonId) =>
    buildPath(DASHBOARD_ROUTES.learningLesson, { courseId, lessonId }),
  quiz: (courseId, quizId) =>
    buildPath(DASHBOARD_ROUTES.learningQuiz, { courseId, quizId }),
  assignment: (courseId, assignmentId) =>
    buildPath(DASHBOARD_ROUTES.learningAssignment, { courseId, assignmentId }),
  discussions: (courseId) =>
    buildPath(DASHBOARD_ROUTES.learningDiscussions, { courseId }),
  signIn: () => AUTH_ROUTES.signIn,
};

const LearningPathsContext = createContext<LearningPaths>(DASHBOARD_LEARNING_PATHS);

export interface LearningPathsProviderProps {
  readonly paths: LearningPaths;
  readonly children: ReactNode;
}

export function LearningPathsProvider({
  paths,
  children,
}: LearningPathsProviderProps): JSX.Element {
  return (
    <LearningPathsContext.Provider value={paths}>{children}</LearningPathsContext.Provider>
  );
}

export function useLearningPaths(): LearningPaths {
  return useContext(LearningPathsContext);
}
