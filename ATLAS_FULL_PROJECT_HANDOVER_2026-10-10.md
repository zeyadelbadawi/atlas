# ATLAS — FULL PROJECT HANDOVER (10 October 2026)

> **This is the current handover for the whole Atlas project: frontend and backend.**
> It supersedes every earlier handover file (listed in §14). Read it first, then the two
> latest reports it points to. Where this document and the code disagree, **the code wins**;
> treat the disagreement as something to investigate.

| | |
|---|---|
| Written | 10 October 2026, after the unique-phone / sidebar release reached production |
| Repositories | `zeyadelbadawi/atlas` (frontend, this repo) and `zeyadelbadawi/atlas-backend` (backend) |
| `main` at writing | frontend `6f4c246` (plus this docs PR), backend `edc3672` |
| Production | `https://atlass.dpdns.org` (academy sites on `*.atlass.dpdns.org` and custom domains) |
| Latest reports | `ATLAS_SECURITY_HARDENING_LOCAL_FIRST_REPORT.md` (+ `ATLAS_SECURITY_HARDENING_DETAILED_WORK_LOG.md`) and `ATLAS_ENGINEERING_INITIATIVE_REPORT.md`, both in this repo |
| Secrets | Never in this file. Only names and locations (§9) |

---

## 0. Read this first

1. **Two layers of tenancy, always.** Application guards **and** PostgreSQL FORCE RLS. The app
   connects as `atlas_app` (no superuser, no BYPASSRLS). Never "fix" a missing row by widening
   RLS or switching to the migration role. Cross-scope reads go through SECURITY DEFINER
   functions granted to `atlas_app` (§3).
2. **Backend first when the API contract changes.** The backend rejects unknown body fields
   (`forbidNonWhitelisted`), and the frontend deploys **automatically** after CI on `main` with
   no approval gate. A frontend that sends a new field before the backend accepts it breaks
   that request for everyone.
3. **Migrations are gated.** A normal backend deploy aborts untouched if a migration is
   pending. Migrations run only through a manual `Deploy` dispatch with
   `apply_migrations=true` **and** the owner's approval of the protected
   `production-migrations` environment (§4). Never bypass this.
4. **Test data only.** Never copy production data into tests, logs, reports or local storage.
   Never run destructive or unauthorised testing against production.
5. **Never claim "100% secure".** Reports describe the specific risks a change reduces.
6. **No AI model names** in commits, PRs, code or docs.
7. **The VPS disk is not managed** (§11). Deploys never prune Docker images. It filled up on
   9 October; it will again.

---

## 1. What Atlas is

A multi-tenant education SaaS. One platform hosts many **Organizations** (clients). Each
Organization owns **Academies**. Each Academy has a management dashboard, learners, and a
public, themed website (subdomain or custom domain). UI is bilingual EN/AR with full RTL.

| Actor | In code |
|---|---|
| Platform Owner (runs Atlas) | `users.is_platform_owner`; `PlatformOwnerGuard`; routes `/dashboard/platform/*` |
| Organization / Client Owner | `organization_memberships.role` (string: `owner`, `manager`, `instructor`, else member). Permissions: backend `src/tenancy/constants/organization-permissions.constants.ts`. Money routes are owner-only (`@OrganizationPermissions`) |
| Academy staff | `enum AcademyMemberRole { owner administrator manager instructor staff }` (`prisma/schema.prisma`); `@AcademyRoles(...)` enforced by `AcademyScopeGuard` |
| Learners | `academy_students` + `enrollments`; sign in on the academy surface |
| Sessions | `enum SessionSurface { management academy }`; a session is bound to its surface (and academy) |

---

## 2. Repositories and stack

**Frontend (`atlas`)**: React 18, Vite 5, TypeScript, TanStack Query 5, react-router 6,
i18next, react-hook-form, Tailwind + shadcn/Radix, Vitest 3, Playwright, pnpm.
- `src/app` (layouts, navigation, providers, routes), `src/features/*` (one folder per
  domain: academy, auth, billing, course, customer-requests, learner, live-sessions, platform,
  platform-commerce, platform-observability, platform-zoom, profile, public-website, tenant,
  website, …), `src/services` (api, query, offline), `src/shared`, `src/localization/resources/{en,ar}`.
