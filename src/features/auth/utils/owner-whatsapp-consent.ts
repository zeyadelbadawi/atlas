/**
 * B0-IAM-08 — mirrors the backend's `SIGNUP_WHATSAPP_CONSENT_WORDING_VERSION`:
 * the version the SERVER stamps on an organization owner's WhatsApp opt-in
 * (the sign-up sends only `whatsappConsent: true`). Change both together
 * whenever `auth:register.whatsappConsent` changes. `draft1` — the wording
 * is a DRAFT pending counsel; the approved text ships as a new version.
 */
export const SIGNUP_WHATSAPP_CONSENT_WORDING_VERSION =
  'signup-whatsapp-consent-2026-10-draft1';
