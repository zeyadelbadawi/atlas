# B1 — Sign-up, sign-in, onboarding, profile, settings (Nov 2026)

Visual audit on a local stack (EN/AR, light/dark, 375 and 1280 px), every form submitted
wrong on purpose and every request forced to fail (400 with violations, 409, 429, 500,
network abort). 317 screenshots. **45 findings: 18 High, 16 Medium, 11 Low.**

The dominant pattern: **when the server fails, the customer is told something false**
(wrong password, wrong code, email taken, session expired) **or nothing at all.**

## Findings

| id | page | what was done | what the customer saw | rule | sev |
|---|---|---|---|---|---|
| V01 | Sign-in | correct login, API 500/503 | "Invalid email or password" | V5 misleading | High |
| V02 | Sign-in | generic 429 `errors.rateLimited` | ~12 s spinner, then raw "key 'rateLimited (en)' returned an object instead of string." | V5 raw text | High |
| V03 | Register | phone already used (409 `errors.auth.phoneTaken`) | "This item was changed elsewhere / An account with this email already exists"; phone not marked | V2/V5 wrong field & reason | High |
| V04 | Forgot password | valid submit | success text ~1.0–1.1:1 contrast (white on pale green / dark on dark) | contrast, V11 | High |
| V05 | 2FA step | verify 500 / network abort | "That code didn't work…" | V5/V6 misleading | High |
| V06 | Email-code step | verify 500 | raw word "internal" | V5 raw code | High |
| V07 | Org create, provisioning, onboarding | empty / too long / too short names | "{{field}} is required", "{{field}} must be {{count}} characters or fewer" | V2 placeholders | High |
| V08 | Profile › Personal | name 120 chars (real 400), forced 400/500/abort | always "Unexpected error"; no field marked; no length limit | V5/V7 | High |
| V09 | Profile › Security | wrong current password | "Unexpected error" card + toast "Your session has expired — Your current password is incorrect." | V2/V5 false title | High |
| V10 | Reset password | token rejected on submit | "Unexpected error… Try again" + "Your session has expired — link invalid"; no way to request a new link | V5 dead end | High |
| V11 | Profile › Phone | 409 phone taken | "This item was changed elsewhere / Reload the page" | V2/V5 | High |
| V12 | Support › new ticket | subject 400 / description 12,000 chars | "Please enter a subject of at least 3 characters" (says the opposite) | V2/V7 | High |
| V13 | Provisioning | empty form; address "Bad Address!!" | button greyed with no reason; no message for the bad address | V4/V2 silent | High |
| V14 | Provisioning | POST 500/abort/409/400 | 12 s "Starting…", error below the viewport, no focus, no toast | V3/V5 | High |
| V15 | Profile › Preferences | language save fails | RTL with English text; Arabic kept after reload though not saved | V5/V12 | High |
| V16 | Settings at 375 px | opened | page 467–630 px wide, tab bar overflows | overflow | High |
| V17 | Profile › Security | sessions/devices list 500 | "Loading your content…" forever | silent | High |
| V18 | Settings › General | over-long name/description (real 400) | "Unexpected error"; fields not marked | V5/V7 | Medium |
| V19 | Register, Settings | "bad@" email | browser's English bubble on the Arabic page, covering the app's error | V2/V12 | Medium |
| V20 | Forgot, reset, verify, settings, preferences, onboarding, support | 500/abort | generic inline card + a toast with the real reason | V5 one message | Medium |
| V21 | Sign-in, forgot | 400 with email violation | generic text; field not marked | V5 | Medium |
| V22 | Register, reset, change password | name "A"; empty password | "Name is required" for "A"; "at least 8 characters" for an empty field | V2 | Medium |
| V23 | All B1 forms | — | no required markers | V1 | Medium |
| V24 | Register, server errors | several errors | no summary; focus stays on the body after server errors | V3 | Medium |
| V25 | Sign-in, phone, provisioning | single submit | 3 requests and ~12 s wait on non-retryable 429/500 | silent wait | Medium |
| V26 | Dashboard/onboarding chrome | any toast | toast covers header controls (all six at 375 px) | overlap (B0 F6) | Medium |
| V27 | Settings › General | edited then left | text lost; no leave warning | V10 | Medium |
| V28 | Profile › Personal | saved a name | no confirmation | V11 | Medium |
| V29 | Org create | "A", spaces, 409/500 | "A" accepted; spaces sent; always "could not be completed" | V7/V5 | Medium |
| V30 | Profile › Account | owner | "Role: No Role Assigned"; English roles on the AR page; two orgs marked Current | copy/V12 | Medium |
| V31 | Sidebar | profile, org create, support, provisioning | "Dashboard" highlighted everywhere; two items on provisioning | clarity | Medium |
| V32 | Provisioning | name "A"; Arabic name | green check next to "a" while the error says too short; stale address | contradictory | Medium |
| V33 | Provisioning/onboarding theme picker | keyboard & headings | ~40 focusable fake buttons, 5 extra h1s; English in AR preview | a11y/V12 | Medium |
| V34 | 2FA, email code, 2FA setup, onboarding | disabled buttons | greyed out with no reason | V4 | Medium |
| V35 | Header at 375 px | tap targets | 31–37 px controls | targets | Low |
| V36 | Verify email | 500 | "Check your connection" for a server error | copy | Low |
| V37 | Reset password, invalid link | old link | only a red box, no heading | consistency | Low |
| V38 | Auth pages | header block | title misaligned with icon/subtitle | alignment | Low |
| V39 | Account menu at 375 px | — | name truncated to one letter | polish | Low |
| V40 | Settings › Communications | read-only | disabled buttons overlap the card edge | polish | Low |
| V41 | Mobile drawer | opened | dialog has no accessible name | a11y | Low |
| V42 | Register | 150-char name; 255-char email | name silently cut; long email called invalid | V7 | Low |
| V43 | Onboarding | started a trial | "STEP 1 OF 5" becomes "1 OF 4" | copy | Low |
| V44 | Provisioning | 400 with an unknown key (mock) | raw "subdomainTaken" | fallback | Low |
| V45 | Sign-in AR | — | icon not mirrored | RTL | Low |