- `server/ssr/` is the Node SSR renderer for public academy pages; Caddy serves the SPA and
  falls back to it whenever the renderer is off or failing.
- Path aliases (`@app`, `@components`, `@features`, `@hooks`, `@utils`, `@api`, `@types`, …)
  in `vite.config.ts` and `tsconfig*.json`. No deep relative imports.
- Navigation for every dashboard is one config: `src/app/navigation/navigation.config.ts`
  (sections are hidden automatically when no item in them is visible).

**Backend (`atlas-backend`)**: NestJS 10, Prisma 5, PostgreSQL 16, Redis 7 + BullMQ, R2/S3.
- `src/<module>`: academy, analytics, audit-log, billing, certificates, communications,
  community, concurrency, course, course-commerce, customer-requests, dashboard, database,
  domain, forensic-watermark, health, identity (auth, sessions, 2FA, OTP, Google, devices,
  **phone**, account deletion), instructor, learning, live-sessions, media, notifications,
  observability, onboarding, plans, platform, platform-contact, provisioning, public-website,
  retention, search, security-events, tenancy, website.
- `prisma/` — `schema.prisma`, **171 migrations** (latest
  `20261110000400_user_phone_unique_staff_read`). Migration prefixes `2026111…` are ordering
  keys, not dates.
- `deploy/` — `deploy.sh`, `docker-compose.prod.yml`, `backup.sh`, verify scripts, harness
  `deploy/test/deploy-script.test.sh`.
- `test/` — about 211 e2e specs (`*.e2e-spec.ts`).

---

## 3. Invariants that must never break

| Area | Rule | Where |
|---|---|---|
| RLS context | All tenant data access goes through `TenancyContextService`: `runInTenantContext(orgId)`, `runInUserContext(userId)`, `runInTenantAndUserContext(orgId,userId)`; each opens one transaction with transaction-local `set_config`. `runWithoutContext` only for anonymous previews and refusal logging. No context → zero rows | backend `src/tenancy/services/tenancy-context.service.ts`, `src/database/user-context.ts` |
| Definer functions | Cross-scope reads are SECURITY DEFINER SQL functions, `REVOKE ... FROM PUBLIC`, `GRANT EXECUTE ... TO "atlas_app"`. They decide from `app.current_user_id`, never from a caller-supplied identity | `prisma/migrations/*` |
| Guards | `JwtAuthGuard`, `ManagementSessionGuard`, `PlatformOwnerGuard`, `OrganizationMembershipGuard` + `@OrganizationPermissions`, `AcademyScopeGuard` + `@AcademyRoles`. Path IDs are re-verified. No impersonation or admin-set-password routes | `src/**/guards` |
| Public routes | Every public route is listed, with a reason, in the public-route inventory spec (47) | backend tests |
| Subscription scope | Every route is classified for expired subscriptions (`@SubscriptionScope` / `@AllowInactiveSubscription`); the inventory spec fails on new unclassified routes | `subscription-scope-inventory.spec.ts` |
| Sessions | Refresh token only in the `__Host-atlas_session` cookie (HttpOnly, Secure, SameSite=Strict). Access token: 15-min JWT in memory. `localStorage` holds only `atlas:session='1'`. Absolute caps 30 d (management) / 90 d (academy) | `src/identity/session-cookie/*`; `docs/CSP_AND_TOKEN_STORAGE.md` |
| CSRF | Only `/auth/refresh` and `/auth/sign-out` read the cookie; both require a same-origin `Origin` | `auth.controller.ts` |
| MFA | Org Owners and Platform Owners get a second factor on every new browser. Platform Owners must use an authenticator app from `PLATFORM_OWNER_TOTP_REQUIRED_FROM` (default **2026-10-24**) | `src/config/configuration.ts`, `two-factor.service.ts` |
| Media | Everything via `/api/v1` on the same origin. Private files only through short-lived HMAC links. Protected bucket ≠ public bucket or the app refuses to boot | `src/media/controllers/*` |
| CMS concurrency | Page update/publish carry `expectedVersion` (also plans and add-ons) | `src/website`, `src/concurrency` |
| Entitlements | Plan family/tier, `EntitlementEnforcementService`, add-on `catalog_status` (`draft`/`coming_soon`/`published`); non-published fails closed | `src/plans/**` |
| Forensic watermark | Every video grant, preview and live join carries a per-viewer code; **fails closed** (503 if no code). `forensic_watermarks`: no FKs, FORCE RLS, Platform Owner reads only, AES-256-GCM snapshot, 730-day retention. **Never rotate `WATERMARK_SNAPSHOT_KEY`** (or the payment key it falls back to) | `src/forensic-watermark/`; `docs/FORENSIC_WATERMARK.md` |
| Offline | Server authoritative. Default-deny allowlist per origin/surface/user in IndexedDB; never credentials, media, grants, signed URLs, quiz sessions, grades or other users' data. Wiped on sign-out/user switch. Only replay-safe writes queued. Kill switch `VITE_OFFLINE_SHELL=off` | frontend `src/services/offline/*`, `public/sw.js` |
| Notifications | `context` and `academy_id` derived server-side; never trust a client-sent scope | Engineering report ADR-5 |
| Credential links | Built on the Atlas subdomain/platform URL, never on a tenant custom domain | Engineering report |
| **Phone numbers** | **One account per number** (unique index `user_phones_phone_e164_key`). `user_phones` RLS stays **self-only**. Others read numbers only through definer readers (below). A duplicate returns 409 `errors.auth.phoneTaken` on field `phoneNumber` with **no owner information** | backend `src/identity/phone/user-phone.service.ts`; `docs/USER_PHONE.md` |

