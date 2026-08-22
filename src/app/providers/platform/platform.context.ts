/**
 * Platform context.
 *
 * Owns global platform state that persists across the application but is not
 * tied to a specific feature: active organization, feature flags and user preferences.
 */
import { createContext } from 'react';
import type { PlatformState, FeatureFlagState } from '@types';

export interface PlatformContextValue {
  /** The current platform state. */
  readonly state: PlatformState;

  /** Updates the platform state. */
  readonly updateState: (updates: Partial<PlatformState>) => void;

  /** The active organization ID, if any. */
  readonly activeOrganizationId: string | undefined;

  /** Sets the active organization. */
  readonly setActiveOrganization: (organizationId: string | undefined) => void;

  /** The active academy ID, if any. */
  readonly activeAcademyId: string | undefined;

  /** Sets the active academy. */
  readonly setActiveAcademy: (academyId: string | undefined) => void;

  /** Feature flags state. */
  readonly featureFlags: FeatureFlagState;

  /** Checks whether a feature flag is enabled. */
  readonly isFeatureEnabled: (flagKey: string) => boolean;
}

export const PlatformContext = createContext<PlatformContextValue | undefined>(
  undefined
);

PlatformContext.displayName = 'PlatformContext';