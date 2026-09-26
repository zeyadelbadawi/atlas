/**
 * Provisioning feature — public entry point.
 *
 * Curated, not `export *`: the pages stay lazy routes. What other features
 * genuinely share is the academy setup form and the request/retry hooks —
 * the New Customer Onboarding shell creates the academy with the SAME form
 * and follows it with the SAME status polling as `ProvisioningStatusPage`.
 */
export { AcademySetupForm } from './components/AcademySetupForm';
export type { AcademySetupFormProps } from './components/AcademySetupForm';
export { useProvisioningRequest, useRetryProvisioning } from './hooks';
export type { RetryProvisioningVariables } from './hooks';
export { PROVISIONING_STEP_KEYS } from './constants/provisioning.constants';
