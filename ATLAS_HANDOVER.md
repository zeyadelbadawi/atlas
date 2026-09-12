# ATLAS — COMPLETE PROJECT HANDOVER

**Generated:** 12 September 2026, by Claude (Opus 5), as a documentation-only task.
**Method:** discovered from the real repositories (`git log`, `git ls-files`, direct file
reads, live `curl` against production). Nothing here was taken from memory of a prior
conversation without checking it against the code.

> **Where this document and the repository disagree, the repository wins.** Treat a
> disagreement as a signal to investigate, not to pick a side. No application code was
> modified to produce this file.

**This file supersedes the previous `ATLAS_HANDOVER.md` (dated 2026-08-23).** That
version described a frontend-only project and stated "No backend exists." That has not
been true for weeks: a full NestJS backend exists, is deployed, and runs in production.

---

## 0. READ THIS FIRST — the three things most likely to mislead you

**1. There are TWO different things called "Phase 11".** They are unrelated.

| | What it is | Status |
|---|---|---|
| **Roadmap Phase 11** | "Atlas UI / Business Components" — Revenue Card, Trial Countdown, Academy Health Score, Storage/Usage widgets in the design-system package | **NOT STARTED** |
| **"Phase 11" commits/reports** | An ad-hoc workstream: Dashboard/CMS UX, website polish, validation, support centre, sessions, publish/unpublish | **Done and deployed** |

Backend commit `d16d657` "Phase 11 — publish/unpublish, support centre, session location
& activity" and the files `PHASE_11_*.md`, `test/phase11-1-*.ts`, `test/phase11-8-*.ts`
all belong to the **second** row. None of them implement roadmap Phase 11.

**Do not mark roadmap Phase 11 complete because you found a file named `phase11-…`.**

**2. Some components look like Phase 11 but are not.** `src/features/dashboard/components/
RevenueSummary.tsx` and `UsageSummary.tsx` already exist. They are **Phase 8** dashboard
summaries. Roadmap Phase 11 asks for independently-loading, independently-permissioned
*business components in the design-system package* — verified absent: `RevenueCard`,
`TrialCountdown`, `AcademyHealth*`, `StorageUsage*` return **no matches** in `git ls-files`.

**3. TOTP 2FA is already fully implemented, front and back.** The roadmap deferred it
(Phase 10 required only an insertion point), but it was built afterwards in backend commit
`e1aee90` "Implement real TOTP two-factor authentication". Verified present:

- Backend: `src/identity/controllers/two-factor.controller.ts`,
  `services/two-factor.service.ts`, `services/totp-secret-cipher.service.ts`,
  `dto/two-factor.dto.ts`; Prisma models `UserTwoFactor`, `TwoFactorRecoveryCode`, and a
  `twoFactorRequired` flag; e2e suite `test/phase10-3-two-factor.e2e-spec.ts`.
- Frontend: `src/features/auth/components/TwoFactorChallengeForm.tsx`,
  `src/features/profile/components/TwoFactorCard.tsx`,
  `src/services/identity/two-factor.service.ts`.

**If asked to "build 2FA", verify what exists first — do not rebuild it.**

---

## 1. What Atlas is

A **multi-tenant SaaS education platform**. An Organization (the paying tenant) operates
one or more Academies. Each Academy runs courses, learning, instructor operations and
community features, and can publish its own public marketing website on a subdomain or a
custom domain. Atlas itself (the Platform) layers subscriptions, plans, entitlements,
provisioning, billing and a Platform Owner control plane on top.

**Roles:** Platform Owner (Atlas staff, cross-tenant) → Organization Owner (the customer)
→ Academy Manager / Administrator → Instructor → Student → anonymous public visitor.

**Production:** <https://atlass.dpdns.org> · academy sites at
`https://{slug}.atlass.dpdns.org` (e.g. `elzozo.atlass.dpdns.org`).

---

## 2. Where the code actually lives

| | Path on this machine | GitHub remote | Branch |
|---|---|---|---|
| Frontend | `/Users/ziadelbadawi/Downloads/atlas-new/atlas-front` | `github.com/zeyadelbadawi/atlas` | `main` |
| Backend | `/Users/ziadelbadawi/Downloads/atlas-new/atlas-backend` | `github.com/zeyadelbadawi/atlas-backend` | `main` |

**The parent directory `/Users/ziadelbadawi/Downloads/atlas-new/` is NOT a git
repository.** It is a documents folder holding roadmap and report `.md` files that are
**not tracked by either repo** (`ATLAS_PRODUCTION_ROADMAP.md`,
`ATLAS_BACKEND_MASTER_PLAN.md`, the `PHASE_*` and `ATLAS_SCALABILITY_*` reports, …).
They are local-only. If they matter to you, read them there; do not expect them in a
fresh clone.

Production deploys from `main` in both repos. There is no staging branch.

---

## 3. Git state at handover time

Verified by `git fetch` + `git rev-list --left-right --count`:

