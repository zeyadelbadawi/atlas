/**
 * Pure readers over `OnboardingStatusResponse`.
 *
 * Nothing here DECIDES a status — each helper only looks up what the
 * backend already derived, so the shell, the summary and the dashboard
 * card cannot drift from one another or from the API.
 */
import type {
  OnboardingScreenKey,
  OnboardingStatusResponse,
  OnboardingStep,
  OnboardingStepKey,
} from '@types';
import {
  DASHBOARD_ROUTES,
  ONBOARDING_ROUTES,
  buildPath,
} from '@app/routes/route-paths';
import {
  ONBOARDING_ALL_STEPS,
  ONBOARDING_SCREEN_KEYS,
  ONBOARDING_STEP_ORDER,
} from '../constants/onboarding.constants';
import { isAcademyBuildActive } from './academy-build-timer';

export function findStep(
  status: OnboardingStatusResponse,
  key: OnboardingStepKey
): OnboardingStep | undefined {
  return status.steps.find((step) => step.key === key);
}

export function isStepComplete(
  status: OnboardingStatusResponse,
  key: OnboardingStepKey
): boolean {
  return findStep(status, key)?.status === 'complete';
}

/**
 * The steps the rail shows, in UI order. The plan step disappears once it
 * is complete — a customer already on a trial has nothing to do there —
 * and a step the backend did not report is never invented.
 */
export function visibleSteps(
  status: OnboardingStatusResponse
): readonly OnboardingStep[] {
  return ONBOARDING_STEP_ORDER.flatMap((key) => {
    const step = findStep(status, key);
    if (!step) return [];
    if (key === 'plan' && step.status === 'complete') return [];
    return [step];
  });
}

/** The screens the shell can navigate between, in order, summary last. */
export function visibleScreens(
  status: OnboardingStatusResponse
): readonly OnboardingScreenKey[] {
  return [...visibleSteps(status).map((step) => step.key), 'summary'];
}

export function isOnboardingScreenKey(
  value: string | undefined
): value is OnboardingScreenKey {
  return (
    value !== undefined &&
    (ONBOARDING_SCREEN_KEYS as readonly string[]).includes(value)
  );
}

/**
 * Where `/onboarding` resumes: the server's `nextStep`, unless that step has
 * no screen of its own (`branding`) — then the first visible screen after it
 * in the server's order. While this device is still showing the academy
 * build, it resumes there rather than skipping past it.
 */
export function resumeScreen(
  status: OnboardingStatusResponse
): OnboardingScreenKey {
  if (isAcademyBuildActive(status.provisioning?.requestId ?? undefined)) {
    return 'academy';
  }
  const screens = visibleScreens(status);
  if (screens.includes(status.nextStep)) return status.nextStep;
  const start = ONBOARDING_ALL_STEPS.indexOf(
    status.nextStep as OnboardingStepKey
  );
  for (const key of ONBOARDING_ALL_STEPS.slice(start + 1)) {
    if (screens.includes(key) && findStep(status, key)?.status !== 'complete') {
      return key;
    }
  }
  return 'summary';
}

/** The screen after `current` in UI order, or the summary. */
export function nextScreen(
  status: OnboardingStatusResponse,
  current: OnboardingScreenKey
): OnboardingScreenKey {
  const screens = visibleScreens(status);
  const index = screens.indexOf(current);
  return index >= 0 && index < screens.length - 1
    ? screens[index + 1]
    : 'summary';
}

/** The screen before `current` in UI order, if any. */
export function previousScreen(
  status: OnboardingStatusResponse,
  current: OnboardingScreenKey
): OnboardingScreenKey | undefined {
  const screens = visibleScreens(status);
  const index = screens.indexOf(current);
  return index > 0 ? screens[index - 1] : undefined;
}

/** Required (and prerequisite) steps that are not complete — what "N required steps left" counts. */
export function openRequiredSteps(
  status: OnboardingStatusResponse
): readonly OnboardingStep[] {
  return status.steps.filter(
    (step) => step.requirement !== 'recommended' && step.status !== 'complete'
  );
}

/** Recommended steps that are not complete. */
export function openRecommendedSteps(
  status: OnboardingStatusResponse
): readonly OnboardingStep[] {
  return status.steps.filter(
    (step) => step.requirement === 'recommended' && step.status !== 'complete'
  );
}

/** Whether the status should be re-read on a timer: the server is still working on something. */
export function isAwaitingServer(
  status: OnboardingStatusResponse | undefined
): boolean {
  if (!status) return false;
  return (
    findStep(status, 'academy')?.status === 'in_progress' ||
    findStep(status, 'plan')?.status === 'awaiting_confirmation'
  );
}

/**
 * A plan's EXISTING checkout (the same path `PlansPage` starts:
 * `targetType=plan_subscription`), with `?returnTo=/onboarding` so the
 * checkout can offer "Back to setup". `/onboarding` resumes at whatever
 * step is next, which is where the owner wants to be after paying.
 */
export function buildPlanCheckoutPath(planKey: string): string {
  const checkout = buildPath(DASHBOARD_ROUTES.tenantBillingCheckout, {
    targetType: 'plan_subscription',
    targetKey: planKey,
  });
  return `${checkout}?returnTo=${encodeURIComponent(ONBOARDING_ROUTES.root)}`;
}
