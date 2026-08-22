/**
 * Platform state types.
 *
 * These types describe global platform state that persists across the application
 * lifecycle but is not tied to a specific feature.
 */

/** The global platform state shape. */
export interface PlatformState {
  readonly activeOrganizationId?: string;
  readonly activeAcademyId?: string;
  readonly sidebarCollapsed: boolean;
  readonly featureFlags: FeatureFlagState;
  readonly userPreferences?: PlatformPreferences;
}

/** Feature flag evaluation state. */
export interface FeatureFlagState {
  readonly flags: Record<string, boolean>;
  readonly loading: boolean;
  readonly error?: string;
}

/** Platform-level user preferences. */
export interface PlatformPreferences {
  readonly compactMode: boolean;
  readonly showOnboarding: boolean;
  readonly recentSearches: readonly string[];
}

/** Feature flag evaluation context. */
export interface FeatureFlagContext {
  readonly userId?: string;
  readonly organizationId?: string;
  readonly environment: string;
}