### 3.1 Phone visibility (since 10 Oct)

| Viewer | Sees learners' phones? | How |
|---|---|---|
| The account itself | Its own number | `GET/PUT/DELETE /users/me/phone` |
| Academy owner / administrator / manager, and the Organization owner | Yes, for students of that academy: roster list and student detail (`phone` field) | `academy_student_phones(academy_id, user_ids[])` → `can_manage_academy_students` |
| Instructor, staff, learners, outsiders | **No** (the field is absent from the response) | readers return no rows |
| Platform Owner | Yes, for users who are students of any academy: `/platform-users` list and detail | `platform_student_phones(user_ids[])` → `is_platform_owner` + `academy_students` |

Registration (`POST /auth/register`) and `PUT /users/me/phone` pre-check with
`user_phone_taken(e164, exclude_user_id)` (boolean only); the unique index is the real
arbiter (a race maps P2002 → the same 409). Re-entering your own number is allowed.
Registration stays rate-limited (`RegisterRateLimitGuard`); profile changes spend the
6/hour budget before the check. The "already in use" answer is an inherent, accepted
disclosure (product requirement); it never says which account.

---

## 4. Production and deployment

- **Host:** one Oracle Cloud ARM VPS. Images are `linux/arm64`. `/opt/atlas/` holds
  `deploy.sh`, `docker-compose.yml`, `backup.sh`, `.env`, `.last-good`, `.deploy.lock`,
  `monitoring/`. Services: postgres 16, redis 7, backend, caddy (frontend image), ssr
  renderer, prometheus, alertmanager. Nightly DB backup to a separate R2 bucket.
- **Caddy** terminates TLS (Cloudflare DNS-01 for the wildcard; `tls internal` catch-all for
  custom domains behind Cloudflare), proxies `/api/*` to the backend, sends academy pages to
  the renderer when `ATLAS_SSR=on`.

