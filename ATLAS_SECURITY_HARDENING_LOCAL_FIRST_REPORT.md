# Atlas Follow-up Report — Production Security Hardening & Secure Local-First Academy Websites

| | |
|---|---|
| Period | 9 October 2026 |
| Follows | [ATLAS_ENGINEERING_INITIATIVE_REPORT.md](./ATLAS_ENGINEERING_INITIATIVE_REPORT.md) (its deferred items are the starting point here) |
| Repositories | `zeyadelbadawi/atlas` (frontend), `zeyadelbadawi/atlas-backend` (backend) |
| Pull requests | [atlas-backend#42](https://github.com/zeyadelbadawi/atlas-backend/pull/42) (merged as `21b27b5`), [atlas#34](https://github.com/zeyadelbadawi/atlas/pull/34) (merged as `652f4a3`) |
| Production | `https://atlass.dpdns.org`: backend Deploy #267, frontend Deploy #152 (attempt 2) |
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
14. [Final Status](#14-final-status)

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
- **API:** `GET/PUT/DELETE /users/me/phone`, plus optional fields on register. The fields are both-or-neither; numbers are mobile only and not unique; changes are limited to 6 per hour.
- **UI:** required at sign-up (management and academy), with a searchable country select and SVG flags.
- **Visibility:** through the profile and the API, only the account itself sees the number. The one exception is the forensic watermark lookup (§4.3): a Platform Owner can see the phone recorded in the encrypted identity snapshot when a video code was issued.
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
7. **Fix:** the `caddy-build` stage now runs on `$BUILDPLATFORM` and cross-compiles with `GOOS=$TARGETOS GOARCH=$TARGETARCH CGO_ENABLED=0`. It shipped in a small PR, and its merge triggered the frontend deploy.

**Known short window:** between steps 4 and 5, the old frontend showed "invalid link" to signed-out users who clicked a verification link, because of F1. This ends once the new frontend is live.

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

### Frontend deploy

**In progress** when this was written. Deploy #152 (attempt 2) was building the frontend image. The frontend checks (deployed bundle, `Permissions-Policy` on documents) will be added once it is live.

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
- **Watermark burn-in:** per-viewer burned-in marks are not possible with the current video stack. The overlay is a deterrent and a trace, not prevention: a camera pointed at a screen still records.

## 13. Deferred: VPS Disk Capacity and Docker Image Retention

**Status: NOT resolved.** This work did not fix it, and nothing here claims it is fixed.

**Background:**
- On 9 October the VPS disk filled up: 421 Docker images, 42 GB.
- Deploys #263 and #264 failed.
- The owner ran `docker image prune -a` by hand (35.65 GB reclaimed; about 6.8 GB used and 38 GB free afterwards).

**Current state:**
- Checked on `main` in `atlas-backend`: `deploy/deploy.sh` still never prunes images, and `deploy/docker-compose.prod.yml` still sets no container log rotation (`logging` / `max-size`).
- Every deploy pulls new backend, frontend and renderer images and keeps the old ones. This release added two more deploys (#267 and #152).
- Free space was **not re-measured** after this release, so the current figure is **Not verified**.

**Risk:** the disk fills again. A later deploy then fails partway, as #264 did while copying `.env`. `set -e` kept that failure safe, but it blocks releases until someone frees space by hand.

**Recommended, in order:**
1. After a healthy deploy, prune unused images while keeping the current and last-good digests. `deploy.sh` already records both.
2. Check free disk space before pulling, and refuse to deploy below a threshold.
3. Add Docker log rotation (`max-size` / `max-file`) for every service.
4. Add a disk-usage alert to the existing Prometheus/Alertmanager stack.

## 14. Final Status

| Area | Status |
|---|---|
| Implementation | **Complete** for WS1, WS2, phone, RTL and watermark |
| Testing | **Complete** for unit, e2e and the journeys in §6. Three local e2e failures are environment-only. No load or axe testing in this release. |
| CI | **Green** on both PRs and both `main` merges |
| Deployment | Backend **complete** (Deploy #267, 4 migrations). Frontend: **in progress** (Deploy #152, attempt 2) |
| Production verification | **Partial.** HTTP checks in §9 are verified. Signed-in browser checks are **Not verified** and need the §9 checklist. |
| Known remaining issues | Ops actions (§11); deferred work (§12); VPS disk and image retention **unresolved** (§13) |
