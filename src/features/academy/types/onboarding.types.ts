/**
 * Academy onboarding types.
 *
 * Onboarding progress is a client-only concern — there is no backend contract
 * for it, so it is tracked entirely in local storage per academy and never
 * sent to a service.
 */

/** A single onboarding step definition. */
export interface AcademyOnboardingStep {
  readonly id: number;
  readonly titleKey: string;
  readonly descriptionKey: string;
  /**
   * Route template this step links to (e.g. the Branding page), or `undefined`
   * for steps that have no page of their own (welcome, completion).
   */
  readonly path?: string;
}

/** Per-academy onboarding progress, persisted client-side. */
export interface AcademyOnboardingState {
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
}
