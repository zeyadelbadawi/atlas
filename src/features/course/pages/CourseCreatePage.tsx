/**
 * Course Create Page.
 *
 * W6 — "Create Course" now opens the guided course wizard at its first
 * step (Basics): the draft is created there, idempotently, and the
 * wizard continues at `…/courses/:courseId/setup?step=details`. The
 * classic one-page form (`CourseCreateForm`) is still exported for the
 * New Customer Onboarding shell's first-course step.
 */
import CourseWizardPage from './CourseWizardPage';

export default function CourseCreatePage(): JSX.Element {
  return <CourseWizardPage />;
}
