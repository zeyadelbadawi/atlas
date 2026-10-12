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
  /**
   * Customer-facing Live Sessions (the add-on's tenant/academy UI:
   * navigation, session management, student join). Implemented but its
   * customer launch is DEFERRED pending external Zoom approvals — see
   * docs/live-sessions/LIVE_SESSIONS_STATUS.md. Flip to `true` to re-open.
   * NOTE: this gates only the CUSTOMER surfaces; the Platform Owner Zoom
   * Operations Center is a separate, platform-owner-only area and is not
   * gated by this flag.
   */
  liveSessions: false,
  /**
   * B0-WEB-07 — academy blog posts and course discussion threads can be
   * written by staff, but nothing shows them to visitors or learners yet
   * (no public blog route, no learner forum screen). While `false`, the
   * entry points that invite that authoring are hidden; the APIs, pages
   * and data are kept. Flip to `true` when a reader surface ships.
   */
  academyBlogAndForum: false,
  /**
   * B0-MED-02 / B0-MED-04 — academies cannot upload or author hosted video
   * yet (lessons use YouTube links). While `false`, no customer screen
   * offers a video tier choice or shows a video storage allowance; the
   * catalog keeps its stored limits. Flip to `true` when authoring ships.
   */
  hostedVideoAuthoring: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/** Returns whether a flag is enabled for the current deployment. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