Not reachable locally: academy join (academy host), Google sign-in (off locally), real
emailed codes/links (mocked), real 2FA enable, upload checks, 768 px.

## Works well — keep

Client-side messages on sign-in/register/forgot/change password (under the field, EN+AR,
focus to the first bad field); common-password message; register field errors mapped from
the server; offline sign-in message; lockout message; existing-email registration handled
without revealing the account; reset link checked before asking for a password; verify-email
focus; delete-account and sign-out-everywhere confirmations; "Leave without saving?" on
Profile Personal and Provisioning; address checks; onboarding keeps the chosen plan on
failure; correct RTL mirroring; no overflow at 375 px except Settings.

## Fixes

### Shared root causes (whole dashboard)
- **V02** — backend generic keys (`errors.rateLimited`, `errors.notFound`…) name `{title, description}` objects in the catalogue; every lookup now renders only STRING keys (`isTranslatedString`, `displayableErrorKey`): an object key renders its `.description`, never i18next's "returned an object" text.
- **False toast titles (V03, V09, V10, V11)** — a kind's title ("Your session has expired", "This item was changed elsewhere", "Check the highlighted fields") is shown only with the kind's generic reason; with a specific reason the title is neutral ("That didn't work" / «لم تكتمل العملية»), in the hook toast and the app-wide reporter alike.
- **V07** — validation messages carry their numbers (`validationMessage(key, values)`, applied to the shared helpers and all 116 schema call sites) and `{{field}}` falls back to "This field" / «هذا الحقل» in both renderers: no more `{{field}} must be {{count}} characters or fewer`.
- **V25** — a 429 is retried once and only when `Retry-After` ≤ 3 s; replaying it three times inside a minutes-long window spent the customer's remaining attempts and held a ~12 s spinner.
- **V26** — toasts open below the sticky header (`offset` / `mobileOffset`), never over its controls.
- **V44** — a violation key this build doesn't translate falls back to "Check this field and try again." instead of rendering raw.
- **Violations on every kind** — a 409 can name its field (phone already in use); `normalizeAxiosError` kept violations only for 400s.