| Repo | Last APPLICATION-CODE commit | Handover commit (docs only) |
|---|---|---|
| `atlas-front` | `0304db7` | `8ca3552` |
| `atlas-backend` | `4c9a0b6` | `e64ade6` |

The left column is the code production is running. The right column is this
document and a `.gitignore` entry — **documentation only, no application code**.
Both repos were in sync with `origin/main` before the handover commit and are in
sync after it.

Both local clones were **32 (frontend) and 37 (backend) commits behind** at the start of
this handover and were fast-forwarded with `git pull --ff-only`. Neither had local
commits or local changes, so nothing was discarded.

**Production runs the application code in the left column** — confirmed against the
GitHub Actions run for each repo (`gh run list --json headSha`). Verify it yourself before
your first change; see §10.

### How to safely synchronise before your first change

```bash
cd /Users/ziadelbadawi/Downloads/atlas-new/atlas-front   # and again for atlas-backend
git status --porcelain --untracked-files=all   # MUST be empty before you pull
git fetch origin
git rev-list --left-right --count origin/main...HEAD    # "<behind> <ahead>"
git pull --ff-only origin main                          # refuses rather than merging
```

`--ff-only` is the safe form: if the histories have diverged it **refuses** instead of
creating a merge. If it refuses, stop and investigate — do not `git reset --hard`, and do
not force-push.

### Files that must never be committed

- `atlas-backend/.env` — real production-shaped secrets. Already in `.gitignore` (line 9).
- `ATLAS_HANDOVER_SECRETS.local.md` — see §11. An explicit `.gitignore` entry was added
  for it in both repos, because neither repo's existing patterns would have matched it.
- `atlas-front/.env` **is tracked**, deliberately: it contains only `VITE_API_BASE_URL`,
  a build-time public URL. Checked — no secret-shaped assignments. Leave it alone.

---

## 4. Architecture

### 4.1 Stack

**Backend** — NestJS 10 + Prisma 5 + PostgreSQL 16, Redis 7, BullMQ. Node ≥ 20 (`engines`
in `package.json`). Modules under `atlas-backend/src/`:

```
academy  analytics  audit-log  billing  common  community  concurrency  config
course  course-commerce  dashboard  database  domain  health  identity  instructor
learning  media  notification-events  notifications  observability  plans  platform
provisioning  public-website  redis  search  tenancy  website
```

**Frontend** — React 18 + TypeScript + Vite, React Router v6, TanStack Query, Tailwind +
shadcn/ui, React Hook Form + Zod, `react-i18next` (EN/AR + RTL), axios (always via the
one `apiClient`), Vitest.

Mandatory frontend layering, unchanged since the earliest phases:
`Component → Hook → Service (extends BaseService) → apiClient → backend`.

### 4.2 Tenancy and the security model — **the thing you must never break**

Atlas enforces tenancy **twice, independently**:

1. **Application layer** — guards and service-level assertions produce real 403s.
2. **PostgreSQL Row-Level Security** — the app connects as an unprivileged `atlas_app`
   role under `FORCE ROW LEVEL SECURITY`. Even a bug in the app layer cannot read
   another tenant's rows.

The bridge is `TenancyContextService` (`src/tenancy/services/`), with
`runInTenantContext` / `runInUserContext` / `runInTenantAndUserContext` setting
`app.current_user_id` / tenant session variables that the RLS policies read.

**Boundaries, in order of containment:** Platform → Organization → Academy → Course.
An Organization member is **not** automatically an Academy member, and vice versa. This
is load-bearing and easy to get wrong — for example billing is Organization-scoped, so an
Academy **Manager is correctly refused** on billing endpoints (`403
errors.tenancy.notAMember`), even though they can manage that academy's media, pages and
announcements.

The established discipline is **"guard decides, RLS independently agrees."** Keep both.
Never "fix" a 403 by loosening a guard without understanding which of the two layers
produced it.

Migrations live in `atlas-backend/prisma/migrations/` (**69** migration directories at handover).
Many are RLS policy migrations; read them before changing any policy.

### 4.3 Authentication and sessions

- JWT access tokens (short-lived, ~15 min — you will see 401s in long browser sessions;
  that is normal, reload) + refresh tokens.
- `RefreshToken` rows carry IP, user-agent and last-used, powering real device/session
  listing and **immediate** revocation (Phase 10, commit `7227e93`). Revocation must take
  effect against the token-validation path, not just the DB row.
- TOTP 2FA as described in §0.

### 4.4 Media and storage — read this before touching media

Media is stored in **Cloudflare R2**, but **Atlas serves the bytes itself**.

`GET /api/v1/public/media/academies/{academyId}/{uuid}.{ext}` →
`src/media/controllers/public-media.controller.ts`.

The stored URL is **relative** and derived from `storageKey`. This is deliberate and was a
production bug fix (backend `2911f6d`): the previous "public URL" pointed at R2's S3 API
endpoint, which requires a SigV4 signature, so every `<img src>` rendered broken. R2
public access is a **bucket-level setting configured out-of-band in Cloudflare** — it
cannot be fixed from application code, which is exactly why depending on it failed
silently.

