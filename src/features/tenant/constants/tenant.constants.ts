/**
 * Tenant SaaS constants.
 *
 * Trial/grace-period duration live here as configuration, not as scattered
 * day-count literals — every place that needs to talk about "7 days" or
 * "3 days" reads these two constants.
 */
import type { PlanFeatureKey, PlanLimitKey, TrialPolicy } from '@types';

/**
 * The trial policy's INITIAL default value only.
 *
 * This is not a permanent business rule. It is consumed in exactly one
 * place — `useTrialPolicy`'s `initialData`, so `PlatformTrialPolicyPage`
 * renders its form immediately instead of flashing a loading skeleton on
 * every visit — and is marked stale immediately (`initialDataUpdatedAt: 0`)
 * so `PlanService.getTrialPolicy`'s real, Platform-Owner-configured answer
 * always fetches in the background and silently replaces it. No other
 * read of "is there a trial, and how long" goes through this constant.
 * A future Platform Owner can change `enabled`/`durationDays` — including
 * to `enabled: false` / `durationDays: 0` for "no trial" — without any
 * code change.
 */
export const DEFAULT_TRIAL_POLICY: TrialPolicy = Object.freeze({
  enabled: true,
  durationDays: 7,
});

/** Default grace-period configuration: 3 days after trial/subscription lapse. */
export const GRACE_PERIOD_CONFIG = Object.freeze({
  durationDays: 3,
});

/** Every resource limit key, in display order. */
export const PLAN_LIMIT_KEYS: readonly PlanLimitKey[] = [
  'academies',
  'instructors',
  'staff',
  'students',
  'courses',
  'generalStorage',
  'videoStorage',
];

/** Every feature entitlement key, in display order. */
export const PLAN_FEATURE_KEYS: readonly PlanFeatureKey[] = [
  'cms',
  'seo',
  'seoAdvanced',
  'marketing',
  'marketingAdvanced',
  'analytics',
  'analyticsAdvanced',
  'customDomain',
  'themes',
  'multipleThemes',
  'backup',
];

/** Limit keys measured in GB rather than a plain count. */
export const STORAGE_LIMIT_KEYS: readonly PlanLimitKey[] = [
  'generalStorage',
  'videoStorage',
];
