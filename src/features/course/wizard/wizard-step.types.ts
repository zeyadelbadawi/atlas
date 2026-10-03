/**
 * What the wizard page hands every step (W6).
 */
import type { Course, CoursePublishReadiness } from '@types';
import type { CourseWizardStep } from './course-wizard.steps';

export interface WizardStepProps {
  readonly academyId: string;
  readonly course: Course;
  readonly readiness?: CoursePublishReadiness;
  readonly readinessLoading?: boolean;
  readonly readinessError?: boolean;
  readonly onRetryReadiness?: () => void;
  /** Absent on the first step. Never saves; the page guards unsaved edits. */
  readonly onBack?: () => void;
  /** Move to the next step — call it AFTER the step's own save succeeded. */
  readonly onNext: () => void;
  readonly goToStep: (step: CourseWizardStep) => void;
}