A relative URL resolves correctly on the dashboard, on every academy subdomain and on
future custom domains with **zero per-origin configuration**. **Do not "improve" this into
an absolute URL.** Submission attachments share this pipeline by design.

### 4.5 Public academy websites, CMS, i18n

- Hostname → academy resolution; only `status: 'published'` configurations resolve
  publicly (the repository filters in the WHERE clause — unpublishing genuinely removes
  the site, it is not a cosmetic flag).
- CMS pages are composed of typed **sections**; a save replaces the whole `sections`
  array, which is why optimistic concurrency matters (§5).
- **Bilingual EN/AR with full RTL.** Section content is localized `{en, ar}`. **`en` is
  required; `ar` is optional** — and "optional" includes being absent, fixed in `8659e71`.
- Arabic locale is **`ar-EG`**, which renders Arabic-Indic digits through `Intl`.

### 4.6 Billing, plans, entitlements, trials

- Organization creation grants **NO trial**. It writes a subscription row with
  `status: 'expired'`, `trialEndsAt: null`. A trial is something the user explicitly
  starts from the Plans page and confirms (`confirm: true` is enforced **server-side**).
- Trial anti-abuse: `TrialRedemption.subjectHash` is **`@unique`** (a salted hash of the
  canonical email). The claim is `INSERT … ON CONFLICT DO NOTHING` inside the caller's
  transaction — no read-then-write window. Redemptions are **insert-only across the entire
  backend** (only `createMany`, `findUnique`, `count` exist), so cancelling never restores
  eligibility. Both FKs are `SetNull`, never `Cascade`, so history survives deletion.
  IP/user-agent are recorded but **never consulted** by the decision.
- Payments are **manual transfer** today. Creating a Checkout or a Payment is **not** a
  purchase — only a backend-confirmed `Payment.status === 'succeeded'` is.
- Entitlement enforcement: `SubscriptionAccessInterceptor` refuses mutations for
  inactive subscriptions; reads keep working, sign-out keeps working, grace period is
  **not** locked.

### 4.7 Observability, rate limiting, security headers

- Sentry, enabled only when `SENTRY_DSN` is set; no-ops otherwise. **Never hardcode a DSN.**
- Redis-backed global throttler; per-IP limits on sign-in/register/password-reset.
  `app.set('trust proxy', 'loopback, linklocal, uniquelocal')` — a trust **list**, never
  `true`, or clients could forge `X-Forwarded-For` and evade rate limiting.
- **Security-header ownership is now split deliberately** (frontend `4d86dd3`): Caddy sets
  the four headers on the documents it serves; helmet sets them on `/api/*`. Neither
  duplicates the other. See §9.

---

## 5. Concurrent editing — verified, and easy to break

CMS page saves use **optimistic concurrency**. `expectedVersion` is **REQUIRED** (backend
`8659e71`).

- Refused in the **service**, not the DTO, so the message is actionable
  (`400 errors.website.versionRequired` → "reload the page") rather than a field-level
  violation on a control the user never filled in.
- The version goes into the UPDATE's `WHERE` clause, so the **database** decides the race,
  not the gap between read and write. A mismatch → `409 errors.concurrency.staleVersion`
  with `submittedVersion`, `currentVersion`, `lastEditedByName`, `lastEditedAt`.
- **Every caller must send it.** The field was previously optional on the premise that
  "every Atlas editor sends it" — which was **false**: the SEO dialog (a whole-object
  replace) and the pages-list visibility toggle did not, so a stale SEO save silently
  destroyed a colleague's title and description. Fixed in frontend `97ae29c`.

**Presence** (`useEditingPresence`) is Redis-backed, 20s heartbeat, 60s TTL. It is
**advisory, never a lock** — a save succeeds while another session holds presence, so a
crashed browser cannot lock anyone out. It pauses on a hidden tab by design. Cross-academy
presence is refused (`403 errors.tenancy.notAMember`).

Verified in production with two real browsers, two real identities (Owner `ziad`, Manager
`mannger`): both saw the other's **real name and correct role**, localized per viewer;
Owner saved (v8→9); Manager's stale save was refused with a conflict dialog naming the
colleague; "Keep my changes" re-based to v10, proving it built **on** the other save.

---

## 6. Roadmap status

Canonical roadmap: `/Users/ziadelbadawi/Downloads/atlas-new/ATLAS_PRODUCTION_ROADMAP.md`
(untracked, phases defined at lines 121–660).

