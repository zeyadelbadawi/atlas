/**
 * Onboarding feature — public entry point.
 *
 * The shell page is a lazy route (`AppRouter` imports it directly), so it
 * is deliberately NOT re-exported here. What other features use is the
 * dashboard's "Set up your academy" card and the status read behind it.
 */
export { SetupChecklistCard } from './components/SetupChecklistCard';
export { useOnboardingStatus, useCompleteOnboarding } from './hooks';
export type { UseOnboardingStatusOptions } from './hooks';
export { onboardingService } from './services/OnboardingService';
