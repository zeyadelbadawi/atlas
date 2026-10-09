# Atlas — Detailed Work Log: Security Hardening, Local-First Academy Websites, Phone, RTL, Forensic Watermark

| | |
|---|---|
| Date | 9 October 2026 |
| Summary report | [ATLAS_SECURITY_HARDENING_LOCAL_FIRST_REPORT.md](./ATLAS_SECURITY_HARDENING_LOCAL_FIRST_REPORT.md) |
| Pull requests | [atlas-backend#42](https://github.com/zeyadelbadawi/atlas-backend/pull/42) → `21b27b5`, [atlas#34](https://github.com/zeyadelbadawi/atlas/pull/34) → `652f4a3` |
| Purpose | A step-by-step record of what was done, why, every problem met and how it was resolved, and what is still pending. The summary report is the short version. |

## Contents

1. [Baseline (H0)](#1-baseline-h0)
2. [Deferred account-takeover findings (H1)](#2-deferred-account-takeover-findings-h1)
3. [Broader security review (H2)](#3-broader-security-review-h2)
4. [Academy offline (L0/L1)](#4-academy-offline-l0l1)
5. [Phone number (PH)](#5-phone-number-ph)
6. [Arabic right-to-left (RTL)](#6-arabic-right-to-left-rtl)
7. [Forensic video watermark (WM)](#7-forensic-video-watermark-wm)
8. [Testing and regression triage](#8-testing-and-regression-triage)
9. [Pull requests and CI](#9-pull-requests-and-ci)
10. [Deployment](#10-deployment)
11. [Production verification](#11-production-verification)
12. [Incidents during the work](#12-incidents-during-the-work)
13. [Everything still pending](#13-everything-still-pending)

---

## 1. Baseline (H0)

- **Starting point:** both repositories on `main` after the previous initiative: backend `88b1fb4`, frontend `a59be1f`.
- **Production config reviewed (read only):**
  - The backend uses `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`. This later decided the deployment order (§10).
  - The deploy workflows: the backend deploys automatically after Backend CI, but stops if migrations are pending. Migrations need `workflow_dispatch` with `apply_migrations=true` plus approval of the protected `production-migrations` environment. The frontend deploys automatically after CI, with no approval.
- **Local test stack:**
  - Postgres :54329, Redis :63799, s3rver :49000;
  - backend :3000, Vite :3001;
  - `vite preview` :3301 for production-build browser runs.

## 2. Deferred account-takeover findings (H1)

Backend commits on the feature branch, in order:

| Commit | What |
|---|---|
| `951eb46` | **F1:** a verification link verifies only for its own account's session. **F5:** member lookup always requires a name, so it no longer reveals whether an account exists. |
| `7ca0267` | **F11:** a privileged MFA floor. Organization Owners and Platform Owners get an emailed code on a new browser even if the general flag is off. Platform Owner TOTP becomes mandatory from `PLATFORM_OWNER_TOTP_REQUIRED_FROM` (default 2026-10-24). |
| `392f6b6` | **F10:** absolute session lifetime. Adds the column `refresh_tokens.session_started_at` (migration `20261110000000`, staggered backfill): 30 days for management, 90 for academies. Also classified `POST auth/verify-email` in the route inventory: a unit test caught that `951eb46` had left it unclassified. |
| `3f67c57` | **F7:** lockout-resistant throttling (`SignInThrottleService` and a known-device cookie). **F9:** uniform reset requests; the worker mints the token, and no raw token is kept in Redis. **Unsubscribe v2:** its own key, no longer the JWT secret; v1 links accepted until they expire. |
| `803aff4` | **A1, A2, A3, A4, A7, A9** (§3.1). A4 brings the staff-removal endpoint and RLS migration `20261110000100`. |

**Problems met:**
- **v1 unsubscribe test.** It first used the `operational` category, which learners can't store. That was a test mistake; switched to `engagement`.
- **w3 campaign and reset tests.** They failed only because another process was stealing their queue jobs (§12).
- **w4 test.** It had to send the now-required name, a consequence of F5 that the authorization agent's regression run found.
- **F13** turned out to be an ops item:
  - Brevo has no per-message tracking switch; it is set account-wide, on request.
  - Resend tracking is per domain and off by default.
  - Both need checking in their dashboards.

**Frontend:**
- `b587a3e`:
  - the verify-email flow asks signed-out users to sign in;
  - member dialogs always ask for a name;
  - return paths are stricter.
- `51a93eb` / `1db11df`:
  - a staff "Remove" action in the Team tab (owner only, confirm dialog, EN/AR, a 409 message protecting the owner);
  - the slug is read-only for non-owners;
  - `UpdateCoursePayload.status` removed;
  - the Platform Owner MFA notice.

## 3. Broader security review (H2)

Merged as backend `4930ac6` and frontend `15fd330`.

### 3.1 Authorization

- **A1:** live sessions are course-scoped. No UI was needed, because no host picker exists.
- **A2:** billing and payments are owner-only.
- **A3:** archive, slug and status are owner-only.
- **A4:** staff removal, with RLS.
- **A5:** `@SubscriptionScope`. Expired-subscription enforcement now also covers quizzes, assignments, announcements, forum and review moderation, grading and overrides, and blog changes, with an inventory spec for new routes.
- **A7:** PATCH course can't change status.
- **A9:** provisioning is owner-only.
- **A10:** webhook replay protection (Redis `SET NX`): Resend `svix-id` for 24 h, Brevo events for 7 days, with the official 5-minute timestamp tolerance.
- **A11:** a public-route inventory of 47 routes, each with a reason. It found that `certificates.controllers.ts` had been skipped by the inventory spec; it is now covered.

### 3.2 Web

- **W1:** `public/media` decides from the asset's database row:
  - published branding is immutable;
  - other public library assets are cached 1 h;
  - submissions and legacy public lesson files are served only via signed links (HMAC, at most 1 h, `private, no-store`).
  - The dead public submission upload path was removed.
- **W2:** the favicon never redirects off-site. This closes an open redirect. An academy's own `.png` gets a same-origin 302 (`max-age 300`); external values get 404.
- **W3:** per-route JSON body limits:
  - default 100 KB;
  - upload tier 30 MB (base64 routes and legacy `data:` images);
  - content tier 5 MB (quiz, FAQ, messages);
  - webhook tier 1 MB, with the raw body kept for signed webhooks.
  - Residual: an unlisted route sending more than 100 KB gets 413.
- **W4:** certificate images are validated before `sharp` sees them:
  - 2 MB, magic bytes PNG/JPEG/WebP, format match, `failOn: warning`, 4096², single frame;
  - GIF logos are now dropped from certificates;
  - `sharp` upgraded from ^0.33.5 to ^0.35.5 (GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c, GHSA-wq5f-xc86-pv6w).
- **W5:** Cloudflare Stream token TTL drops from 7200 s to 600 s; the frontend refreshes at 70 %.
- **W6:** the presigned PUT is bound by the signed `Content-Length` when `sizeBytes` is sent (`VIDEO_MAX_UPLOAD_BYTES` ≤ 5 GiB), the storage quota is charged, and completion checks the object's size.
- **W7:** the Google flow return origin comes from a trusted host. `X-Forwarded-Host` is honoured only from a trusted proxy.
- **W12:** lesson HTML images are https only (frontend).
- **W13:** the AES-GCM `authTagLength` is pinned to 16 for credential encryption, TOTP and auth challenges. Truncated 4-byte tags used to decrypt.
- **W14:** `Permissions-Policy`:
  - on the API (helmet) and on documents (Caddy);
  - picture-in-picture off, to protect the watermark;
  - camera, microphone and display-capture allowed for `self` (Zoom);
  - validated with `caddy adapt`.
- **W15:** boot is refused if `R2_PROTECTED_BUCKET == R2_BUCKET`.

### 3.3 Deferred from H2

- **A8:** RLS for trial/paid-gift redemptions, `live_provider_events` and `atlas_subscription_payment_provider_config`, and narrowing `users_context_select`. It needs migrations ordered with code. (An earlier fix had already moved the `password_hash` concern to `user_credentials`.)
- **W9 and W10:** ops only.

**Merge conflict:** `test/utils/test-app.ts` imports; both sides were kept.

**After the merge:**
- backend unit tests: 5172 pass;
- cross-merge e2e: 13 suites, 126 tests pass;
- `sharp` 0.35.5 works.

## 4. Academy offline (L0/L1)

Merged as backend `6267266` and frontend `1d7310f`.

**Decision:** read-mostly offline with a replay-safe outbox, the same model as the dashboard (ADR-1 of the previous report), extended to academy hosts.

**What works offline:**
- visited public pages, per host;
- the learner portal shell (a service worker on academy hosts, network-first);
- `/theme-assets`;
- the learner's own enrolments, outlines and progress;
- assignment briefs;
- lesson text, only when the server grants `offlineReading` (text lessons, signed-in learner, 72 h, title and body only);
- local assignment drafts;
- an answer journal for untimed, non-strict quizzes.

**Never offline:**
- video, files and external lessons (credentials of 600 s or 2 h, unbound, no DRM);
- grants and signed URLs;
- curriculum entries with a `contentUrl`;
- quiz sessions and results, and grades;
- other learners' data;
- devices, certificates, orders, payments and notifications.

**Authorization rule:** only the server's answer for this signed-in learner on this origin, keyed by user id.
- Fields shaped like credentials or media are refused even on allowed records.
- Server refusals purge the copies:
  - an ended or suspended enrolment, a disallowed device, or a 403 removes the whole course;
  - a 404 or a locked lesson removes the lesson.

**Isolation:**
- one IndexedDB per origin and per surface (`atlas-offline` vs `atlas-offline:academy:<key>`), keyed by user;
- a minimal identity snapshot (id, name, avatar), tagged with its scope;
- sign-out or a user switch wipes the store.

**Caps:**

| Store | Limit |
|---|---|
| Learner records | 72 h, 300 records, 8 MiB |
| Lesson texts | 7 days or less, 120 texts, 4 MiB |
| Drafts | 14 days |
| Journals | 7 days |
| Outbox | 7 days; the server remembers operations for 10 days |
| Theme assets | 200 or fewer |

- Service worker cache: v2.
- Kill switch: `VITE_OFFLINE_SHELL=off`.

**Backend:**
- **Cache headers:**
  - every API response defaults to `private, no-store` (middleware before routing);
  - public website reads use `private, max-age=60, stale-while-revalidate=300`;
  - endpoints that set their own headers keep them.
- **Assignment submit:** an `idempotencyKey` (Redis, 10 days) plus a durable guard on `submitted_revision`.
  - A replay can never reset a grade: 409 `submissionChanged`.
  - The same key with a different payload gets 422.
- **Draft compare-and-set:** on `draft_saved_at` (409 `draftConflict`).
- **Complete/undo:** an `opId` and `clientOpAt`; the newest wins, with clock skew capped at +2 minutes.
- **Quiz:** a stale autosave returns the learner's own answers.
- **Certificates:** the issue job id is deterministic, `certificate-issue-<enrollmentId>`. The old `Date.now()` id never deduplicated.

**Frontend:**
- a quiz `applied: false` bug fixed: merge, then retry at revision + 1;
- local assignment drafts with a conflict UI;
- submit shows "waiting to send", with cancel;
- a connectivity banner on learner pages;
- EN/AR copy, including all 6 Arabic plural forms.

**Problem found:** a dashboard offline store was persisting contact-submission keys, which is personal data. Fixed in `90b926f`: the allowlist is now default-deny for website keys.

**Tests:**
- backend unit 16/16;
- e2e `academy-offline` 14/14;
- regressions 89/89 and 48/49;
- 53 new frontend tests;
- Playwright `j36` passed twice: service worker scope, no `/api` cached, offline reload of the shell, text and banner, video needs a connection, and offline completion queued then synced.

**Limits:**
- quizzes can't open after an offline reload;
- uploads need a connection;
- lateness is decided by the server when the work arrives;
- no banner on marketing pages;
- language bundles never loaded before are unavailable offline.

**Recommended durable schema (not applied):** a `learner_operation_receipts` table, `lesson_progress.last_op_at/id`, `assignment_submissions.draft_revision` and `academies.offline_reading_enabled`.

## 5. Phone number (PH)

**Backend** (merged into the branch as `669dd00`):
- **Table `user_phones`:**
  - primary key `user_id`, an E.164 number, the country and `verified_at`;
  - FORCE RLS with self-only policies and format CHECKs;
  - a trigger clears `verified_at` when the number changes;
  - migration `20261110000200`, additive.
- **API:** `GET/PUT/DELETE /users/me/phone`. `POST /auth/register` accepts optional `phoneNumber` and `phoneCountry`, both or neither.
- **Rules:**
  - mobile numbers only (fixed-line-or-mobile accepted);
  - not unique, because families share numbers and uniqueness would allow enumeration;
  - at most 6 changes per hour.
- **Privacy:**
  - deleting the account erases the number;
  - the audit events `account.phone.updated` and `account.phone.removed` carry only the country and kind;
  - pino redacts phone fields.
- **Verification:** `PhoneVerificationService` exists but has no provider bound, and `FLAG_PHONE_VERIFICATION_MODE=off`.
- Documented in `docs/USER_PHONE.md`.

**Frontend:**
- **Input:** a shared `PhoneNumberInput`:
  - a searchable country list (EN/AR) with SVG flags, lazy-loaded (about 49 KB gzipped);
  - `libphonenumber-js` 1.13.11 (about 45 KB gzipped), loaded on the sign-up and profile pages only;
  - the default country comes from the browser time zone, falling back to Egypt;
  - typing a `+code` switches the country.
- **Where:** required on management and academy sign-up. A profile card on `/dashboard/profile` and `/my/profile`, and a dismissible prompt for accounts without a number.
- **Offline:** the phone query key is excluded from offline persistence, and a test pins that.

**Visibility decision:** through the profile and the API, only the account itself sees its number; staff, organization owners and Platform Owners don't. The one exception is the forensic watermark lookup: the watermark's identity snapshot (§7) captures the phone in the learner's own context, encrypted, and a Platform Owner looking up a leaked code can see that issue-time phone.

**WhatsApp research:** there is no free OTP. Since 1 July 2025 Meta charges for every authentication template (about US$0.0036 per message in Egypt plus VAT, according to third-party rate cards). The cheapest legitimate route is a user-initiated `wa.me` message, which is free inbound but still needs a WhatsApp Business account, a number and a payment method. It was not built.

**Merge problems met and fixed:**
- a `profile.json` conflict (both sides added keys), merged key by key;
- profile index exports;
- a lockfile specifier mismatch (`@radix-ui/react-direction ^1.1.4` vs `1.1.4`) that would have broken CI's frozen install. Fixed in `7dcbd21`.

## 6. Arabic right-to-left (RTL)

**Root cause:** Radix primitives (Tabs, ToggleGroup, RadioGroup, ScrollArea, menus) don't read `<html dir>`. Without a `DirectionProvider` they write `dir="ltr"` on their own root. Everything inside a tab became left-to-right in Arabic: whole profile pages, the members table, the Team and Students filter tabs, and Messages.

**Fix:** `LocalizationProvider` wraps the app in `<DirectionProvider dir={languageDefinition.direction}>`.

**Switch:** the thumb used `translate-x-5` for "on" in both directions, so in RTL it sat outside the track. Added `rtl:data-[state=checked]:-translate-x-5`.

**Crawler:** `j47-dashboard-rtl` audits every sidebar page and every tab in Arabic, as an Organization Owner and as a Platform Owner. What it found after the root fix:

**Organization Owner:**
- **Website page:** the public URL and the sitemap are legitimately LTR, so they are tagged `data-ltr-content`.
- **Theme gallery miniatures:** they rendered the academy site as `lang="en" dir="ltr"` with Arabic header labels, a genuinely mixed state. Root fix: `WebsiteRenderer` defaults to the dashboard language when no locale is passed. This covers the theme gallery, Brand Studio and every preview; a per-card patch was reverted in its favour.
- **Bilingual fields:** the English half now carries `lang="en"`. Canonical URL inputs and hex colour inputs are tagged.
- **Certificate template:** the "English wording" column wrapper was LTR with Arabic labels. Now only the typed inputs carry `lang`/`dir`.
- **Dialogs the crawler can't open,** tagged by hand:
  - FAQ and Testimonial English fields;
  - CTA URL inputs;
  - the page canonical path;
  - provider order and percent.

**Platform Owner:**
- **Domain settings:** an Arabic sentence ("آخر دورة …") was forced LTR. This was a bug; it now uses `dir="auto"`.
- **Security monitoring:** the account column mixed masked emails and Arabic labels, and the IP reference cell held an Arabic sentence, both forced LTR. Bugs, fixed.
- **Email activity:** recipient and provider cells now use `dir="auto"`.
- **Zoom pages** (8 of them): localized dates ("9 أكتوبر 2026") and Arabic plurals were forced LTR. Bugs, removed. KPI numbers are tagged.
- **Elsewhere:**
  - account numbers, IBAN and wallet handles are tagged;
  - localized dates on Live Sessions and Add-ons were un-forced;
  - "المرجع: {id}" in the message composer was un-forced.

**Second pass:** a classification agent went through the remaining 124 hardcoded `dir="ltr"`.
- 82 legitimate technical values were tagged: emails, IDs, references, slugs, hosts, IBAN and wallet fields, OTP slots, JSON config and money.
- 3 localized live-session dates were un-forced.
- Alert-rule labels now use `dir="auto"`.
- The DNS records table is no longer LTR as a whole: its headers are Arabic, and only the type, name and value spans are LTR. Header cells changed from `text-left` to `text-start`.

**Money stays LTR on purpose:** the Arabic `Intl` output starts with an RLM, and without isolation USD renders as "$US 39.00".

**Late find:** the new watermark lookup page's idle illustration had codes forced LTR without the marker. Fixed in `8830b86`.

**Result:** `j47` 3/3 on a production build.

## 7. Forensic video watermark (WM)

**Request:** a mandatory watermark on every course video, unique to the learner and session. A screen-recorded leak must be traceable from a Platform Owner search page even after the account is deleted (phone, email, session time, device). It should be hard to remove but not annoying, cover all course types, handle academy offline, and be production-grade and marketed.

**Key decision:** per-viewer burned-in watermarks are not possible with this stack. Cloudflare Stream watermarks are per-video profiles applied at upload, and YouTube is third-party. So the watermark is a dynamic client overlay made hard to remove:
- a readable code that moves at random intervals;
- a faint full-frame tile of the code;
- fullscreen on the container only;
- tamper detection;
- fail-closed issuance.

It is a deterrent and a trace, never described as preventing recording.

### Backend (`a160c22` and follow-ups)

- **Table `forensic_watermarks`** (migration `20261110000300`):
  - no foreign keys, so records outlive account, academy and lesson deletion;
  - FORCE RLS: only a Platform Owner can SELECT, and DELETE is allowed only past a 90-day floor;
  - three SECURITY DEFINER write functions with self-only checks.
- **Identity snapshot:** name, email, phone, sign-in IP, country and device, and titles. Encrypted with AES-256-GCM, AAD = code (`WATERMARK_SNAPSHOT_KEY`, or HKDF).
- **Code:**
  - 10 Crockford base32 symbols, the last a mod-37 check;
  - OCR-tolerant normalisation: O→0, I/L→1, Arabic-Indic digits.
- **Issuance:**
  - inside the grant transaction, fail closed (503 `watermarkUnavailable`);
  - after every refusal and before the lease;
  - staff previews are watermarked;
  - anonymous previews get a preview code.
- **Lookup:** `GET /platform/watermarks/:code`, with Platform Owner guards, per-IP and per-owner limits, `no-store`, and an audit entry without PII.
- **Tamper report:** `POST /learning/watermarks/tamper` always answers 204, counts only the caller's own code, and is throttled.
- **Lifecycle:**
  - the heartbeat refreshes last-seen;
  - 730-day retention via the maintenance sweep;
  - kept on account deletion, with a line in the deletion plan.
- **Academy settings:** the academy `watermark` / `watermarkText` settings are accepted and ignored. The legacy grant `text` carries the code, so even the old frontend drew it during the deploy window.

### Frontend

- **`ForensicWatermarkFrame`:**
  - a label jumping every 20–45 s, plus a faint drifting tile;
  - wraps `ProtectedVideoPlayer`, `YouTubeLessonPlayer`, `CoursePreviewDialog` and `ZoomMeetingEmbed`;
  - the public free preview had been a bare `<video>` with picture-in-picture allowed.
- **Fullscreen is always the frame:**
  - the F key, the caption button and double-click;
  - native media fullscreen is redirected;
  - iOS `webkitbeginfullscreen` falls back to filling the viewport.
- **Players:**
  - `<video>` uses `nofullscreen` and `noremoteplayback`, with PiP off, `disableRemotePlayback` and AirPlay denied;
  - YouTube uses `fs=0`, without `allowFullScreen`, picture-in-picture or `allow-presentation`.
- **Watchdog:** pauses, explains and reports once per 30 s when a layer is removed, hidden, shrunk or altered. It never trips while the player isn't laid out.
- **Academy settings:** the content-protection card is now an always-on summary.
- **Removed:** the dead, unrouted legacy `LessonPage`, which rendered unwatermarked players.
- **Lookup page:** `/dashboard/platform/watermarks` validates before calling the API, supports deep links, shows the full result sections, and has EN/AR. It never retries and never stores results offline.
- **Disclosure:**
  - Privacy Policy section 8, the Terms, the account-deletion consequence and the marketing claim;
  - the Arabic term unified to "العلامة المائية التتبّعية";
  - an admin deletion-plan label added for `forensicWatermarks`.

### Problems met and fixed

| Problem | Fix |
|---|---|
| Anonymous preview grants weren't rate-limited, so rotating device cookies minted unlimited records | Anonymous grants share the grant ceiling per client IP (e2e WM-04b) |
| Deleting a layer in devtools, then Resume, crashed React (`NotFoundError`; portals too) | Layers built imperatively outside React; Resume builds a fresh host |
| The pattern data URI had unencoded `( )` from `rotate(...)`, so strict CSS parsers dropped it | Encode `( ) '` |
| The label fade dipped to opacity 0, which the watchdog reads as hidden | Dips to 0.4 |
| Lint forbids deep relative and cross-feature imports | A module-local tamper service |
| The documentation's example code `7K3QM-X9TR2` failed its own checksum | `7K3QM-X9TR7` everywhere; `X9TR2` kept only as a deliberate misread in tests |
| A `node_modules` symlink was staged in an agent worktree | Unstaged |
| `p64` asserted that YouTube embeds report `watermark: false` | Updated: embeds now carry the watermark |

## 8. Testing and regression triage

**Final numbers:**
- backend unit: 220 suites, 5180 tests;
- backend e2e: 209 of 211 suites, 2474 of 2477 tests;
- frontend Vitest: 305 files, 3880 tests;
- typecheck, lint and build are clean in both repos;
- `prisma migrate diff --exit-code` is clean.

| Failure | Classification | Evidence and action |
|---|---|---|
| `p64` "public asset durable URL unsigned" | The test encoded pre-W1 behaviour | Asserts the signed same-origin link `/api/v1/public/media/<key>?exp=&sig=`, and that protected assets stay presigned (`692d846`) |
| `p64` "protected object store refuses an unsigned read" | **Environment-only** | Fails the same on `main` locally; s3rver doesn't enforce anonymous denial, and CI's SeaweedFS does |
| `CR-02` customer-request routing | **Environment-only** | The local DB had 408 test Platform Owners. The notifier sends one email per owner inside a single interactive transaction (Prisma 5 s timeout), so it timed out and the error was swallowed. After demoting 401 stale local owners it passes 10/10. **Latent follow-up:** O(owners) inside one transaction. |
| `learning-quiz` "rejects a submission missing an answer" | **Environment-only** | Local `FLAG_QUIZ_ENGINE_V2_MODE=on`, where unanswered means incorrect by design, vs off in CI. Also fails on `main` locally. |
| `p64` "external embed reports protecting nothing" | The test encoded pre-watermark behaviour | Reports `watermark: true` when a code was issued; every other claim still asserted false |
| Lint: 13 prettier errors | Formatting in H1 commits | Formatted (`becde41`) |

**Browser journeys (real Chromium):**
- **Every UI sign-up journey failed.** The phone became required, and the shared helpers never filled it. Fixed with `fillSignUpPhone`.
- **`j38`:** F1 requires signing in before a verification link. The test now signs in first: 7/7.
- **`j47`:** found the lookup page's LTR leak (fixed). On the dev server it crashed with `ERR_INSUFFICIENT_RESOURCES` after about 25 full navigations, because unbundled modules are re-fetched every time. That is an environment limit; on a production build it passes 3/3.
- **`j23`:** the refresh step can exceed its 30 s wait on the dev server. With more time it passes. The assertions were left unchanged.
- **`j22`, `j24`, `j44`, `j46`, `j25`, `j48`:** pass.
- **`j36`:** skips itself without a production academy host.

## 9. Pull requests and CI

- **Backend PR [atlas-backend#42](https://github.com/zeyadelbadawi/atlas-backend/pull/42).**
  - The first run failed shard 2, `p64` W6. CI's SeaweedFS enforced the signed `Content-Length` and refused the oversized body (403), which is the intended W6 protection; the test had assumed a non-enforcing store.
  - Fixed in `cfd80c5`: the test asserts the refusal, then writes the object directly to prove completion still refuses and deletes it.
  - CI then fully green.
- **Frontend PR [atlas#34](https://github.com/zeyadelbadawi/atlas/pull/34):** green.
- **CodeRabbit** skipped both PRs (over its 100-file limit).
- **Merges:** the owner merged both: backend `21b27b5`, then frontend `652f4a3`. Backend CI and frontend CI on `main` were green.

## 10. Deployment

**The compatibility problem:** the frontend sends `phoneNumber` and `phoneCountry` on register. The old backend's `forbidNonWhitelisted` returns 400 for unknown properties, so if the frontend went live first, **every sign-up would fail**. The frontend deploys automatically after CI with no gate, while the backend needed a migration approval, so the frontend would have won the race.

**Mitigation:** a guard script polled GitHub every 20 s for about 110 minutes. It cancelled any frontend Deploy run for `652f4a3` until a successful backend Deploy for `21b27b5` existed.

**Timeline (UTC, 9 October 2026):**
1. **17:13:** Backend CI on `main` `21b27b5`: success.
2. **17:30–17:43:** automatic backend Deploy #266. It pulled the images, started postgres and redis (kept as they were), then stopped: "4 migration(s) pending and migrations are NOT authorized … Nothing was migrated and nothing was rolled; the running stack is untouched." This is the designed safety stop.
3. **Frontend CI on `main` `652f4a3`:** success (run 37966050361). The automatic frontend Deploy (run 37968840055) was **cancelled by the guard** at 17:48.
4. **17:55:** backend Deploy #267 dispatched on `main` with `apply_migrations=true`. The owner approved `production-migrations`.
   - Backup.
   - The 4 migrations applied: "All migrations have been successfully applied".
   - The backend was recreated, then recreated again to load changed env, and came up healthy.
   - Caddy and the renderer healthy.
   - Last-good digests recorded (rollback backend `sha256:f9ddaa3f…`).
5. **18:03:** frontend Deploy #152 re-run (attempt 2) for `652f4a3`.
6. **18:05–19:00: the frontend image build stalled.**
   - The `caddy-build` stage had no cache entry, so `xcaddy build` ran `go build` under QEMU (linux/arm64 on an x86 runner).
   - It printed nothing after 18:05:23. The same step had taken 24 minutes in total in Deploy #151.
   - Locally, the identical build cross-compiled natively took 60 s of `go build` (go1.26.0, `caddy-dns/cloudflare v0.2.4`, static ARM aarch64).
   - The owner asked for the run to be cancelled. It was cancelled at 19:00:49, before "Deploy to VPS".
7. **19:00–19:36: [atlas#35](https://github.com/zeyadelbadawi/atlas/pull/35).**
   - The Caddy stage moved to `FROM --platform=$BUILDPLATFORM … ` with `GOOS=$TARGETOS GOARCH=$TARGETARCH CGO_ENABLED=0`, plus the two reports.
   - CodeRabbit raised two documentation points, both handled:
     - phone visibility now names the watermark lookup as the one exception;
     - migration prefixes are ordering keys, not dates (CodeRabbit withdrew that one).
   - Merged as `082a428`.
8. **19:43: CI on `main` `082a428` red.** One unit test, `website-messages-page.test.tsx` ("Clear filters"), failed, although the same tree had passed on the PR.
   - **Root cause:** a real, pre-existing bug in `SearchInput`.
     - After "Clear filters", the debounced draft still held `"nobody"` for one debounce window.
     - React Router hands out a new `setSearchParams` (and so a new `onValueChange`) whenever the URL changes.
     - The reporting effect re-ran in the same commit, before the draft reset was visible, and pushed the cleared search back into the URL.
   - **Fixed in [atlas#36](https://github.com/zeyadelbadawi/atlas/pull/36)** (`93d08f9`):
     - the draft is reset during render, using React's "adjust state on prop change" pattern;
     - only a settled draft (`debouncedDraft === draft`) is reported.
   - **Tests:**
     - a new `search-input.test.tsx` with fake timers reproduced the bug before the fix;
     - the Messages test passed 5 times in a row;
     - full suite: 306 files, 3882 tests.
   - On the owner's instruction, CodeRabbit was skipped from here on.
9. **20:50–20:54: Deploy #154 failed twice, about 1 s into the image build.**
   - Docker Hub returned `429 Too Many Requests` for the anonymous metadata request for `node:20-alpine`; shared runner IPs exhaust the anonymous limit.
   - It was re-run once (it had died before any build step), then left alone.
10. **21:05–21:34: [atlas#37](https://github.com/zeyadelbadawi/atlas/pull/37).**
    - All five `FROM` lines now pull from `mirror.gcr.io/library/…`.
    - Checked first: all three tags return 200 with amd64 and arm64, and the `caddy:2-builder-alpine` index digest matches Docker Hub (`sha256:aa705b1e…`).
    - CodeRabbit noted the mirror does not guarantee retention. It was skipped per the owner and recorded as a follow-up (Docker Hub login).
    - Merged as `ed343fe`.
11. **22:02–22:13: Deploy #155 succeeded.**

    | Step | Duration |
    |---|---|
    | Frontend image | 6 min 33 s (Caddy cross-compiled) |
    | Renderer | 2 min |
    | VPS deploy | 1 min 8 s |

    Production served `/assets/index-Bg5Hwlk5.js` from **22:12:48 UTC**.

**Known window:** from 17:58 to 22:12, the old frontend ran against the new backend. They were compatible, and sign-up and sign-in were unaffected. The one gap: signed-out users clicking a verification link saw "invalid link" (F1). It ended at 22:12.

## 11. Production verification

See the summary report, §9.

**Backend, by HTTP:**
- the new routes exist and are guarded (watermark lookup 401, phone 401, tamper 204);
- register accepts the phone fields;
- unsigned public media is refused (400);
- the API security headers are present.

**Frontend, by HTTP, after Deploy #155:**
- the new entry bundle is live;
- the document `Permissions-Policy` sets picture-in-picture off and fullscreen to `self`;
- the deployed chunks contain:
  - the watermark frame, tamper shield, `nofullscreen` and the lookup page;
  - the phone input and its parser;
  - the RTL markers;
- `/sw.js` is byte-identical to the repository.

Signed-in browser checks are **Not verified**. They need the owner's checklist; the sandbox browser cannot reach production over TLS, and no production accounts were used.

## 12. Incidents during the work

- **Queue stealing in tests:** `backend.env` exports `NODE_ENV=development`, so the e2e app used the shared `bull` BullMQ prefix, and the locally running old API server took its jobs (reset emails, setup emails, campaign sends). This explains earlier P64-C4, p64-c8 and reset failures. Fix: run e2e with `NODE_ENV=test` (the `bull-test` namespace), as Jest and CI do.
- **Shared Redis:** `j47` clears auth rate-limit keys in Redis at sign-in, which corrupted backend rate-limit tests running at the same time. Don't run them together.
- **Container disk full:** the container hit 100 % (ENOSPC) while 3 agents and browser tests ran. About 12 GB was freed by deleting stale scratch artifacts from earlier theme work (already archived) and the Jest cache. The agents were told to re-verify.
- **A background `serve` command was killed at its time limit:** the servers survived. A `pkill` once killed its own shell (exit 144). The preview server was later stopped by PID.
- **Permission prompts during deployment:** after the backend deploy was dispatched, the session's permission system refused status reads. The owner confirmed the backend result manually. Later reads went through the GitHub integration instead.
- **Frontend deploy blocked three times by CI infrastructure:**
  - the QEMU Caddy compile;
  - a timing-dependent unit-test failure that exposed a real bug;
  - the Docker Hub rate limit.

  Each was root-caused and fixed in its own PR (#35, #36, #37). None was worked around by disabling a check or a test.

## 13. Everything still pending

**Ops (needs production access):**
1. Purge the Cloudflare cache for `/api/v1/public/media/*`.
2. Unset `VIDEO_PLAYBACK_TOKEN_TTL_SECONDS` if it is set.
3. Rotate `BREVO_WEBHOOK_SECRET`.
4. Never rotate the watermark key source.
5. F13: check click tracking in Brevo and Resend.
6. W9: a non-superuser `DATABASE_URL`.
7. W10: lock the origin to Cloudflare.
8. Platform Owners: set up an authenticator before 2026-10-24.

**Owner decisions:**
- Confirm the privacy sentence "Atlas may tell the academy which account a leaked recording was traced to."
- Whether to disclose the configurable retention range (90–3650 days); 730 is disclosed.

**Engineering:**
- A8 RLS migrations;
- the W1 legacy data migration;
- the customer-request notifier fan-out;
- durable offline receipts;
- phone verification (needs a provider);
- an account-data export that includes `user_phones`.

**Deploy pipeline follow-ups:**
- Add a Docker Hub login to `deploy.yml` (`DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` secrets). `mirror.gcr.io` does not guarantee it keeps images nobody requests.
- Pin base-image digests.
- Consider native ARM runners, so the Node build no longer runs under emulation (about 6 minutes now).

**VPS disk and Docker image retention:** **unresolved**. `deploy.sh` doesn't prune and there is no log rotation; see the summary report, §13.

**Manual production checklist:** the signed-in checks in the summary report, §9, plus the 7-item checklist from the previous initiative, which is still unanswered.