| Phase | Name | Status | Evidence |
|---|---|---|---|
| 1 | Tenancy & RBAC Correction | Complete | RLS migrations; `rls-*.e2e-spec.ts` suites |
| 2 | Entitlement & Plan Enforcement | Complete | `plans/`, entitlement interceptor, usage |
| 3 | Instructor ↔ Course Assignment | Complete | `instructor/`, course-instructor model |
| 4 | LMS Completion | Complete | `learning/`, `lms-authoring.e2e-spec.ts` |
| 5 | Onboarding & Provisioning | Complete | `provisioning/`, phase-5 report |
| 6 | Website, CMS & Branding | Complete | `website/`, phase-6 report |
| 7 | Domains, Cloudflare & Production Infra | Complete | `f5f2765`, `e03798e`, `aa122c6`, deploy/ |
| 8 | Support, Audit & Dashboards | Complete | `4a5769d` (+ two security fixes `69704e5`, `2a29441`) |
| 9 | Student & Instructor Experience Polish | Complete | `6725480` |
| 10 | Session Security & Hardening | Complete | `7227e93`; 10.6 deletion `fb559df` |
| **11** | **Atlas UI / Business Components** | **NOT STARTED** | components verified absent — §0 |
| 12 | Final Production Validation | **NOT STARTED** | depends on 11 |

**Work done outside the roadmap** (all complete and deployed): TOTP 2FA (`e1aee90`),
explicit free-trial flow + cancellation + admin dashboard (`dbc3bca`), disposable-email
blocking + signup verification (`363b9d0`), trial-farming fix + Sentry (`1852274`), the
ad-hoc "Phase 11" workstream (`d16d657`), the post-production fix pass (`44fd9e5`), the
business-UX/billing pass (`86905d0`, `a0971b7`), and the full QA pass (§7).

---

## 7. What the last QA pass found (and what it means for you)

Full report: `ATLAS_FULL_REAL_WEB_PRODUCTION_QA_REPORT.md` (in the frontend repo root).
Twelve production defects were found, fixed, deployed and re-verified. The ones that
change how you should work:

- **Six were invisible to a test suite.** They only appeared with two real browsers open
  at once, or in Arabic, or in a failure path. Tests alone would not have found them.
- **Bidi is a correctness issue, not cosmetics.** `×` and `:` are bidi-neutral, so in an
  RTL paragraph `240×160` renders as `160×240` and `16:9` becomes `9:16` — a different
  aspect ratio. Use `NumericExpression` (JSX) or `isolateNumericExpression` (strings) from
  `@components/data-display` / `@utils`. Do **not** rely on invisible U+200E marks in
  translation files; two legacy strings still do and are flagged as debt.
- **Backend error keys need frontend strings.** `errors.media.*` and `errors.website.*`
  did not exist in the frontend bundle, so real failures rendered blank. When you add a
  backend `messageKey`, add both language strings.
- **`errors:generic` is an object** (`{title, description}`), not a string. For a
  single-line message use `errors:generic.description`, or i18next returns a diagnostic
  string to the user.
- **Dates must use `useDateFormatter()`**. A bare `toLocaleDateString()` uses the
  *browser's* locale, not the user's language. A guard test re-scans `src` and will fail
  the build if the pattern returns.
- **Arabic numerals are unresolved by design.** Numbers use `Intl`+`ar-EG`
  (Arabic-Indic `٣٨١`), dates use date-fns+`ar` (Latin `12 سبتمبر 2026`). Both are
  internally consistent. **Which one Atlas standardises on is a product decision that has
  not been taken.** Do not unilaterally flip it.

---

## 8. Testing methodology — how Claude is expected to work on Atlas

This is not optional process; it is how the defects above were actually found.

```
AUDIT → PLAN → IMPLEMENT → TEST → REAL BROWSER VERIFICATION
      → DEPLOY → PRODUCTION VERIFICATION → REPORT
```

**Rules:**

1. **Inspect the real code before changing architecture.** Do not guess at structure,
   endpoint names, or DTO fields. Several defects in the last pass came from comments that
   asserted something the code did not do — e.g. "every Atlas editor sends it" was false.
2. **Test security boundaries explicitly**, from every role, by direct URL manipulation as
   well as normal navigation. Own-tenant `200`, other-tenant `403/404`, traversal `400`.
3. **Use real browser verification** whenever UI behaviour matters, and **multiple real
   identities** whenever multi-user behaviour matters. Two tabs of one account is not a
   two-user test.
4. **Distinguish pre-existing failures from regressions — by bisecting, not by asserting.**
   Check `src/` out at a pre-change SHA and re-run. In the last pass this proved one
   failure was mine (fixed) and the rest were not.
5. **Mutation-check important regression guards**: remove the fix, re-run, confirm the test
   actually fails. A guard that passes with the fix removed is not a guard.
6. **Verify the deployed SHA** matches what you tested (`gh run list --json headSha`).
7. **Never declare something fixed because a unit test passed.** "The upload succeeded" is
   not evidence the image renders; compare bytes, check `naturalWidth`, look at the screen.
8. **Never silently skip a failing test.** Investigate or document it explicitly.
9. **Document intentional non-verification** — say what you did not test and why.
10. **Stop rather than continue** if a critical gate fails.
11. **Preserve** tenant isolation, academy boundaries, role boundaries, and EN/AR + RTL.
12. **Never weaken a test to make it pass.** Correcting an assertion that encoded a bug is
    legitimate — and must be explained in the commit.

