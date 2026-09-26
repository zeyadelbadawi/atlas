/**
 * New Customer Onboarding — shell constants.
 *
 * The ORDER here is presentation only. What is complete, what is
 * required and which step comes next are the backend's answers
 * (`OnboardingStatusResponse.steps` / `nextStep`); this file only says in
 * which order the rail lists them and which ones may be skipped.
 */
import type { OnboardingScreenKey, OnboardingStepKey } from '@types';

/** The rail's order. `plan` is shown only while it is not complete. */
export const ONBOARDING_STEP_ORDER: readonly OnboardingStepKey[] = [
  'plan',
  'academy',
  'branding',
  'website',
  'course',
];

/** Every screen the shell can show, summary last. */
export const ONBOARDING_SCREEN_KEYS: readonly OnboardingScreenKey[] = [
  ...ONBOARDING_STEP_ORDER,
  'summary',
];

/**
 * The only steps with a Skip action (contract §4). Skipping stores
 * nothing — it only moves to the next screen; the step stays open on the
 * summary and the dashboard card.
 */
export const SKIPPABLE_STEPS: readonly OnboardingStepKey[] = [
  'branding',
  'course',
];

/**
 * How often the status is re-read while the server is still working on
 * something the owner is waiting for: the academy being provisioned, or a
 * submitted payment awaiting confirmation.
 */
export const ONBOARDING_STATUS_POLL_INTERVAL_MS = 4_000;

/**
 * Per-device, cosmetic preference: the owner hid the dashboard card while
 * only recommended items were left. Keyed by organization; never read as
 * completion.
 */
export const ONBOARDING_CARD_DISMISSED_STORAGE_PREFIX =
  'atlas:onboardingCardHidden:';
