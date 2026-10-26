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
   * B0-MED-02 / B0-MED-04 / B0-MED-11 — hosted (Normal-tier) video. While
   * `false`, no customer screen offers a video tier choice, shows a video
   * storage allowance, or lets a Video lesson upload / pick an Atlas-hosted
   * video (lessons use YouTube links); the catalog keeps its stored limits.
   * The builder path is built (B0-MED-11). Flip to `true` only after the
   * owner enables the Normal tier in production and one upload → playback
   * with the watermark is verified (B0-OC-34). The order of steps is in
   * atlas-backend `docs/HOSTED_VIDEO_ACTIVATION_RUNBOOK.md`.
   */
  hostedVideoAuthoring: false,
  /**
   * B0-MED-11 — the Premium video tier (Cloudflare Stream) is not offered:
   * its provider is not onboarded and its server flag stays off. While
   * `false`, no screen shows a Premium video option — even after
   * `hostedVideoAuthoring` is turned on, the tier card offers Normal only.
   * Flip only together with the server's `FLAG_VIDEO_PREMIUM_MODE`.
   */
  hostedVideoPremium: false,
  /**
   * B0-SUP-04 — the marketing contact form's optional WhatsApp number, its
   * two separate, unticked consents (contact about this enquiry; marketing)
   * and the sales qualification fields. While `false` the form is exactly
   * as before. The consent wording is a DRAFT pending counsel: flip only
   * after counsel approves it, together with the server's
   * `FLAG_CONTACT_CONSENT_MODE=on` (the server stores nothing while off).
   */
  marketingContactConsent: false,
  /**
   * B0-IAM-08 — the unticked "Contact me on WhatsApp about my account and
   * setup" box on the ORGANIZATION OWNER sign-up only (never a learner
   * sign-up). DRAFT wording pending counsel; flip together with the
   * server's `FLAG_SIGNUP_WHATSAPP_CONSENT_MODE=on`.
   */
  ownerWhatsappConsent: false,
  /**
   * B0-ANL-04 — capture UTM values, the referrer host and the landing
   * template in memory (never browser storage) and send them with the
   * organization sign-up and the contact form. On since G1 (DL-67: counsel
   * approved the consent wording, 26 Oct 2026), together with the server's
   * `FLAG_ATTRIBUTION_CAPTURE_MODE=on`.
   */
  signupAttribution: true,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/** Returns whether a flag is enabled for the current deployment. */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