---

## 9. Production and deployment architecture

**Verified from `deploy/`, `.github/workflows/`, and live `curl`.**

- **Host:** a single Oracle Cloud VPS, **Ampere/ARM (`linux/arm64`)**. Images are
  cross-built on GitHub's x86_64 runners via QEMU.
- **Everything runs in Docker Compose at `/opt/atlas` on the VPS.** Four services
  (`deploy/docker-compose.prod.yml`):

  | Service | Image |
  |---|---|
  | `postgres` | `postgres:16-alpine` |
  | `redis` | `redis:7-alpine` |
  | `backend` | `ghcr.io/zeyadelbadawi/atlas-backend:latest` |
  | `caddy` | `ghcr.io/zeyadelbadawi/atlas-frontend:latest` |

  The `caddy` service **is** the frontend image: Caddy serving the built SPA and reverse
  -proxying `/api/*` to `backend:3000`.
- **Cloudflare** in front (DNS + edge). TLS via Caddy with the **DNS-01** challenge
  (`CLOUDFLARE_API_TOKEN`), which is what makes the **wildcard** `*.atlass.dpdns.org`
  certificate possible for academy subdomains.
- **Media** in Cloudflare R2; **backups** in a *separate* R2 bucket (deliberately different
  blast radius).
- **Backups:** `deploy/backup.sh`, run by a systemd timer `atlas-backup.timer`,
  **daily at 03:00**, dumping Postgres, uploading to R2, pruning past the retention window.

### The real deploy flow

```
git push to main (either repo)
  → GitHub Actions "Deploy" workflow
  → docker buildx build --platform linux/arm64  (QEMU cross-build)
  → push image to GHCR
  → ssh as the restricted `deploy` user to the VPS
  → bash /opt/atlas/deploy.sh
       docker compose pull
       docker compose up -d postgres redis   (migrations need a live DB)
       docker compose run --rm backend npx prisma migrate deploy
       docker compose up -d --remove-orphans
       health-check loop: GET localhost:3000/health, 30 tries × 2s
```

**Both repos' workflows SSH to the same VPS and run the same `/opt/atlas/deploy.sh`.**

Two things to know:

- **Deploy is NOT gated on CI.** `deploy.yml` triggers directly on push to `main`. The
  comment in the workflow explains why: `ci.yml`'s Lint step has been failing on `main`
  since before Phase 7 (~624 pre-existing prettier violations in test files). **A broken
  build will deploy.** Run the gates locally before pushing.
- **Migrations run with the superuser `DATABASE_URL`**; the app itself always connects as
  `atlas_app` (`APP_DATABASE_URL`). Do not collapse these two.

### Caddy configuration

`atlas-front/Caddyfile` — two site blocks:

1. `atlass.dpdns.org, *.atlass.dpdns.org` — wildcard cert via Cloudflare DNS-01.
2. `:443` catch-all — for academies on their own connected custom domains.

Both proxy `/api/*` to `backend:3000` and serve the SPA otherwise. Security headers live
in a `(security_headers)` snippet imported by the **static handlers only** — deliberately
not applied to `/api/*`, because the backend sets its own via helmet and the two used to
collide with conflicting values.

---

## 10. Operational commands

**Verified to exist in the current project.** Do not invent others.

### Check what is deployed

```bash
gh run list --limit 1 --json headSha,conclusion,status   # in either repo
git rev-parse --short HEAD                               # what you have locally
git rev-parse --short origin/main                        # what GitHub has
curl -s -o /dev/null -w "%{http_code}\n" https://atlass.dpdns.org/health
```

### Local gates — run these before pushing

```bash
# backend (/atlas-backend)
npm run typecheck && npm run lint && npm test
npm run test:e2e                 # requires local Postgres + Redis (npm run docker:up)

# frontend (/atlas-front)
npx tsc --noEmit && npx eslint src && npx vitest run && npm run build
```

### Database / migrations

```bash
npm run prisma:generate
npm run prisma:migrate:dev        # LOCAL ONLY — creates a migration
npm run prisma:migrate:deploy     # applies pending migrations (what production runs)
npm run prisma:studio             # GUI
npm run db:seed
```

