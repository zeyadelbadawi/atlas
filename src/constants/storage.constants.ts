/**
 * Storage keys.
 *
 * Centralized key registry for localStorage and sessionStorage. Every persisted
 * value must declare its key here to avoid collisions.
 */

/** localStorage keys. */
export const STORAGE_KEYS = Object.freeze({
  /** Theme preference: 'light' | 'dark' | 'system'. */
  theme: 'atlas:theme',
  /** Language code: 'en' | 'ar'. */
  language: 'atlas:language',
  /** Dashboard sidebar collapsed state: boolean. */
  sidebarCollapsed: 'atlas:sidebar-collapsed',
  /** Authentication tokens: JSON-serialized TokenMetadata. */
  authTokens: 'atlas:auth-tokens',
  /** Active organization ID: string. */
  activeOrganization: 'atlas:active-organization',
  /** Active academy ID: string. */
  activeAcademy: 'atlas:active-academy',
  /** Feature flags: JSON-serialized FeatureFlagState. */
  featureFlags: 'atlas:feature-flags',
  /** User preferences: JSON-serialized PlatformPreferences. */
  userPreferences: 'atlas:user-preferences',
} as const);

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];