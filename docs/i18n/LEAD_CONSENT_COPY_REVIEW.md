# Lead consent and attribution copy — review status (B0-SUP-04, B0-IAM-08, B0-ANL-04)

Every string below ships behind a feature flag that is **off** (`src/config/feature-flags.config.ts`:
`marketingContactConsent`, `ownerWhatsappConsent`, `signupAttribution`; server flags
`FLAG_CONTACT_CONSENT_MODE`, `FLAG_SIGNUP_WHATSAPP_CONSENT_MODE`, `FLAG_ATTRIBUTION_CAPTURE_MODE`).
No review below has passed.

| Status | Keys |
| --- | --- |
| **Consent wording: DRAFT pending counsel** (EN and AR). Wording version `contact-consent-2026-10-draft1` | `home:contact.consent.contactConsent`, `home:contact.consent.marketingConsent`, `home:contact.points.privacyWithConsent` |
| **Consent wording: DRAFT pending counsel** (EN and AR). Wording version `signup-whatsapp-consent-2026-10-draft1` | `auth:register.whatsappConsent` |
| **AR pending native review (RV-14)** — all Arabic values of the keys above and below | `home:contact.form.whatsapp*`, `home:contact.qualification.*`, `home:contact.errors.subjectTooLong`, `platform:organizations.ownerWhatsapp.*`, `platform:organizations.signupSource.*`, `platform:contactSubmissions.drawer.{leadTitle,whatsapp,contactConsent,marketingConsent,consentGiven,consentNotGiven}`, `platform:growth.*` |

When counsel approves a consent text, change the string **and** bump the wording version on both
sides (backend `CONTACT_CONSENT_WORDING_VERSION` / `SIGNUP_WHATSAPP_CONSENT_WORDING_VERSION`,
frontend mirrors in `features/home/utils/marketing-contact.ts` and
`features/auth/utils/owner-whatsapp-consent.ts`), so stored consents stay attributable to the text
the person saw. Then turn the flags on.
