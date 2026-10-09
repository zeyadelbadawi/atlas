# Phone number — frontend

Decisions, API, security model and the WhatsApp verification research live in
the backend twin: `atlas-backend/docs/USER_PHONE.md`. This page covers the UI.

## Where it appears

| Place | What |
| --- | --- |
| Sign-up (`RegistrationForm`) — management **and** academy-website learner sign-up | Required "Mobile number" field after the email. Sends `phoneNumber` (as typed, tidied to national format on blur) + `phoneCountry`. Server violations land on the field (`useServerValidation`). |
| Dashboard profile (`/dashboard/profile`, Personal tab) and learner profile (`/my/profile`, Personal tab) | `ProfilePhoneCard`: view, add, change, remove (with confirmation). Status "Not verified" + "Verification by SMS or WhatsApp is coming soon" — no fake badge, no dead "Verify" button. A verified number (future) shows "Verified" and warns that a new number must be verified again. |
| Dashboard overview and learner overview | `PhoneNumberPrompt`: shown only when the account has no number; links to the profile editor (`?phone=add`); "Not now" hides it for 30 days in this browser (`localStorage`, one timestamp per account id, wrapped in try/catch). |

Google sign-up collects no number; those accounts get the prompt.

## Components — `src/shared/components/phone/`

- `phone-number.ts` — client rule mirroring the server: Arabic-Indic digits
  accepted, allowed characters only, ≤ 32 chars, valid **mobile** number
  (`libphonenumber-js/mobile` metadata), number must belong to the chosen
  country. `impliedCountry` switches the selector for an international number
  (`+966…`, pasted/autofilled) or a same-calling-code country (US/CA).
  `defaultPhoneCountry`: browser time zone → country for the served markets,
  else Egypt (the UI language region is not used: `en-US` is many people's
  default outside the US). Country names from `Intl.DisplayNames` in the
  interface language; search folds case, Latin diacritics and Arabic letter
  variants and matches Arabic name, English name, ISO code and calling code.
- `PhoneNumberInput` — Radix Popover + `cmdk` list (type to filter, arrows,
  Enter, Escape returns focus to the button), `type="tel"`,
  `autoComplete="tel"`, per-country example placeholder.
- `PhoneField` — react-hook-form wiring (two fields), label/hint/error with
  correct `aria-describedby`.
- `PhoneNumberDisplay` — `+20 10 01234567`, plain text.
- `CountryFlag` + `flag-loader` — SVG flags as `<img src="data:…">`.

## RTL

Only the number control (calling-code button + input) and the displayed
number are `dir="ltr"` with `data-ltr-content`; the calling code therefore
precedes the number in Arabic too, as the number is read. Labels, hints,
errors and the country list follow the page direction (the popover takes the
interface language's `dir`). Checked in Chromium at 390 px, EN and AR: no
horizontal scroll.

## Privacy

The number is never on `CurrentUser`. Query key `['user','phone']`
(`userKeys.phone()`) is outside the offline persistence allowlist (a test pins
it), carries `meta.persistOffline: false`, and is cleared with every other
query at sign-out.

## Dependencies and bundle

| Package | Version | Licence | Cost |
| --- | --- | --- | --- |
| `libphonenumber-js` | 1.13.11 (exact; same as the backend, so both share metadata) | MIT | Mobile metadata + examples land in the sign-up/profile route chunk: ~180 KB raw / ~45 KB gzip. Not in the app entry or the dashboard overview. |
| `country-flag-icons` | 1.6.20 (exact) | MIT | All flags as one **lazy** chunk (~182 KB raw / ~49 KB gzip), fetched the first time a phone field renders; covers all 245 libphonenumber countries. |

Emoji flags are not used (Windows renders them as letters).
