/**
 * Course wizard steps (W6) — order, URL parsing and REAL completion.
 *
 * The step lives in the URL (`?step=`), so a refresh, a shared link or
 * "Continue setup" lands on the same step. Completion is derived from the
 * saved course and the server's publish-readiness verdict — never from
 * local "visited" state — so the stepper tells the truth after a refresh,
 * in another tab, or after an edit made on the classic builder pages.
 */
import type { Course, CoursePublishReadiness } from '@types';

export const COURSE_WIZARD_STEPS = [
  'basics',
  'details',
  'media',
  'curriculum',
  'assessments',
  'pricing',
  'review',
  'publish',
] as const;

export type CourseWizardStep = (typeof COURSE_WIZARD_STEPS)[number];

/** `complete`/`incomplete` from data; `optional` for a step that may stay empty. */
export type CourseWizardStepState = 'complete' | 'incomplete' | 'optional';

export type CourseWizardStepStates = Readonly<
  Record<CourseWizardStep, CourseWizardStepState>
>;

export function isCourseWizardStep(value: unknown): value is CourseWizardStep {
  return (
    typeof value === 'string' &&
    (COURSE_WIZARD_STEPS as readonly string[]).includes(value)
  );
}

/** `?step=` → a step, or null when absent/unknown (the page then picks one). */
export function parseCourseWizardStep(
  value: string | null | undefined
): CourseWizardStep | null {
  return isCourseWizardStep(value) ? value : null;
}

export function stepIndex(step: CourseWizardStep): number {
  return COURSE_WIZARD_STEPS.indexOf(step);
}

export function nextCourseWizardStep(
  step: CourseWizardStep
): CourseWizardStep | null {
  return COURSE_WIZARD_STEPS[stepIndex(step) + 1] ?? null;
}

export function previousCourseWizardStep(
  step: CourseWizardStep
): CourseWizardStep | null {
  const index = stepIndex(step);
  return index > 0 ? COURSE_WIZARD_STEPS[index - 1] : null;
}

function present(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Each step's state from saved data. Before the course exists (create),
 * every step is incomplete. Readiness may still be loading; the curriculum
 * and assessment steps then fall back to the course's own counts.
 */
export function deriveCourseWizardStepStates(
  course: Course | undefined,
  readiness: CoursePublishReadiness | undefined
): CourseWizardStepStates {
  if (!course) {
    return {
      basics: 'incomplete',
      details: 'incomplete',
      media: 'incomplete',
      curriculum: 'incomplete',
      assessments: 'optional',
      pricing: 'incomplete',
      review: 'incomplete',
      publish: 'incomplete',
    };
  }

  const counts = readiness?.counts;
  const curriculumDone = counts
    ? counts.sections > 0 && counts.emptySections < counts.sections
    : (course.stats?.totalSections ?? 0) > 0 &&
      (course.stats?.totalLessons ?? 0) > 0;
  const hasAssessments = counts
    ? counts.quizzes + counts.assignments > 0
    : false;
  const pricingDone =
    course.pricing.type === 'free' ||
    ((course.pricing.amount ?? 0) > 0 && present(course.pricing.currency));

  const state = (done: boolean): CourseWizardStepState =>
    done ? 'complete' : 'incomplete';

  return {
    basics: state(present(course.title) && present(course.slug)),
    details: state(present(course.description)),
    media: state(present(course.thumbnail)),
    curriculum: state(curriculumDone),
    assessments: hasAssessments ? 'complete' : 'optional',
    pricing: state(pricingDone),
    review: state(readiness?.ready === true),
    publish: state(course.status === 'published'),
  };
}

/** Where "Continue setup" resumes: the first step that is not done (optional steps are skipped). */
export function firstIncompleteCourseWizardStep(
  states: CourseWizardStepStates
): CourseWizardStep {
  return (
    COURSE_WIZARD_STEPS.find((step) => states[step] === 'incomplete') ??
    'publish'
  );
}
