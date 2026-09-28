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
  /**
   * LEGACY — where builds before the production-readiness pass kept the
   * access and refresh tokens. Now only ever READ once (to convert that
   * session into the HttpOnly cookie) and then deleted; never written.
   */
  legacyAuthTokens: 'atlas:auth-tokens',
  /**
   * Non-secret hint "this browser probably has a session cookie here", so an
   * anonymous visitor's page load does not call `/auth/refresh` for nothing.
   * Holds '1' — never a token.
   */
  sessionHint: 'atlas:session',
  /** Active organization ID: string. */
  activeOrganization: 'atlas:active-organization',
  /** Active academy ID: string. */
  activeAcademy: 'atlas:active-academy',
  /** Feature flags: JSON-serialized FeatureFlagState. */
  featureFlags: 'atlas:feature-flags',
  /** User preferences: JSON-serialized PlatformPreferences. */
  userPreferences: 'atlas:user-preferences',
  /**
   * First factor of the latest session minted in this browser:
   * 'password' | 'google'. Only the sign-in pages' "Last used" hint reads
   * it; written from a session response, never from a click. Kept across
   * sign-out on purpose — that is when the hint is shown.
   */
  lastAuthMethod: 'atlas:last-auth-method',
} as const);

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