### On the VPS (as the `deploy` user, from `/opt/atlas`)

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose logs -f caddy
bash /opt/atlas/deploy.sh          # the same script CI runs
```

### ⚠️ Dangerous — can destroy data

| Command | Why |
|---|---|
| `prisma migrate reset` | **DROPS THE DATABASE.** Never against production. |
| `git reset --hard` / `git push --force` | Discards work; can erase pushed history. |
| `docker compose down -v` | The `-v` **deletes the volumes**, i.e. the database. |
| Any `DELETE`/`TRUNCATE` against production Postgres | No undo outside the nightly backup. |
| Editing R2 bucket settings | Media serving and backups both depend on them. |

**Rollback:** there is no scripted rollback. The practical path is to revert the commit on
`main` and let the normal deploy pipeline roll the previous image forward. Database
migrations are **not** automatically reversible — check the migration before assuming a
revert is safe.

---

## 11. Secrets — where they are, never what they are

**No secret values appear in this file, and none may be committed.**

| Variable | Purpose | Where it lives |
|---|---|---|
| `DATABASE_URL` | superuser connection, migrations only | `/opt/atlas/.env` (VPS); `atlas-backend/.env` (local) |
| `APP_DATABASE_URL` | unprivileged `atlas_app` runtime connection | same |
| `REDIS_URL` | queues, throttling, presence | same |
| `R2_ENDPOINT`, `R2_BUCKET`, `R2_REGION`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL_BASE`, `R2_FORCE_PATH_STYLE` | media object storage | same |
| `PAYMENT_CREDENTIALS_ENCRYPTION_KEY`, `PAYMENT_WEBHOOK_SECRET` | payment credential encryption | same |
| `CORS_ALLOWED_ORIGINS`, `PORT`, `NODE_ENV`, `LOG_LEVEL`, `MEDIA_MAX_UPLOAD_BYTES` | runtime config | same |
| `SENTRY_DSN` | error tracking; no-ops when unset | environment only — **never hardcode** |
| `CLOUDFLARE_API_TOKEN` | Caddy DNS-01 wildcard cert | VPS `.env`, consumed by the caddy container |
| `DEPLOY_SSH_KEY`, `DEPLOY_USER`, `DEPLOY_HOST` | CI → VPS deployment | **GitHub Actions repository secrets** |
| `VITE_API_BASE_URL` | frontend API base (public, non-secret) | `atlas-front/.env` — tracked on purpose |

**Canonical template:** `atlas-backend/.env.example` (tracked, no real values).
**Real local values:** `atlas-backend/.env` (gitignored, present on this machine).
**Authoritative production values:** `/opt/atlas/.env` on the VPS.

If a machine-local companion file `ATLAS_HANDOVER_SECRETS.local.md` exists, it is
gitignored in both repos and must stay that way. **Prefer pointing at `.env` over copying
values anywhere.**

---

## 12. Local development environment

- **Node ≥ 20** (`engines` in `atlas-backend/package.json`).
- **npm** — no `packageManager` field is set in either repo. The frontend has a
  `pnpm-lock.yaml` and a `pnpm-workspace.yaml`, but current tooling and CI use npm;
  **verify before switching**, and do not "tidy" the lockfiles as a side quest.
- Backend needs **Postgres and Redis**: `npm run docker:up` / `npm run docker:down`.
- Backend default port **3000**; frontend Vite dev server is separate.
- Browser testing is done against **production** (`https://atlass.dpdns.org`) with real
  signed-in accounts, using the Chrome extension tooling. Driving two identities requires
  **two Chrome profiles** — the extension cannot see Incognito windows, and a tab group
  cannot span them.

---

## 13. Git history worth knowing

**Backend**

| SHA | Why it matters |
|---|---|
| `aa122c6`, `e03798e`, `f5f2765` | Phase 7 — production Dockerfile, compose, CI/CD deploy |
| `540158a` | Decoupled deploy from the broken CI gate (why deploy is ungated) |
| `c460480`, `0dba5fa` | R2 least-privilege: no `PutBucketPolicy`, object-scoped creds |
| `44cabf4` | Backup automation via systemd timer |
| `4a5769d` | Phase 8 — support cases, audit, tenant dashboards |
| `69704e5`, `2a29441` | Two real tenancy leaks found in production verification |
| `6725480` | Phase 9 — instructor leaks closed, student results |
| `7227e93` | Phase 10 — real device sessions, immediate revocation |
| `1852274` | Free-trial farming hole closed; Sentry wired |
| `363b9d0` | Disposable-email block + signup verification |
| `e1aee90` | **Real TOTP 2FA** |
| `dbc3bca` | Explicit free trial + cancellation + admin dashboard |
| `fb559df` | Phase 10.6 — account & academy deletion |
| `d16d657` | ad-hoc "Phase 11" (NOT roadmap Phase 11) |
| `86905d0` | Concurrent CMS editing + conflict response |
| `a0971b7` | Subscription expiration enforcement |
| `2911f6d` | **Media URL fix** — the "public URL" was never public |
| `8659e71` | `expectedVersion` required; Arabic genuinely optional; HSTS pinned |
| `4c9a0b6` | **current HEAD / deployed** |

**Frontend**

