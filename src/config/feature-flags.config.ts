/**
 * Feature flag infrastructure.
 *
 * Flags let a capability be enabled per deployment without duplicating code.
 * The registry is intentionally empty of business flags: modules register their
 * own flags when they are implemented.
 */

/** Flags currently recognised by the platform shell. */
export const FEATURE_FLAGS = {
  /** Exposes the language switcher in the application shell. */
  languageSwitcher: true,
  /** Exposes the theme switcher in the application shell. */
  themeSwitcher: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/** Returns whether a flag is enabled for the current deployment. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}