| Workflow | Trigger | Does |
|---|---|---|
| backend `backend-ci.yml` "Backend CI" | PR, push to main | lint, typecheck, migrations on an empty DB + drift check, unit tests, build; e2e in 3 shards × 2 runs (Postgres, Redis, SeaweedFS). Aggregate check: **"Backend CI passed"** |
| backend `deploy.yml` "Deploy" | after Backend CI on main; manual dispatch | builds/pushes `ghcr.io/zeyadelbadawi/atlas-backend`; normal deploy runs `deploy.sh` **without** migrations (aborts untouched if one is pending); dispatch with `apply_migrations=true` uses the protected **`production-migrations`** environment and runs `--with-migrations` (backup first) |
| frontend `ci.yml` "CI" | PR, push to main | `pnpm lint`, `typecheck`, `test`, `build`, `build:ssr`, `test:ssr`; theme baseline + axe Playwright job |
| frontend `deploy.yml` "Deploy" | after CI on main | builds the Caddy/SPA image (carries previous builds' chunks for stale tabs) and the SSR image; runs `deploy.sh --frontend-only`. **No approval gate.** About 10 minutes |

**`deploy.sh`:** `--sync-env`, `--frontend-only`, `--with-migrations`, `--rollback`
(re-pins `.last-good` digests; never reverts migrations), `--check-rollback-record`,
`--preflight`. Shared `flock` lock for both repos. Health gates on backend and Caddy.

**Standard release order** (used for every release so far):
1. Merge the backend PR. The automatic backend deploy stops by design if a migration is pending.
2. Dispatch backend `Deploy` on `main` with `apply_migrations=true`; the owner approves
   `production-migrations`. It backs up, migrates, recreates the backend, records last-good.
3. Only then merge the frontend PR; its deploy follows automatically.
4. Verify by HTTP (unauthenticated routes return 401, new chunks are served) and with the
   owner's signed-in checklist.

**Base images:** the frontend Dockerfile pulls through `mirror.gcr.io` (Docker Hub's
anonymous limit failed two deploys). The backend Dockerfile still pulls from Docker Hub.

---

## 5. Local development and tests

**Disposable local stack (both repos):** backend `scripts/e2e-local-stack.sh`
(`up` | `start` | `serve` | `env` | `stop` | `down`). Postgres on 127.0.0.1:54329, Redis on
63799, data in `/tmp/atlas-e2e-stack`; env in `/tmp/atlas-e2e-stack/backend.env`. It refuses
any non-localhost URL. Needs `npm i --prefix /tmp/atlas-tools s3rver`.

**Backend**
- `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` (unit).
- e2e (needs a migrated **and seeded** DB, Redis, S3):
  `set -a && . /tmp/atlas-e2e-stack/backend.env && set +a && export NODE_ENV=test && npx jest --config ./test/jest-e2e.json <files>`
- Do **not** run `prisma format` for a small schema edit: it reformats unrelated models.
- Known environment-only local failures: `p64` protected-store unsigned read (s3rver),
  `learning-quiz` with `FLAG_QUIZ_ENGINE_V2_MODE=on`, `CR-02` with many local Platform Owners.
- e2e suites share one database: give each suite its own fixed phone numbers (unique index)
  and clean them in `beforeEach`.

**Frontend**
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (Vitest), `pnpm build`, `pnpm build:ssr`, `pnpm test:ssr`.
- Playwright journeys `e2e/j*.spec.ts` against the local stack (`pnpm test:e2e`).
  Sign-up helpers fill a unique phone number (`uniqueTestMobileNumber()` in `e2e/support/atlas.ts`).

---

## 6. Feature inventory (production)

| Area | State |
|---|---|
| Identity | Email/password (Argon2id), cookie sessions with reuse detection, email OTP on new devices, TOTP, trusted devices and device limits, Google sign-in behind `FLAG_AUTH_GOOGLE_MODE`, account deletion |
| Phone | Required at sign-up (management and academy websites) with a searchable country select. **Unique across all accounts.** Visible to the account, to academy owner/administrator/manager and the Org owner (their students), and to the Platform Owner (academy students). Not visible to instructors. **No verification** yet |
| Academies and websites | Organizations, academies, members (owner can remove staff), invites, provisioning, subdomains and custom domains, website builder/CMS, SSR renderer |
| Themes | Selectable: `modern-education` (default), `atelier`, `manara`, `riwaq`. Retired from selection: `premium-academy`, `corporate-learning`, `minimal-editorial`, `bold-creative` |
| Learning | Courses, curriculum, enrolment, progress, quizzes/exams (integrity signals), assignments, grading, certificates, announcements, blog, forum; Normal and Premium video tiers |
| Payments | Manual methods only: bank transfer, wallet transfer, InstaPay, with proof upload and review. **No card gateway connected** (registry is ready for an adapter). Course commerce, commission, academy payouts |
| Subscriptions | Plans (family/tier), trials and gifts, add-ons with `catalog_status`, usage/quotas, lifecycle and retention |
| Live sessions (Zoom) | Built end to end; the add-on is `coming_soon` while Zoom approvals are pending |
| Customer requests | Academy owners/administrators ask Atlas for logo, domain, theme, custom section, custom feature; Platform Owner console with routing and email |
| Communications | Brevo → Resend provider chain, outbox, EN/AR templates, campaigns, preferences, webhook replay protection |
| Observability | Prometheus + Alertmanager (Slack), Sentry, Platform Owner observability pages, RUM (10 % sample) |
| Offline | Dashboard shell and allowlisted reads; academy sites keep the learner's own data, lesson text (when granted) and replay-safe writes |
| Watermark | Mandatory per-viewer overlay on every video, tamper watchdog, Platform Owner lookup `/dashboard/platform/watermarks` |
| RTL | Root Radix `DirectionProvider`, `data-ltr-content` markers, `j47` crawler |

### 6.1 Client Owner sidebar (since 10 Oct)

- **Revenue & payouts** (`academy-revenue`) is not in the sidebar. The page and route
  still exist and stay owner-only.
- The two "Requests" entries are named **"Atlas service requests"** (`academy-requests`:
  logo/theme/section requests to Atlas) and **"Course orders"** (`academy-orders`:
  learners' course orders). AR: «طلبات خدمات أطلس» / «طلبات شراء الدورات».
- **One Add-ons entry**: `tenant-add-ons` under Cloud Services, which shows the add-ons on
  the subscription and the store's available ones. The old "Browse add-ons" entry is gone;
  its Live Sessions install/enable page (`/dashboard/add-ons`) is reached from the Live
  Sessions pages.
- **Student Analytics** sits in the Academy section (organization-wide page, visible with or
  without an active academy).
- Pinned by `src/app/navigation/client-owner-sidebar-navigation.test.ts`.

---

## 7. Recent history (newest first)

| Date | What | PRs |
|---|---|---|
| 10 Oct | Unique phone numbers; owner/manager/Platform Owner phone visibility; Client Owner sidebar cleanup | atlas-backend#43, atlas#39 |
| 9 Oct | Security hardening (ATO F1–F13, authorization A1–A11, web W1–W15), offline academy sites, phone at sign-up, Arabic RTL, forensic watermark; deploy fixes (Caddy cross-compile, SearchInput race, `mirror.gcr.io`) | atlas-backend#42, atlas#34–#38 |
| 8–9 Oct | Platform-wide initiative: notification isolation, stale-tab recovery, header/profile, plan feature cleanup, device identity, customer requests, local-first dashboard | see `ATLAS_ENGINEERING_INITIATIVE_REPORT.md` |
| 4–7 Oct | Themes 2–4 (Atelier, Manara, Riwaq), manual payments (bank, wallets, InstaPay), AR line spacing, academy switcher, footers | atlas#18–#33, atlas-backend#28–#41 |
| 1–3 Oct | Theme 1 + SSR, P1–P8 (content library, full-screen exams, integrity, RUM, journeys), learner portal, UX/real-time initiative | |
| Late Sep | Cookie sessions, CSP, credential isolation, Google sign-in, onboarding, commerce, observability | |

Full detail lives in the reports listed in §13.

---

## 8. Roles and permissions quick reference

- Organization `owner` holds every `tenant.*` permission including billing; Client Owner
  dashboard money pages require `tenant.billing.view`.
- Academy `owner`/`administrator` may manage requests and messages; `manager` manages
  students; `instructor` teaches and never sees learner phone numbers.
- Platform Owner surfaces are hidden from tenant navigation (`tenantSurface: true` items are
  removed for Platform Owners) and are guarded server-side regardless of the UI.

---

## 9. Secrets — names and locations only

- Production values live only in `/opt/atlas/.env` on the VPS and in GitHub Actions secrets
  and variables. A gitignored `ATLAS_HANDOVER_SECRETS.local.md` may record locations only.
- Backend env names: see `atlas-backend/.env.example` and `src/config/env.validation.ts`
  (core DB/Redis URLs, R2 public/protected/backup buckets, JWT and session keys,
  `PLATFORM_OWNER_TOTP_REQUIRED_FROM`, payment and watermark keys, video provider, Cloudflare,
  Brevo/Resend, Zoom, Google, Sentry/metrics, `RUM_ENABLED`, `FLAG_*`).
- GitHub secrets used by deploys: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, and on the
  `production-migrations` environment `MIGRATION_DEPLOY_USER`, `MIGRATION_SSH_KEY`; plus Zoom,
  Google, email and Slack alert secrets. Repository variables: `ATLAS_SSR`, `RUM_ENABLED`,
  `EMAIL_PROVIDERS`, `EMAIL_FROM_NAME`, `PLATFORM_WEB_URL`, `FLAG_*`.
- Frontend build-time values are public (`VITE_*` in `.env*`).

---

## 10. Operations actions still open (need production access)

1. Purge the Cloudflare cache for `/api/v1/public/media/*` (W1).
2. Unset `VIDEO_PLAYBACK_TOKEN_TTL_SECONDS` if set (W5).
3. Rotate `BREVO_WEBHOOK_SECRET` (it travels in the URL).
4. Never rotate the watermark key source in use.
5. Confirm click tracking is off for credential emails in Brevo and Resend (F13).
6. Run the long-lived backend with a non-superuser `DATABASE_URL` (W9).
7. Lock the origin to Cloudflare (W10).
8. Confirm the leak-tracing privacy wording; the configurable retention range is undisclosed.
9. **Platform Owners: set up an authenticator before 2026-10-24.**
10. Run the signed-in production checklists (security report §9 and §4.4).

## 11. Deferred: VPS disk capacity and Docker image retention — **NOT resolved**

On 9 October the disk filled (421 images, 42 GB); deploys #263/#264 failed until a manual
`docker image prune -a`. `deploy.sh` still never prunes and compose sets no log rotation.
Each release adds new images. Recommended: prune after a healthy deploy keeping current and
last-good digests; check free space before pulling; add `max-size`/`max-file` log rotation;
add a disk-usage alert. Current free space: not measured.

## 12. Backlog

- **Security/data:** A8 (RLS for trial/gift redemptions, `live_provider_events`, payment
  provider config; narrow `users_context_select`); W1 legacy object migration to the
  protected bucket; customer-request notifier is O(owners) inside one transaction.
- **Phone:** verification needs a provider contract (WhatsApp OTP is paid). Any future
  account-data export must include `user_phones`. If staff need to search by phone, add it
  inside the definer readers, never by widening `user_phones` RLS.
- **Offline:** durable receipts (`learner_operation_receipts`, `lesson_progress.last_op_*`,
  `assignment_submissions.draft_revision`), per-academy offline switch, delta endpoints,
  `/sw.js` `no-cache`.
- **Deploy:** Docker Hub login + digest pinning (and move the backend Dockerfile to the
  mirror or a login); native ARM runners; health path through Caddy.
- **Product:** card payment gateway adapter; Zoom launch after approvals; customer-request
  attachments and SLA.
- **Quality:** stabilise flaky journeys (J6, J34, J35, J36, J41, J8b); axe/visual baselines
  for new pages; import cycles (`docs/TECHNICAL_DEBT.md`).

## 13. Where to read more

| Topic | Path |
|---|---|
| Latest security, offline, phone, watermark, this release | `ATLAS_SECURITY_HARDENING_LOCAL_FIRST_REPORT.md`, `ATLAS_SECURITY_HARDENING_DETAILED_WORK_LOG.md` |
| Previous initiative (ADRs 1–10) | `ATLAS_ENGINEERING_INITIATIVE_REPORT.md` |
| Architecture | `Reports/ARCHITECTURE.md`; backend `Reports/ARCHITECTURE.md`, `Reports/ATLAS_BACKEND_MASTER_PLAN.md` |
| Coding rules | `Reports/📘 Atlas AI Constitution.md`, `Reports/📘 Atlas AI Project Brief.md` |
| Sessions/CSP | backend `docs/CSP_AND_TOKEN_STORAGE.md`, `docs/AUTHENTICATION_COMPREHENSIVE_AUDIT.md` |
| Phone | backend `docs/USER_PHONE.md`, frontend `docs/USER_PHONE.md` |
| Watermark | backend `docs/FORENSIC_WATERMARK.md` |
| Payments | backend `Reports/MANUAL_PAYMENT_METHODS.md`, `docs/ACADEMY_MANUAL_PAYMENTS.md` |
| Plans/add-ons | backend `docs/plans/`, `SAAS_OWNER_ADD_ONS_MANAGEMENT.md` |
| Zoom | backend `docs/live-sessions/LIVE_SESSIONS_STATUS.md`, `SAAS_OWNER_ZOOM_OPERATIONS_CENTER.md` |
| Email | backend `docs/COMMUNICATIONS_EMAIL_NOTIFICATION_CATALOG.md` |
| Observability/RUM | backend `docs/PLATFORM_OWNER_OBSERVABILITY_GUIDE.md`, `Reports/REAL_USER_MONITORING.md` |
| Themes/SSR | `Reports/THEME_*_PLAN.md`, `Reports/THEMES_2_5_RETIREMENT.md`, `Reports/SSR_ARCHITECTURE_ANALYSIS.md` |
| Tests | `e2e/README.md`, backend `Reports/MANUAL_TEST_RUNBOOK.md` |

## 14. Superseded handover files (history only)

`ATLAS_HANDOVER.md` (25 Sep), `docs/ATLAS-CLAUDE-HANDOVER.md`; backend `HANDOVER.md` (now a
pointer to this file), `docs/ATLAS-CLAUDE-HANDOVER.md`, `docs/ATLAS_PROJECT_HANDOVER.md`,
`docs/ATLAS_PROJECT_CURRENT_STATE.md`, `docs/ATLAS_PHASE2_FINAL_HANDOVER.md`,
`docs/ATLAS_HANDOVER_CHECKLIST.md`, `docs/ATLAS_CLOUD_SESSION_BASELINE.md`,
`Reports/SESSION_HANDOFF_2026-08-26.md`, `Reports/SESSION_HANDOFF_2026-08-27.md`.

## 15. How to start a new feature

1. `git fetch` both repos; branch from `origin/main` in each repo you touch.
2. Read the relevant rows of §3 and the module's doc in §13.
3. Backend: add a migration only when needed; new cross-scope reads are definer functions
   with `REVOKE`/`GRANT`; classify new routes in the public-route and subscription-scope
   inventories; add e2e coverage for authorization (who may and who may not).
4. Frontend: follow the feature-folder pattern; add EN **and** AR strings; mark LTR values
   with `data-ltr-content`; new sidebar items go in `navigation.config.ts` with permissions.
5. Run lint, typecheck and the affected tests in both repos before pushing.
6. Release in the order in §4. Update the latest report, and this handover's §6/§7/§12.