| SHA | Why it matters |
|---|---|
| `00489bc` | ad-hoc Phase 11 — data router, unsaved-changes, RTL preview |
| `ea8e8a9`, `2df0746`, `a0728fc` | Post-Phase-11 production fixes (viewport, Coming Soon) |
| `ca9d8c3` | Academy announcements, Academy Media, presence, conflict recovery |
| `277805e`, `e85b34c` | Plan-change summary, honest billing copy, active-academy fix |
| `cb76a3b` | Upload progress — honest stages, indeterminate where unmeasurable |
| `794a08b` | **Bidi isolation** — Arabic read dimensions backwards |
| `dc6996b` | Trial/grace countdown plurals, both languages |
| `06b3e52` | Checkout empty payment-method state |
| `eec4152` | Upload failures say why; generic fallback fixed |
| `97ae29c` | SEO dialog + toggle send `expectedVersion`; editor surfaces violations |
| `4d86dd3` | **Security-header ownership split**; custom domains got headers |
| `d264936` | `useDateFormatter` — dates follow the user, not the browser |
| `a17e42f` | Preview iframe crash on a null document root |
| `0304db7` | **current HEAD / deployed** |

Use `git show <sha>` — the commit messages are long and explain the reasoning.

---

## 14. CURRENT BACKLOG — DO NOT FORGET

### A. Roadmap work still pending
- **Phase 11 — Atlas UI / Business Components.** Not started. See §15.
- **Phase 12 — Final Production Validation.** Not started; depends on 11.

### B. Security hardening
- **The SPA document has no Content-Security-Policy.** helmet sends one on `/api/*` JSON,
  where it does almost nothing; the document that loads the app has none. Confirmed live.
  **Intentionally deferred** — a wrong `script-src`/`style-src` breaks the whole app, and
  validating one across every page, the website renderer, fonts and `data:` images is its
  own pass. This is a hardening gap, not a live exploit.

### C. QA / test debt
- `platform-control-plane.e2e-spec` — 3 failing (org list pagination, search, audit log).
  **Pre-existing**: fails *more* at the pre-pass baseline (4) than at HEAD (3).
- `courses-tenant-isolation` P5-TENANT-008 — flaky concurrent-request test. **Pre-existing**.
- **Backend e2e suites interfere through a shared database when all 92 run sequentially.**
  Different suites fail between otherwise identical runs, and **every one passes in
  isolation**. This is the root cause of the two items above and the single most valuable
  test-infrastructure fix available. **Pre-existing.**
- `ci.yml` Lint fails on `main` (~624 pre-existing prettier violations in test files).
  Fixing it would let deploy be gated on CI again.

### D. Localization / UI debt
- Two Arabic strings in `ar/academy.json` still use bare **U+200E** marks instead of the
  isolate helper (4 occurrences). They render correctly today but are fragile — an
  invisible character is lost the moment a translator reflows the sentence.
- 13 pre-existing `react-refresh/only-export-components` lint warnings. **Pre-existing.**
- Arabic numeral system divergence — a **product decision**, not a defect (§7).

### E. Production verification not yet exercised
- **Expired-subscription state.** Not exercised live: the only organisation available was
  on an active trial, and testing it means destroying it. Covered by
  `subscription-expiration-enforcement.e2e-spec.ts` (13 cases, passing).
- **Payment-proof upload flow.** Not exercised: no payment method is enabled for the test
  organisation, and enabling one is a platform-owner action against real billing config.

### F. Intentionally deferred (NOT missing implementation)
- Document CSP (B, above).
- The Arabic numeral decision (D, above).
- **Organisation-level announcements do not exist and that is intentional.** The audience
  model is Platform → Academy → Course. `AnnouncementAudience` has no `organization`
  value, the model has no `organizationId`, and RLS resolves through `is_academy_member`.
  The confusion is that `announcement.manage` is an *organisation*-level permission while
  the *audience* is an academy. **Do not invent an Organization announcement model.**

### G. Known stale documentation
- `organizations.controller.ts`'s header comment still cites the superseded "brand-new
  Organization automatically receives a 3-day trial" rule. The code below it correctly
  grants no trial. Comment only.

### H. Future improvements
- Gate deploy on CI once lint is fixed.
- Consider a scripted rollback path.

---

## 15. Phase 11 — what it is, and what NOT to rebuild

**Objective (from the roadmap):** build the Vision's signature *business components* —
**Revenue Card, Trial Countdown, Academy Health Score, Storage/Usage widgets** — now that
real entitlement/usage data (Phase 2) and the dashboard-aggregation endpoint (Phase 8)
exist to feed them.

**Scope: frontend composition only.** Backend work is expected to be *none* beyond what
Phases 2 and 8 already expose. It was deliberately sequenced last: building it earlier
would have meant displaying fabricated data, which the Vision forbids.

**Already real — DO NOT REBUILD:**

| Prerequisite | Where |
|---|---|
| Entitlements / effective plan | `src/features/tenant/hooks/useEffectiveEntitlements.ts` |
| Usage data | `useTenantUsage.ts`; backend `GET /organizations/:id/usage` |
| Subscription + trial state | `useTenantSubscription.ts`, `useSubscriptionAccess.ts` |
| Plan / add-on catalog | `usePlanCatalog.ts`, `useAddOnCatalog.ts` |
| Dashboard aggregation | backend `src/dashboard/`; FE `src/features/dashboard/` |
| Existing summaries | `RevenueSummary.tsx`, `UsageSummary.tsx` — **Phase 8, not Phase 11** |

