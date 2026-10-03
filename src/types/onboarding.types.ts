/**
 * New Customer Onboarding types.
 *
 * The wire shapes of the onboarding contract (`onboarding-contract.md`
 * §3): the public sign-up options read by the one-page sign-up, and the
 * per-organization setup status the `/onboarding` shell and the dashboard
 * card are built from.
 *
 * EVERY FLAG HERE IS DERIVED BY THE BACKEND. Nothing in the frontend
 * decides that a step is complete, that the academy is "ready", or which
 * step comes next — those are the server's answers, re-read after every
 * change, so the setup screens and the API can never disagree.
 */
import type { PaymentLifecycleStatus } from './payment.types';
import type { Plan } from './plan.types';
import type { TenantSubscriptionStatus } from './tenant.types';

/** `GET /public/signup-options` — what the management sign-up page may offer. No authentication. */
export interface SignupOptionsResponse {
  /** `FLAG_SIGNUP_ORGANIZATION_MODE` is on: the sign-up page also creates an organization. */
  readonly organizationSignup: boolean;
  /** The platform trial policy is enabled. */
  readonly trialsEnabled: boolean;
  /**
   * Active, customer-facing, trial-eligible plans, ordered by
   * `displayOrder`. Always empty while `trialsEnabled` is false.
   */
  readonly trialPlans: readonly Plan[];
}

/** The setup steps, in the backend's vocabulary. */
export type OnboardingStepKey =
  'plan' | 'academy' | 'branding' | 'website' | 'course';

/** Where the shell can be: a real step, or the closing summary. */
export type OnboardingScreenKey = OnboardingStepKey | 'summary';

export type OnboardingStepStatus =
  | 'complete'
  | 'in_progress'
  | 'incomplete'
  | 'blocked'
  | 'awaiting_confirmation';

/** How much a step matters. `prerequisite` is the plan: nothing else can start without it. */
export type OnboardingStepRequirement =
  'prerequisite' | 'required' | 'recommended';

export interface OnboardingStep {
  readonly key: OnboardingStepKey;
  readonly requirement: OnboardingStepRequirement;
  readonly status: OnboardingStepStatus;
}

export interface OnboardingSubscriptionSummary {
  readonly status: TenantSubscriptionStatus;
  /** `null` while `no_plan`. */
  readonly planKey: string | null;
  readonly trialEndsAt: string | null;
  /** Policy enabled AND this organization never trialed AND this mailbox never redeemed. */
  readonly trialAvailable: boolean;
}

/** The latest payment of a `plan_subscription` checkout, when there is one. */
export interface OnboardingSubscriptionPayment {
  readonly id: string;
  readonly status: PaymentLifecycleStatus;
  readonly reviewStatus: string;
  /**
   * Why the payment failed, as a translatable `errors.…` message KEY
   * (e.g. `errors.payment.rejectedByReviewer`) — rendered through the
   * errors namespace, never printed raw.
   */
  readonly failureReason: string | null;
  /** The Platform Owner's rejection note, shown verbatim when present. */
  readonly reviewNotes: string | null;
  readonly planKey: string;
}

export interface OnboardingAcademySummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  /** The public host (`elzozo.atlas.app`), or `null` while none is allocated. */
  readonly host: string | null;
  readonly logoUrl: string | null;
}

export interface OnboardingProvisioningSummary {
  readonly requestId: string;
  readonly status: string;
  readonly currentStepKey: string | null;
  readonly failed: boolean;
}

/**
 * `GET /organizations/:id/onboarding` and the response of
 * `POST /organizations/:id/onboarding/complete`. Owner-only; any other
 * caller gets 403.
 */
export interface OnboardingStatusResponse {
  readonly organizationId: string;
  /** When setup was finished or deferred. `null` while pending. */
  readonly completedAt: string | null;
  readonly pending: boolean;
  /** Academy AND website are complete. */
  readonly requiredComplete: boolean;
  /** The ONLY permission to say "ready". Equal to `requiredComplete` today; read separately on purpose. */
  readonly readyLabelAllowed: boolean;
  readonly subscription: OnboardingSubscriptionSummary;
  readonly latestSubscriptionPayment: OnboardingSubscriptionPayment | null;
  readonly academy: OnboardingAcademySummary | null;
  readonly provisioning: OnboardingProvisioningSummary | null;
  readonly steps: readonly OnboardingStep[];
  readonly nextStep: OnboardingScreenKey;
}

/** `POST /organizations/:id/onboarding/complete`. `defer` is "Finish for now" and is always allowed. */
export interface CompleteOnboardingRequest {
  readonly mode: 'finish' | 'defer';
}
