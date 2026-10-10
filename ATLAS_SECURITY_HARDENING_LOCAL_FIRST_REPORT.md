# Atlas Follow-up Report — Production Security Hardening & Secure Local-First Academy Websites

| | |
|---|---|
| Period | 9–10 October 2026 (follow-up release on 10 October, §14) |
| Follows | [ATLAS_ENGINEERING_INITIATIVE_REPORT.md](./ATLAS_ENGINEERING_INITIATIVE_REPORT.md) (its deferred items are the starting point here) |
| Repositories | `zeyadelbadawi/atlas` (frontend), `zeyadelbadawi/atlas-backend` (backend) |
| Pull requests | [atlas-backend#42](https://github.com/zeyadelbadawi/atlas-backend/pull/42) (merged as `21b27b5`), [atlas#34](https://github.com/zeyadelbadawi/atlas/pull/34) (merged as `652f4a3`); deploy fixes [atlas#35](https://github.com/zeyadelbadawi/atlas/pull/35), [atlas#36](https://github.com/zeyadelbadawi/atlas/pull/36), [atlas#37](https://github.com/zeyadelbadawi/atlas/pull/37); follow-up [atlas-backend#43](https://github.com/zeyadelbadawi/atlas-backend/pull/43) (merged as `edc3672`) and [atlas#39](https://github.com/zeyadelbadawi/atlas/pull/39) (merged as `6f4c246`) |
| Production | `https://atlass.dpdns.org`: backend Deploy #267 (17:58 UTC), frontend Deploy #155 (live 22:12 UTC), both 9 October 2026; follow-up backend Deploy #268 (00:31 UTC) and frontend deploy (in progress at writing), 10 October 2026 |
| Status of this document | Engineering record. Anything not verified is marked **Not verified**. Nothing here claims the system is "100% secure". These changes reduce specific, named risks. |

## Contents

1. [Summary](#1-summary)
2. [Workstream 1 — Security Hardening](#2-workstream-1--security-hardening)
3. [Workstream 2 — Secure Local-First Academy Websites](#3-workstream-2--secure-local-first-academy-websites)
4. [Added in the Same Release](#4-added-in-the-same-release)
5. [Database Migrations](#5-database-migrations)
6. [Testing](#6-testing)
7. [CI](#7-ci)
8. [Deployment](#8-deployment)
9. [Production Verification](#9-production-verification)
10. [Problems Found and Fixed](#10-problems-found-and-fixed)
11. [Operations Actions Required](#11-operations-actions-required)
12. [Deferred Work](#12-deferred-work)
13. [Deferred: VPS Disk Capacity and Docker Image Retention](#13-deferred-vps-disk-capacity-and-docker-image-retention)
14. [Follow-up Release — Unique Phone Numbers and Client Owner Sidebar](#14-follow-up-release--unique-phone-numbers-and-client-owner-sidebar)
15. [Final Status](#15-final-status)

---

## 1. Summary

**Workstream 1 (security):**
- Closed the account-takeover findings the previous report deferred: F1, F5, F7, F9, F10, F11 and the unsubscribe key. F13 is an ops check.
- Fixed the confirmed findings of a broader review: authorization A1–A5, A7, A9–A11; web W1–W7 and W12–W15.

**Workstream 2 (offline):** Academy websites now work offline for the signed-in learner's own data. They:
- keep a per-academy, per-user store;
- never store credentials, media or other learners' data;
- make offline writes replay-safe.

**Same release:**
- a phone number at sign-up;
- Arabic right-to-left fixes across the management dashboard;
- a mandatory per-learner forensic watermark on every video, with a Platform Owner lookup.

**Deployment order:** backend first (backup, then 4 additive migrations), frontend second. A guard held back the frontend deploy until the backend was live, because the old backend rejects the new sign-up request (§8).

## 2. Workstream 1 — Security Hardening

### 2.1 Deferred account-takeover findings

| ID | Risk | Fix |
|---|---|---|
| F1 | An email-verification link worked in any browser session | The link verifies only for the session of the account it belongs to. Signed-out users sign in first, then the link completes. |
| F5 | Member lookup revealed whether an Atlas account existed | A name is always required. The response no longer differs between existing and unknown accounts. The dashboard never shows Atlas accounts. |
| F7 | Sign-in throttling could be used to lock someone else out | Throttling is split into budgets: a per-IP flood budget, a per-account budget keyed to the network, and a failure ceiling counted across all addresses. A signed known-device cookie (`SIGNIN_DEVICE_COOKIE_KEY`, or an HKDF of the payment key) lets the real owner through during an attack. |
| F9 | Password-reset requests were distinguishable by timing | The request path only enqueues work. The worker mints the token, so the response is uniform, and no raw token is kept in Redis. |
| F10 | Sessions could be refreshed forever | An absolute lifetime counted from sign-in: 30 days for management, 90 days for academies (`SESSION_ABSOLUTE_MAX_DAYS_*`). Needs a new column, `refresh_tokens.session_started_at`, with a staggered backfill. |
| F11 | Privileged accounts could sign in with a password alone | Organization Owners and Platform Owners always get a second factor on a new browser. The Platform Owner authenticator requirement starts on `PLATFORM_OWNER_TOTP_REQUIRED_FROM` (default 2026-10-24). The dashboard shows a notice before that date. |
| Unsubscribe | The HMAC key was the JWT secret | v2 links use a separate key (`UNSUBSCRIBE_TOKEN_KEY`, or HKDF). v1 links are still accepted until they expire. |
| F13 | Click tracking may rewrite credential links | **Ops item.** Brevo has no per-message switch, and Resend's setting is per domain (off by default). Verify both in the provider dashboards. |

### 2.2 Authorization

| ID | Change |
|---|---|
| A1 | Live sessions are scoped to their course. |
| A2 | Billing and payments are owner-only (`@OrganizationPermissions`). |
| A3 | Archiving, slug and status changes on an academy are owner-only. Non-owners see the slug read-only. |
| A4 | Owners can remove staff: `DELETE /academies/:id/members/:userId`, a new RLS policy, and a confirm dialog in the Team tab. The owner can't be removed (409). |
| A5 | The expired-subscription scope now covers quizzes, assignments, announcements, moderation, grading and blog changes. An inventory spec covers future routes. |
| A7 | `status` is dropped from the course PATCH. Publishing has its own endpoint. |
| A9 | Provisioning is owner-only. |
| A10 | Email webhooks reject replays: Resend `svix-id` for 24 h and Brevo events for 7 days, with a 5-minute timestamp tolerance. |
| A11 | The public-route inventory is complete (47 routes, each with a reason). `certificates.controllers.ts` had been missing from it. |

### 2.3 Web hardening

| ID | Change |
|---|---|
| W1 | Public media is served only for assets that are public by purpose. Submissions and legacy public lesson files are served only through short-lived, same-origin HMAC links, marked `private, no-store`. |
| W2 | The favicon never redirects off-site (open redirect fixed). |
| W3 | Per-route JSON body limits. The default is 100 KB, with larger tiers only where needed: upload 30 MB, content 5 MB, webhooks 1 MB. |
| W4 | Certificate logos are validated before `sharp` sees them: PNG/JPEG/WebP only, 2 MB, magic bytes, 4096², single frame. `sharp` was upgraded to 0.35.5 for three advisories. |
| W5 | The Premium playback token TTL drops from 7200 s to 600 s. The player refreshes it at 70 % of its life. |
| W6 | Normal-tier video uploads are size-bounded: the signed `Content-Length`, the storage quota, and a size check on completion. |
| W7 | The Google sign-in return origin comes from a trusted host. |
| W12 | Images in lesson HTML must be https. |
| W13 | The AES-GCM tag length is pinned to 16 bytes. Truncated tags used to decrypt. |
| W14 | `Permissions-Policy` is set on the API and on every document. Camera, microphone and display-capture are allowed for `self` only (Zoom). Picture-in-picture is off to protect the watermark. |
| W15 | The backend refuses to start if the protected bucket equals the public bucket. |

## 3. Workstream 2 — Secure Local-First Academy Websites

**Available offline on an academy site:**
- public pages already visited (per host);
- the learner portal shell (a service worker on academy hosts, network-first);
- theme assets;
- the learner's own enrolments, outlines and progress;
- assignment briefs and local drafts;
- lesson **text**, only when the server grants `offlineReading` (signed-in learner, 72 h, title and body only);
- an answer journal for untimed, non-strict quizzes.

**Never offline:**
- video, files and external lessons, which say "needs a connection";
- grants and signed URLs;
- quiz sessions and results, and grades;
- other learners' data;
- devices, certificates, orders, payments and notifications.

**Isolation:**
- one IndexedDB per origin and per surface, keyed by user id;
- an allowlist that is default-deny;
- fields shaped like credentials or media are refused even on allowed records;
- a minimal identity snapshot (id, name, avatar);
- sign-out or a user switch wipes the store;
- server refusals purge the copies: an ended enrolment removes the course, and a locked lesson removes the lesson.

**Replay-safe writes:**
- **Assignment submit:** an `idempotencyKey` (Redis, 10 days) plus a durable guard on `submitted_revision`. A replay can never reset a grade.
- **Assignment drafts:** compare-and-set on `draft_saved_at` (409 `draftConflict`).
- **Complete/undo:** an `opId` and `clientOpAt`; the newest wins, and clock skew is capped at +2 minutes.
- **Quiz autosave:** a stale autosave is rebased instead of dropped.
- **Certificates:** the certificate job id is deterministic.

**Caching:**
- API responses default to `private, no-store`.
- Published website reads use `private, max-age=60, stale-while-revalidate=300`.

**Kill switch:** `VITE_OFFLINE_SHELL=off`.

**Limits:**
- a quiz can't be opened after an offline reload;
- uploads need a connection;
- lateness is decided by the server when the work arrives.

## 4. Added in the Same Release

### 4.1 Phone number

- **Storage:** a `user_phones` table with self-only FORCE RLS, E.164 checks, and verification cleared when the number changes.
- **API:** `GET/PUT/DELETE /users/me/phone`, plus optional fields on register. The fields are both-or-neither; numbers are mobile only; changes are limited to 6 per hour. **Since 10 October each number belongs to one account only (§14).**
- **UI:** required at sign-up (management and academy), with a searchable country select and SVG flags.
- **Visibility (9 October release):** through the profile and the API, only the account itself sees the number. Since 10 October academy owners, administrators and managers, the Organization owner and the Platform Owner also see learners' numbers (§14). The other exception is the forensic watermark lookup (§4.3): a Platform Owner can see the phone recorded in the encrypted identity snapshot when a video code was issued.
- **Verification:** not built yet. It needs a provider contract. WhatsApp OTP is not free: Meta charges every authentication template.

### 4.2 Arabic right-to-left

- **Root cause:** Radix primitives ignore `<html dir>`, so everything inside a tab became left-to-right. Fixed with a root `DirectionProvider`.
- **Switch:** the thumb was fixed in RTL.
- **Text direction:**
  - about 82 legitimate left-to-right values are marked `data-ltr-content`;
  - Arabic sentences and localized dates are no longer forced left-to-right.
- **Crawler:** `j47` visits every dashboard page and tab in Arabic as an Organization Owner and as a Platform Owner.

### 4.3 Forensic video watermark

Full design: backend `docs/FORENSIC_WATERMARK.md`.

**The code:**
- every video grant, free preview and live-class join carries a per-viewer, per-session code;
- 10 Crockford base32 symbols, the last a mod-37 check, OCR-tolerant;
- **fail closed:** no code, no signed credential (503).

**The player:**
- a label that jumps every 20–45 s, plus a faint drifting tile of the code over the whole picture;
- fullscreen always targets the frame, never the bare media;
- picture-in-picture, remote playback and AirPlay are blocked, and YouTube embeds use `fs=0`;
- a watchdog pauses playback if a layer is removed or hidden.

**Storage:**
- the `forensic_watermarks` table has no foreign keys, so records outlive account deletion;
- FORCE RLS: only a Platform Owner can read;
- writes go only through SECURITY DEFINER functions;
- an encrypted identity snapshot (AES-256-GCM, AAD = code);
- 730-day retention.

**Lookup:**
- `/dashboard/platform/watermarks` validates the checksum before any request, is rate-limited, and is audited without PII.

**Disclosure:**
- Privacy Policy section 8 and the Terms (EN/AR);
- the account-deletion card;
- a marketing claim worded as a deterrent and a trace, never as making recording impossible.

## 5. Database Migrations

All four are additive. `deploy.sh` backed up the database before applying them in Deploy #267 on 9 October 2026. The `20261110…` prefixes are ordering keys that continue the repository's existing sequence (the previous one is `20261109000000_customer_requests`); they are not the deploy date.

1. `20261110000000_refresh_token_session_started_at`: column plus staggered backfill (F10).
2. `20261110000100_staff_member_removal_rls` (A4).
3. `20261110000200_user_phone`.
4. `20261110000300_forensic_watermarks`.
5. `20261110000400_user_phone_unique_staff_read` (10 October, Deploy #268, §14). It aborts without changing anything if two accounts share a number, then adds the unique index and three read functions.

**Rollback:** `deploy.sh --rollback` re-pins the last-good images. It does not revert migrations, and doesn't need to: the old code ignores the new column and tables.

## 6. Testing

### Backend

- **Static checks:** typecheck, lint, build and `prisma migrate diff --exit-code` are clean.
- **Unit tests:** 220 suites, 5180 tests pass.
- **e2e against local Postgres/Redis/s3rver:** 209 of 211 suites pass.
  - The 3 failing tests are environment-only and fail the same way on `main` locally (§10).
- **New e2e suites:**
  - `session-absolute-cap` (SAC-01..04)
  - `signin-lockout-resistance` (SLR-01..06)
  - `password-reset-request-uniformity` (PRU-01..03)
  - `academy-offline`
  - phone
  - `forensic-watermark` (WM-01..11 and WM-04b)

### Frontend

- **Static checks:** typecheck and lint are clean.
- **Vitest:** 305 files, 3880 tests pass.

### Playwright (real Chromium, local stack running the backend PR)

- `j25`: the watermark draws over real playback, fullscreen targets the frame, and tamper pauses and recovers.
- `j48`: a learner's code is looked up by a Platform Owner, audited, with a misread blocked and an academy owner refused.
- `j38`: 7/7.
- `j47`: 3/3 on a production build.
- `j22`, `j24`, `j44`, `j46`: pass.
- `j23`: passes. Its refresh step can exceed 30 s on the dev server, so the timing flakes there; the assertions were left unchanged.
- `j36`: skips itself without a production academy host.

## 7. CI

| Repository | Result |
|---|---|
| atlas-backend#42 | Green: static checks, 3 e2e shards and the aggregate. The first run failed W6 (§10), fixed in `cfd80c5`. Backend CI on `main` `21b27b5`: success. |
| atlas#34 | Green. Frontend CI on `main` `652f4a3` (run 37966050361): success. |
| atlas#35, #36, #37 | Green on each PR. `main` `082a428` was red (SearchInput race, fixed by #36); `main` `93d08f9` and `ed343fe` green. |

CodeRabbit skipped both PRs because they exceed its 100-file limit. This is informational; no review was posted.

## 8. Deployment

**The risk:** the old production backend validates requests with `forbidNonWhitelisted`. The new frontend sends `phoneNumber`/`phoneCountry` on register, so a frontend-first deploy would have made **every sign-up return 400**. The frontend deploy also runs automatically after CI, with no approval gate.

**What happened:**
1. The owner merged backend#42, then atlas#34.
2. A guard script polled GitHub every 20 s. It cancelled the automatic frontend Deploy for `652f4a3` (run 37968840055) because no successful backend deploy existed yet.
3. The automatic backend Deploy #266 stopped **by design**: "4 migration(s) pending and migrations are NOT authorized … the running stack is untouched."
4. Backend Deploy #267 was dispatched on `main` with `apply_migrations=true`, and the owner approved the protected `production-migrations` environment. It:
   - backed up the database;
   - applied the 4 migrations ("All migrations have been successfully applied");
   - recreated the backend, which came up healthy;
   - left Caddy and the renderer healthy;
   - recorded the last-good digests.
5. Frontend Deploy #152 was then re-run (attempt 2) for `652f4a3`.
6. **The frontend image build stalled.**
   - The `caddy-build` stage's cache entry was missing, so `xcaddy build` compiled Caddy under QEMU (linux/arm64 on an x86 runner). The step printed nothing for more than 50 minutes after `go build` started at 18:05.
   - For comparison, the same build cross-compiled natively took 60 seconds of `go build`: a static ARM aarch64 binary with `caddy-dns/cloudflare` v0.2.4.
   - The run was cancelled before it reached "Deploy to VPS", so production stayed on the previous frontend, which is compatible with the new backend.
7. **Fix, [atlas#35](https://github.com/zeyadelbadawi/atlas/pull/35)** (merged as `082a428`): the `caddy-build` stage now runs on `$BUILDPLATFORM` and cross-compiles with `GOOS=$TARGETOS GOARCH=$TARGETARCH CGO_ENABLED=0`. The PR also carried this report and the work log.
8. **CI on `main` failed after the merge.** `website-messages-page.test.tsx` caught a real, pre-existing race in the shared `SearchInput`: right after "Clear filters", the stale debounced text was pushed back into the URL. The trigger was that React Router hands out a new `setSearchParams` whenever the URL changes. The deploy was skipped.
   - Fixed in [atlas#36](https://github.com/zeyadelbadawi/atlas/pull/36) (`93d08f9`): the draft is reset during render, and only a settled draft is reported.
   - A new deterministic regression test fails without the fix.
   - Full suite: 306 files, 3882 tests.
9. **Frontend Deploy #154 failed twice in under a second**, the original run and one re-run. Docker Hub answered the anonymous metadata request for `node:20-alpine` with **429 Too Many Requests**: the shared runner IPs exhaust the anonymous limit. Nothing reached the VPS.
10. **Fix, [atlas#37](https://github.com/zeyadelbadawi/atlas/pull/37)** (`ed343fe`): all base images are pulled through `mirror.gcr.io`, Google's pull-through cache of Docker Hub's official images. Every tag was checked for amd64/arm64, and the `caddy:2-builder-alpine` digest is identical on both registries.
11. **Frontend Deploy #155 succeeded** (run 37996954465). Timings:
    - frontend image: 6 min 33 s (24 min in Deploy #151);
    - renderer: 2 min;
    - VPS deploy: 1 min 8 s.

    Production served the new bundle (`/assets/index-Bg5Hwlk5.js`) from **22:12:48 UTC**.

**Known window:** from step 4 (17:58) until 22:12, the old frontend ran against the new backend. It was compatible: sign-up, sign-in and the API were unaffected. The one gap was that signed-out users clicking a verification link were shown "invalid link", because of F1. That ended when the new frontend went live.

## 9. Production Verification

### Verified in production (HTTP, unauthenticated, read-only)

| Check | Result |
|---|---|
| Migrations applied | Deploy #267 log lists the 4 migrations and "All migrations have been successfully applied" |
| Backend healthy | Deploy script: "Backend healthy", "Caddy healthy", "Renderer healthy" |
| Watermark lookup route live and guarded | `GET /api/v1/platform/watermarks/7K3QMX9TR7` returns **401**. An unknown route returns 404, so the route exists. |
| Tamper endpoint | A well-formed code returns **204**. An empty body returns 400 (DTO validation). |
| Phone route live and guarded | `GET /api/v1/users/me/phone` returns **401** |
| Register accepts the phone fields | A register request carrying only `phoneNumber`/`phoneCountry` lists violations for `name`, `email` and `password` only. It no longer rejects the phone properties. |
| W1 public media | An unsigned `/api/v1/public/media/...` request is refused (**400**) |
| API security headers | `Permissions-Policy` (camera, display-capture, fullscreen and picture-in-picture all denied for the API), `Cache-Control: private, no-store`, CSP, HSTS, `nosniff`, `Referrer-Policy: no-referrer` |

### Frontend (Deploy #155, verified 22:13–22:20 UTC by HTTP)

| Check | Result |
|---|---|
| New build live | `/` references `/assets/index-Bg5Hwlk5.js`. The previous entry was `index-fBHCA1tk.js`. |
| Document `Permissions-Policy` (W14) | `camera=(self), microphone=(self), display-capture=(self), fullscreen=(self)`, `picture-in-picture=()`, YouTube allowed only for autoplay/encrypted-media |
| Document headers | CSP with YouTube-only `frame-src`, HSTS, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, HTML `Cache-Control: no-cache` |
| Watermark in the bundle | The deployed chunks (554 fetched by following imports) contain `forensic-watermark-label`, the "Restore and continue" tamper shield, `nofullscreen`, the YouTube `fs` option, and the `PlatformWatermarkLookupPage` chunk calling `platform/watermarks`. The tamper path is built at runtime from `path('watermarks', 'tamper')`. |
| Phone in the bundle | `users/me/phone`, `phoneCountry` and the phone-number parser are present |
| RTL in the bundle | `data-ltr-content` markers and Radix `Direction` present |
| Service worker | `/sw.js` is byte-identical to the repository's `public/sw.js` |

### Not verified in production

The sandbox browser cannot complete TLS to production through the egress proxy, and no production accounts or data were used. These checks need a person with a real account:

1. Play a lesson video as a learner: the moving label and the faint tile are visible, and fullscreen keeps them.
2. Look up that code at `/dashboard/platform/watermarks` as a Platform Owner.
3. Sign up with a phone number (management and academy).
4. Browse the Arabic dashboard: tabs, tables and switches read right-to-left.
5. On an academy site: visit pages and a text lesson, go offline, reload, and mark the lesson complete; it syncs when back online.
6. Click a verification link while signed out: you are asked to sign in, then it verifies.

## 10. Problems Found and Fixed

| Problem | Cause | Fix |
|---|---|---|
| A frontend-first deploy would have broken every sign-up | Old backend's `forbidNonWhitelisted`, and frontend deploys automatically | Guard cancelled the frontend deploy until the backend was live (§8) |
| Frontend image build stalled for more than 50 minutes | `caddy-build` cache miss, so Caddy compiled under QEMU emulation | #35: cross-compile on `$BUILDPLATFORM`; the frontend image now builds in about 6.5 minutes |
| CI red on `main` after #35 | A real `SearchInput` race: a stale debounced search was re-applied after "Clear filters" when the URL-backed handler changed identity | #36: render-time draft reset plus a settled-draft guard, with a deterministic regression test |
| Deploy #154 failed twice before building | Docker Hub anonymous rate limit (429) on shared runner IPs | #37: base images pulled through `mirror.gcr.io`. Durable follow-up: a Docker Hub login (§12). |
| CI W6 failed on the first PR run | SeaweedFS enforces the signed `Content-Length`, as intended; the test assumed a non-enforcing store | `cfd80c5`: assert the refusal, then write the object directly to prove completion still refuses and deletes it |
| Anonymous previews could mint unlimited watermark records | Only signed-in grants were rate-limited | A per-IP ceiling for anonymous grants (WM-04b) |
| Deleting a watermark layer in devtools, then pressing Resume, crashed React | React removed nodes that were no longer in the DOM | Layers built outside React; Resume rebuilds a fresh host |
| The watermark tile vanished in strict CSS parsers | Unencoded `( ) '` in the SVG data URI | Encoded |
| The label's fade would trip the watchdog | It dipped to opacity 0 | Dips to 0.4 |
| The documentation's example code failed its own checksum | Typo | `7K3QM-X9TR7` everywhere; `X9TR2` kept only as a deliberate misread in tests |
| Every UI sign-up journey failed | The phone became required; the Playwright helpers never filled it | `fillSignUpPhone` |
| `j38` failed | F1 now requires signing in before a verification link | Test signs in first |
| A real left-to-right leak on the new lookup page | Illustration codes forced LTR without the marker | `data-ltr-content` |
| `p64` asserted pre-W1 and pre-watermark behaviour | Tests encoded old behaviour | Updated to the new contract; all other claims still asserted |
| 13 prettier errors | Formatting in earlier commits | Formatted |
| A dashboard offline store kept contact-submission data | The allowlist was default-allow for website keys | Default-deny |
| **Environment-only:** `p64` protected-store unsigned read | s3rver doesn't enforce anonymous denial; CI's SeaweedFS does | None needed; fails the same on `main` locally |
| **Environment-only:** `learning-quiz` missing answer | Local `FLAG_QUIZ_ENGINE_V2_MODE=on` vs CI off | None needed |
| **Environment-only:** `CR-02` | About 400 accumulated local test Platform Owners made the per-owner notification fan-out exceed a 5 s transaction | Passes after cleanup. **Latent scalability follow-up** (§12). |

## 11. Operations Actions Required

These need production access and were **not** done by this work:

1. **Purge the Cloudflare cache for `/api/v1/public/media/*`** (W1). Older cached responses can still be served.
2. **Unset `VIDEO_PLAYBACK_TOKEN_TTL_SECONDS`** if it is set (W5); otherwise the old 7200 s stays in force.
3. **Rotate `BREVO_WEBHOOK_SECRET`.** It still travels in the URL.
4. **Never rotate the watermark key source in use** (`WATERMARK_SNAPSHOT_KEY`, or the payment key it falls back to). Older identity snapshots would become unreadable.
5. **F13:** confirm that click tracking is off for credential emails in the Brevo and Resend dashboards.
6. **W9:** run the long-lived backend with a non-superuser `DATABASE_URL`.
7. **W10:** lock the origin to Cloudflare (IP ranges or Authenticated Origin Pulls).
8. **Confirm the privacy wording** "Atlas may tell the academy which account a leaked recording was traced to." The 730-day retention is disclosed; the configurable range (90–3650 days) is not.
9. **Platform Owners: set up an authenticator app before 2026-10-24**, when it becomes required (F11).

## 12. Deferred Work

- **A8:** RLS for trial/paid-gift redemptions, `live_provider_events` and the payment-provider config, and narrowing `users_context_select`. This needs migrations ordered with code changes.
- **W1 data migration:** move legacy public submission and lesson objects to the protected bucket, plus an optional index on `media_assets(academy_id, storage_key)`.
- **Customer-request notifier:** emails Platform Owners one by one inside a single transaction, which is O(owners). Batch it or move it outside the transaction before the owner count grows.
- **Durable offline receipts:** a `learner_operation_receipts` table, `lesson_progress.last_op_*`, `assignment_submissions.draft_revision`, and a per-academy offline switch. Designed, not applied.
- **Phone verification:** needs a provider contract. A future account-data export must include `user_phones`.
- **Deploy image source:** base images now come from `mirror.gcr.io`, which does not guarantee it keeps images nobody requests. The images used are among the most-pulled on Docker Hub, but the durable fix is a Docker Hub login in `deploy.yml` (`docker/login-action` with `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` repository secrets). Pinning base-image digests would also make builds reproducible.
- **Build speed:** the Node build still runs under QEMU (about 6 minutes). GitHub's native ARM runners would remove emulation entirely.
- **Watermark burn-in:** per-viewer burned-in marks are not possible with the current video stack. The overlay is a deterrent and a trace, not prevention: a camera pointed at a screen still records.

## 13. Deferred: VPS Disk Capacity and Docker Image Retention

**Status: NOT resolved.** This work did not fix it, and nothing here claims it is fixed.

**Background:**
- On 9 October the VPS disk filled up: 421 Docker images, 42 GB.
- Deploys #263 and #264 failed.
- The owner ran `docker image prune -a` by hand (35.65 GB reclaimed; about 6.8 GB used and 38 GB free afterwards).

**Current state:**
- Checked on `main` in `atlas-backend`: `deploy/deploy.sh` still never prunes images, and `deploy/docker-compose.prod.yml` still sets no container log rotation (`logging` / `max-size`).
- Every deploy pulls new backend, frontend and renderer images and keeps the old ones. This release added two successful deploys (backend #267 and frontend #155), which pulled new images onto the VPS.
- Free space was **not re-measured** after this release, so the current figure is **Not verified**.

**Risk:** the disk fills again. A later deploy then fails partway, as #264 did while copying `.env`. `set -e` kept that failure safe, but it blocks releases until someone frees space by hand.

**Recommended, in order:**
1. After a healthy deploy, prune unused images while keeping the current and last-good digests. `deploy.sh` already records both.
2. Check free disk space before pulling, and refuse to deploy below a threshold.
3. Add Docker log rotation (`max-size` / `max-file`) for every service.
4. Add a disk-usage alert to the existing Prometheus/Alertmanager stack.

## 14. Follow-up Release — Unique Phone Numbers and Client Owner Sidebar

Released on 10 October 2026 through [atlas-backend#43](https://github.com/zeyadelbadawi/atlas-backend/pull/43) and [atlas#39](https://github.com/zeyadelbadawi/atlas/pull/39), in the usual order: backend with its migration first, frontend second.

### 14.1 One account per phone number

- **Rule:** a mobile number can belong to one account only, whatever the role (management, academy staff, learner, Platform Owner).
- **Database:** migration `20261110000400_user_phone_unique_staff_read`:
  - a guard that raises an error, and changes nothing, if two accounts already share a number. Production had none: the deploy's pre-check recorded `duplicate_number_groups=0`;
  - a unique index `user_phones_phone_e164_key` on `user_phones.phone_e164`. The index is the real arbiter; it holds even though `user_phones` RLS stays self-only;
  - `user_phone_taken(e164, exclude_user_id)`, a SECURITY DEFINER function that returns only a boolean.
- **API:** `POST /auth/register` and `PUT /users/me/phone` check the number first, and also map a race on the index (Prisma P2002) to the same answer:
  - **409** `errors.auth.phoneTaken`, with a field violation on `phoneNumber` (`validation:phoneTaken`);
  - the response never names, hints at or links to the account that holds the number;
  - re-entering your own number is allowed.
- **UI:** the message appears on the phone field at sign-up (the management sign-up and every academy website's sign-up, which share `RegistrationForm`) and on the profile phone card. EN: "This phone number is already in use. Enter a different number." AR: «رقم الهاتف هذا مستخدم بالفعل. أدخل رقمًا آخر.»
- **Academy website sign-up** already required the phone (9 October release); no change was needed there.

**Security trade-off, accepted by design:** telling someone "this number is already in use" necessarily tells them that the number has an account. The answer is limited to that single bit:
- no owner information in any response;
- registration stays behind the existing `RegisterRateLimitGuard`;
- profile changes spend the 6-per-hour budget **before** the check, so the profile endpoint cannot be used to test numbers quickly.

### 14.2 Who can see learners' phone numbers

`user_phones` RLS is unchanged (self-only). Staff read numbers only through two SECURITY DEFINER readers that decide from the caller's own identity (`app.current_user_id`), never from anything the caller sends:

| Viewer | Sees | Where |
|---|---|---|
| Academy owner, administrator, manager; the Organization owner | Phone numbers of that academy's students | Academy → Students: table (under the email) and student drawer. Reader: `academy_student_phones(academy_id, user_ids[])` via `can_manage_academy_students` |
| Instructor, staff, learners, anyone else | **Nothing.** The `phone` field is absent from the response | — |
| Platform Owner | Phone numbers of every user who is a student of any academy | Platform → Users: list and detail. Reader: `platform_student_phones(user_ids[])` via `is_platform_owner` |

Note: the academy **administrator** role is included with owner and manager, because the existing `can_manage_academy_students` rule (used for the roster itself) already includes it.

### 14.3 Client Owner sidebar

| Before | After |
|---|---|
| "Revenue & payouts" (AR «الإيرادات والمدفوعات») | Removed from the sidebar. The page and route still exist and stay owner-only |
| "Requests" (AR «الطلبات»), requests to Atlas for a logo, custom section, theme… | **"Atlas service requests"** (AR «طلبات خدمات أطلس») |
| "Orders" (AR «الطلبات»), learners' course orders | **"Course orders"** (AR «طلبات شراء الدورات») |
| An "Add-ons" section with "Browse add-ons", plus "Add-ons" under Cloud Services | **One "Add-ons" entry** (Cloud Services). Its page lists the add-ons on the subscription and the store's available ones, with purchase. The Live Sessions install/enable page stays reachable from the Live Sessions pages |
| "Student Analytics" under Cloud Services | Moved to the Academy section. It is organization-wide, so it shows with or without an active academy |

All of this lives in the one navigation config (`src/app/navigation/navigation.config.ts`), so desktop, collapsed and mobile sidebars change together. `client-owner-sidebar-navigation.test.ts` pins it.

### 14.4 Testing

- **Backend:**
  - e2e `user-phone` and `forensic-watermark`: 29/29. PHONE-03 covers the 409, no owner information, own-number re-entry and the profile conflict. PHONE-08 covers who sees phones (owner yes; instructor, outsider and learner get nothing from both readers; Platform Owner yes);
  - roster, platform control plane, tenant isolation, RBAC, instructor, identity surfaces and academies e2e: 99/99;
  - unit tests (identity, learning, platform): 484 pass; lint and typecheck clean.
- **Frontend:** typecheck and lint clean; Vitest on navigation, customer requests, forms, auth, profile, academy, platform and phone: 72 files, 636 tests, plus the new sidebar test.
- **CI:** green on both PRs (backend static checks, 3 e2e shards and the aggregate; frontend checks and the accessibility/theme job).
- **Problems met:**
  - the local migration refused to run because the Playwright sign-up helper had registered one fixed number many times. This proved the guard; the helper now generates a unique number per sign-up (`uniqueTestMobileNumber()`);
  - parallel e2e suites shared a fixed number, and one suite's cleanup deleted another's phone. Each suite now owns its own numbers.

### 14.5 Deployment and verification

1. atlas-backend#43 merged (`edc3672`).
2. Backend Deploy #268 dispatched with `apply_migrations=true`; the owner approved `production-migrations`. It:
   - backed up the database (`atlas-20261010T003042Z.sql.gz`, uploaded to the backup bucket);
   - recorded the pre-check (`duplicate_number_groups=0`);
   - applied `20261110000400_user_phone_unique_staff_read` (171 migrations in total);
   - recreated the backend; backend, Caddy and the renderer reported healthy (00:31 UTC);
   - recorded the last-good digests.
3. atlas#39 merged (`6f4c246`); the frontend deploy follows automatically after CI (result recorded below when complete).

**Verified in production (HTTP, unauthenticated):**

| Check | Result |
|---|---|
| Migration applied | Deploy #268 log: "Applying migration `20261110000400_user_phone_unique_staff_read`", "All migrations have been successfully applied" |
| Phone route guarded | `GET /api/v1/users/me/phone` → 401 |
| Platform users route guarded | `GET /api/v1/platform-users` → 401 |
| Register still accepts the phone fields | violations only for `name`, `email`, `password` |


**Not verified in production** (needs real accounts; no production data was used):
1. Sign up with a number that another account already uses: the field shows the "already in use" message.
2. As an academy owner or manager, open Students: each learner's phone shows under the email, and in the drawer. As an instructor, no phone appears.
3. As the Platform Owner, open Platform → Users: phones show for academy students.
4. As a Client Owner, check the sidebar: no Revenue & payouts; "Atlas service requests" and "Course orders"; one Add-ons entry; Student Analytics in the Academy section.

## 15. Final Status

| Area | Status |
|---|---|
| Implementation | **Complete** for WS1, WS2, phone, RTL and watermark; and on 10 October for unique phone numbers, staff/Platform Owner phone visibility and the Client Owner sidebar (§14) |
| Testing | **Complete** for unit, e2e and the journeys in §6 and §14.4. Three local e2e failures are environment-only. No load or axe testing in this release. |
| CI | **Green** on #42, #34–#37, atlas-backend#43, atlas#39 and on `main`. One red `main` run (`082a428`) found a real SearchInput race, fixed in #36 (§8). |
| Deployment | **Complete.** Backend Deploy #267 (4 migrations, 17:58 UTC 9 Oct); frontend Deploy #155 (live 22:12 UTC 9 Oct); backend Deploy #268 (1 migration, 00:31 UTC 10 Oct); frontend deploy (in progress at writing) |
| Production verification | **Partial.** HTTP and bundle checks in §9 and §14.5 are verified. Signed-in browser checks are **Not verified** and need the §9 and §14.5 checklists. |
| Known remaining issues | Ops actions (§11); deferred work (§12); VPS disk and image retention **unresolved** (§13) |