**Must be built:** the four business components in the **design-system package**
(`src/design-system` currently holds only `motion/` and `tokens/`), each with its **own API
call, own loading state, own permission check and own refresh cycle** — the Vision's
"composable dashboard", explicitly *not* one monolithic dashboard query.

**Acceptance criteria:** every component renders real, correctly Academy/Organization
-scoped data; **one widget failing must not break the rest of the page**; and **every
number carries context** — a trend, a comparison or a recommendation, never a bare number.

**Testing:** a component-level test per widget, including an isolated-failure test.

**⚠️ Ambiguity the next session must resolve with the user before implementing:** the
roadmap's Phase 11 numbering collides with the ad-hoc "Phase 11" already shipped (§0).
Confirm which one is meant before writing code.

---

## 16. Architecture integrity check

**Did the work done after the original roadmap preserve the intended architecture?**
**Yes — with two deliberate, documented evolutions.** Evidence:

**Preserved:**
- Dual enforcement (guard + RLS) is intact; 69 migrations, many of them RLS policies, and
  dedicated `rls-*.e2e-spec.ts` suites still pass.
- The frontend layering (`Component → Hook → Service → apiClient`) is unchanged; new work
  (`useMediaUpload`, `useDateFormatter`, `useEditingPresence`) follows it.
- Tenancy boundaries were **strengthened**, never loosened. The only authorization change
  in the QA pass made the system stricter (`expectedVersion` required).
- Billing honesty held: no fake payment states, no invented proration, no "immediate"
  claims. Creating a Checkout still is not a purchase.

**Deliberate evolutions:**
1. **Media serving moved from R2-direct to Atlas's own origin** (`2911f6d`). The roadmap
   assumed a public R2 URL; that assumption was false in production. Serving from the
   product's own origin removes a silent out-of-band dependency and keeps the account hash
   out of customers' HTML. This is a genuine departure from the original design, made for
   a reason, and documented.
2. **Security-header ownership was split between Caddy and helmet** (`4d86dd3`). Previously
   both set all four; two pairs disagreed. Each layer now owns what it serves.

**Divergence from the roadmap that is worth flagging:** TOTP 2FA was built even though
Phase 10 explicitly deferred it. That is a *feature addition ahead of plan*, not a
regression — but it means the roadmap text under-describes the shipped system.

---

## 17. HOW THE NEXT CLAUDE SESSION SHOULD START

Do these in order. **Do not write application code until the user explicitly asks.**

1. **Read this file completely.** Then read
   `ATLAS_FULL_REAL_WEB_PRODUCTION_QA_REPORT.md` (frontend repo root) — it is the most
   recent ground truth about production behaviour.
2. **Read `ATLAS_HANDOVER_SECRETS.local.md`** if it exists (gitignored, machine-local).
   Otherwise the values are in `atlas-backend/.env` and `/opt/atlas/.env`.
3. **Check git state in both repos:**
   ```bash
   git status --porcelain --untracked-files=all
   git remote -v
   git fetch origin && git rev-list --left-right --count origin/main...HEAD
   ```
4. **Synchronise with `git pull --ff-only origin main`** — never `reset --hard`, never
   force-push.
5. **Read the roadmap** at
   `/Users/ziadelbadawi/Downloads/atlas-new/ATLAS_PRODUCTION_ROADMAP.md` (untracked).
6. **Confirm the deployed SHA** matches local HEAD:
   `gh run list --limit 1 --json headSha,conclusion` in each repo, plus
   `curl -s -o /dev/null -w "%{http_code}" https://atlass.dpdns.org/health`.
7. **Confirm the phase** — §6. The next roadmap phase is **11 (Atlas UI / Business
   Components)**, and §0 explains the naming trap.
8. **Confirm the backlog** — §14, keeping the categories distinct: *pre-existing* is not
   *new*, and *intentionally deferred* is not *missing*.
9. **Preserve the testing methodology** — §8. Real browser verification for UI and
   security work; two real identities for multi-user behaviour.
10. **Do not trust this document's conclusions when you implement.** Re-check the code.
    The last pass found three comments in the codebase that confidently asserted something
    the code did not do. This file could be wrong the same way.

---

## 18. Self-check questions this handover should answer

What Atlas is (§1) · where the code is (§2) · what is deployed and whether local matches
(§3) · the architecture and its security model (§4) · what must never break (§4.2, §4.4,
§5) · roadmap status (§6) · what the last QA pass found (§7) · how to work (§8) · how it
deploys (§9) · exact commands, including dangerous ones (§10) · where secrets live (§11) ·
the dev environment (§12) · the history (§13) · what remains, correctly classified (§14) ·
what Phase 11 is and what not to rebuild (§15) · whether the architecture held (§16) · how
to start (§17).