### Sign-in, sign-up, password, two-step (V01, V03–V06, V10, V19–V24, V34, V36, V37, V42, V45)
One message per failure with the real reason: "Invalid email or password" only for a real 401, "That code didn't work" only for a real wrong code, no raw "internal"; phone-taken on the phone field; a readable forgot-password success panel (15.9:1 / 11.7:1); a reset link refused on submit opens "This link can't be used" with "Request a new reset link"; `noValidate` everywhere (no browser bubble over the Arabic page); server field errors land on their fields; correct short/empty password messages; required markers; error summary on sign-up; Verify enabled with a reason under the field; name length counter instead of a silent cut; RTL-mirrored sign-in icon.

### Dashboard pages (V12–V14, V20, V29, V31, V32, V34)
- **V12** support ticket: "Keep the subject to 200 characters or fewer" (it said "at least 3"), a description counter, one inline message with the real reason.
- **V13/V32** academy setup: the button is never silently grey — a submit checks the address now and says why it can't continue; format errors show on leaving the field; the green check only for an address that also passes the format rules.
- **V14** a refused setup focuses the field the server rejected, or the error panel (in view, with the real reason and a true title).
- **V29** organization name: spaces-only is empty; the failure toast gives the real reason.
- **V31** one highlighted sidebar item, the most specific match; Dashboard no longer lights up on every page.
- **V34/V20** onboarding plan step: "Choose a plan to start your trial." instead of a grey button; one trial-failure message.

### Profile and Settings (V08, V09, V11, V15–V18, V20, V23, V27, V28, V30, V40)
- **V08** profile name: the 100-character limit on "first last" is checked before sending; a server `name` violation lands on First name as "Your full name…", with focus there; any other failure is ONE inline "Your changes weren't saved" with the real reason, not "Unexpected error".
- **V09** a wrong current password shows on that field, not as a "session expired" toast.
- **V11** a phone number already in use shows on the phone field, not as a "changed elsewhere — reload" card.
- **V15** language and theme change only after the save succeeds, and the new language loads first: a failed save never leaves the page in RTL with English text.
- **V16** Settings tabs wrap at 375 px; no horizontal scroll in EN or AR.
- **V17** active sessions and remembered devices: a specific error card with Try again, no toast. Still slow to appear — see the open item below.
- **V18** Settings › General: name and description limits checked in the app (with a counter), email checked by the app instead of the browser's English bubble, server violations on their fields.
- **V20** one message per failure on every profile and settings form, the Notifications tab included (`useUpdateNotificationPreferences` now marks its errors inline).
- **V23** required markers on names, the three password fields, platform name and the phone field (`PhoneField` takes `required`).
- **V27** leaving Settings › General with changes asks first; the draft survives tab switches.
- **V28** saving your name says so; Settings › General confirms too.
- **V30** the Role row shows only a real platform role; organization roles are translated; only the active organization is marked Current.
- **V40** read-only Communications settings render no Cancel/Save.
- **Shared** the form-feedback helpers these forms use (`SaveFailedAlert`, `RequiredMark`, `useFailureReason`, `fieldErrorText`, `useLabelledViolations`, `useFocusFirstViolation`, `hasViolationOn`) live in `@shared/forms` for later batches.
- **Arabic numbers** length messages use the right noun form for the number (حرفان، ٣–١٠ أحرف، ١١–٩٩ حرفًا، ١٠٠ حرف).

### Open, for a later batch — since done
- ~~A GET that fails with a 500 takes ~12 s to show its error~~ — one retry layer: the HTTP client retries a read once (any 5xx or a lost response; never a 4xx; a 429 only with a short `Retry-After`; not offline, after a timeout or a cancel), the query layer not at all. The error shows in about 1–2 s.
- ~~`useServerValidation` fills `{{field}}` with the API's English field name~~ — the hook takes `labels` (API field → label key); `useLabelledViolations` is folded into it and every form with translated labels passes them.
- ~~The password and preferences success toasts still use the legacy toast hook~~ — both use the app toast (`notifySuccess`); the password form has the unsaved-changes leave warning.

### Not changed, with reason
- **V35** header controls are 40 px (WCAG 2.2 AA asks 24 px); 44 px would overflow the 375 px header with six controls.
- **V41** the mobile drawer already has a hidden title ("Main navigation") — not reproduced in code.
- **V33, V39, V43** theme-picker previews (B2), account-menu truncation, onboarding step count — moved to their batches.
- **Academy-site auth pages** (public website verify/reset) get the same treatment in the public-site batch.
