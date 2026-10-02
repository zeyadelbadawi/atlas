# Atlas — P1–P8 remediation, assessment integrity and production readiness

Recorded 2 Oct 2026. Branch `claude/practical-wozniak-pjcdhe` in both
repositories, on top of the baseline already in production (frontend
`a5a18f3` → `main` `b3f7a4d`; backend `a45fd17` → `main` `dafa461`).
**Update, 2 Oct 2026: merged and deployed to production on the Owner's
authorization — see §G.** Commit hashes are in §F.

Everything under §B was run locally in this session on disposable
stacks; nothing was run against production (§D says what that needs).

## A. Root causes

| Item | Root cause | Fix | Regression test (fails without the fix) |
|---|---|---|---|
| P3 FAQ/testimonial library never shown on the public site | (1) The public pages payload carried only `libraryEntryIds`; the browser resolved them through the authenticated management API, which a visitor cannot call (and only its first page). (2) The library tables' RLS SELECT policies admitted Academy members only, so even a server-side read in the anonymous public context returned nothing. | Public pages resolve picks server-side into `config.libraryEntries` (published, visible, this Academy's, Owner's order, public fields only). Migration `20261101000000_public_content_library_read` adds the anonymous branch `website_pages` already has. Pages cache key v2 carries a per-Academy library revision bumped on every committed write, so edits show on the next read. Renderers use the payload; preview uses the same filter. Picker gained ordering, removal and "no longer public" warnings. | Backend unit + DB e2e `website-library-public` (drafts/hidden/archived/foreign id dropped; edit visible next read); frontend `content-library.test.tsx` (17); J12 |
| P2 29 TypeScript errors | Platform Zoom/add-on services typed against a `PaginatedResponse` shape the API never returns; a test read plural keys through a cast. | Services use `PaginatedResult`; shared `toQueryParams()`; test typed. No `any`, no suppressions. CI runs `pnpm typecheck` as a gate. | `pnpm typecheck` = 0 errors, gating in `ci.yml` |
| P4 Full-screen exam never went full screen | The runner called `requestFullscreen` from a mount effect. Browsers allow it only inside a user gesture, so it was refused and the refusal swallowed. Latent: the quiz container was the full-screen element, so dialogs portalled to `<body>` would have been invisible. Server side: a switch stored while integrity was **off** (hidden in the editor) still reached the attempt. | Start click requests full screen on the document synchronously. One exit policy: questions wait behind a focused gate; timer/autosave continue; refused → recorded with "continue without"; unsupported (iPhone) → notice, recorded. Snapshot requires full screen only when the quiz asks **and** integrity is on. New event `fullscreen_unavailable` (migration `20261101000100`, additive enum value). Event payloads allow-listed per type. | Hook/gesture-order unit tests; backend DB e2e `quiz-fullscreen-integrity`; J9, J11 |
| P5 Integrity output not explainable | Violations were a raw count; nothing told the reviewer what happened, how sure to be, or what innocent explanation fits. | `deriveIntegritySignals`: facts with numbers and evidence event ids, `review` vs `info`, technical vs conduct. No score, probability or verdict. Reviewer panel shows the policy, the groups, the innocent explanations and "Show in timeline". | `integrity-signals.util.spec.ts` pins every FP/FN; J9, J11 |
| P6 No field performance data | Only lab Lighthouse numbers existed. | Self-hosted RUM (§B.7), off by default. | `rum.spec.ts`, `rum.test.ts`, J10 |
| P7 findings | Grid item min-content width (360 px overflow); org switcher label at 360 px; low-contrast "Selected · correct"; focus lost after any imperatively opened confirm dialog; author content inheriting `dir=rtl`; review printed `quizResults.gradingStatus.not_required` (frontend type said `auto`). | See `Reports/ACCESSIBILITY_AUDIT.md` §2. | J13, J11, `confirm-dialog-focus.test.tsx` |
| Harness | Backend contact e2e posted to an unpublished site (correctly 404 since F-8; backend CI is disabled so nothing reported it). Learner host-resolved routes need the Academy on localhost. | Test publishes first; dev-only host attachment for those routes. | the e2e itself |

## B. Test evidence

All local, on the disposable stack (`atlas-backend/scripts/e2e-local-stack.sh`:
PostgreSQL 16, Redis, s3rver on 127.0.0.1 only; the script refuses any
non-loopback database or Redis URL).

### B.1 Commands and counts

| Check | Command | Result |
|---|---|---|
| Frontend typecheck | `npm run typecheck` | **0 errors** (was 29) |
| Frontend lint | `npm run lint` (`eslint --quiet ./src`, errors only) | **0 errors** |
| Frontend unit | `npx vitest run` | **170 files, 1696/1696** |
| Frontend build / SSR build | `npm run build`, `npm run build:ssr` | both succeed |
| SSR server tests | `npm run test:ssr` | **67/67** (SSR configuration unchanged; `ATLAS_SSR` untouched) |
| Theme baseline (legacy Themes 2–5 included) | `theme-baseline:build` then `playwright test --config e2e/theme-baseline/playwright.config.ts` | **1056/1056** — screenshots, axe, palette injection, identity, retirement; no baseline re-recorded |
| Journeys J1–J13, fresh stack, default config | `npx playwright test` (see `e2e/README.md`) | **83 passed, 4 skipped** (J10 skips by design without RUM), 0 failed, 15.7 min |
| J10 with RUM on | same, `RUM_ENABLED=true`, `VITE_RUM_SAMPLE_RATE=1` | **4/4**, three consecutive runs (after the harness fix in §B.8) |
| Backend typecheck | `npm run typecheck` | **0 errors** |
| Backend lint | `eslint "{src,test}/**/*.ts"` | **0 errors**, 3 pre-existing `no-console` warnings (untouched scripts) |
| Backend unit (+ cross-repo specs) | `ATLAS_FRONTEND_ROOT=../atlas npx jest` | **163 suites, 4263/4263** (after the media-spec fix in §B.8; one failure before it) |
| Backend DB e2e, run 1 | `npx jest --config test/jest-e2e.json` (CI-like: `NODE_ENV=test`, flags unset; separate disposable stack) | **166/168 suites, 2013/2018 tests**; the 5 failures are explained in §B.8 and are not caused by this branch |
| Backend DB e2e, run 2 (same DB, as CI runs it twice) | same | **165/168 suites, 2011/2018 tests**: P63 ×5, P64 ×1 (as run 1, plus P63-DOM-021), P61 ×1 — all explained in §B.8 |
| Integrity evaluation | `npx ts-node -r tsconfig-paths/register scripts/integrity-eval.ts` | §B.6 |


### B.2 Browser and viewport coverage

Chromium (Playwright's build at `/opt/pw-browsers/chromium`), Linux.
J13: 10 surfaces × 360/390/768/1024/1440/1920 × EN/AR, 120 full-page
screenshots reviewed as contact sheets; axe WCAG 2.0/2.1 A+AA at 390 and
1440 with no serious/critical violation. J8: Arabic public site at
390/1024/1440. Theme baseline suite: §B.1. **Firefox and Safari were not
run.**

### B.3 Roles exercised in a real browser

Organization Owner (J7, J8), Academy Owner (J3, J6, J12, J13), Manager
(J1, J3, J11), Instructor (J3, J11), Student (J1–J6, J9, J11, J13),
anonymous visitor (J6, J8, J10, J12, J13), Platform owner (J5, J6), and a
second organization's Owner for tenant boundaries (J4, J11). The quiz
lifecycle's 15 steps and its failure cases are J11. Journey → acceptance
map: `e2e/README.md`.

### B.4 Accessibility — limits

No screen reader was run (no VoiceOver/NVDA/JAWS/TalkBack and no audio in
this container). Zoom 200–400 % and forced colours not tested. A manual
plan with expected announcements is in `Reports/ACCESSIBILITY_AUDIT.md` §4.

### B.5 Database-backed journeys

Fresh stack: migrations from zero, seed, then J1–J13 in order. Backend DB
e2e on a second, separate stack with CI-like settings (`NODE_ENV=test`,
quiz flags unset; suites pin their own flags).

### B.6 Integrity metrics

`atlas-backend/Reports/ASSESSMENT_INTEGRITY.md` §4. 29 designed
scenarios (14 honest, 15 dishonest). Attempt level: precision 71 %,
recall 67 %, FPR 29 %, FNR 33 % (TP 10, FP 4, FN 5, TN 10). These are
**designed scenarios, not real learners**; they show the rules behave as
designed, including the known false positives (3-minute break, laptop
sleep, dictation pasting, outdated client) and false negatives (brief
side-window glances, one 12 s lookup, an event-blocking client without
full screen, a phone, another person). They do not estimate real-world
accuracy, and no accuracy figure is claimed.

### B.7 Real-user monitoring

J10 with RUM on: LCP/CLS/INP recorded with only the page template and
device class; phone-sized visit labelled mobile; Global Privacy Control →
nothing downloaded or sent; a hostile beacon creates no labels. Off by
default; enabling needs approval (§D).

### B.8 Failures found during the final runs, and what was done

| Failure | Root cause | Action |
|---|---|---|
| Backend e2e process died (V8 heap OOM, limit 8.2 GB); under that pressure `quiz-fullscreen-integrity` got a 500 ("Transaction already closed") | Run in-band, the e2e process retains memory between suites. Measured on **`main` (`dafa461`) unmodified**: the heap after each suite rose from ≈ 1.5 GB to ≈ 7.4 GB over 158 suites, and the process was then killed by the kernel's cgroup OOM killer (10.4 GB RSS, exit 137) before the remaining 10 suites ran (it shared the machine with the branch run, so the kill point is not exact; the growth is). Pre-existing; backend CI (`ci.yml`) is disabled, so nothing reported it. | `jest-e2e.json`: `workerIdleMemoryLimit: "1GB"` — still serial, one worker replaced when it holds > 1 GB after a suite. Same assertions and timeouts. **What retains the memory is not identified** (§E). |
| 1 × `p61-granted-entitlements` in run 2 (concurrent enrollments: `ECONNRESET`, Prisma "Transaction not found") | Caused by my own measurement: the `main` comparison run above was OOM-killed at 01:46:26; this test failed at 01:46:46 during that memory reclaim (its interactive transaction expired). It passed in run 1. | Re-run alone: **16/16 twice**. No change. |
| 4 × `p63-domain-operations` (expected canonical host `undefined`) | Order-dependent test: it derives "the Atlas subdomain" from the environment only, but `domain.e2e-spec.ts` stores a platform base domain **in the database**. Once that suite has run against the same DB, P63's expectation is wrong. Passes **38/38** on a DB where it has not run. Both files unchanged from `main`. | Not changed here (outside scope); proposed fix in §E. |
| `p63-domain-operations` P63-DOM-021, run 2 only (`sslStatus` "provisioning", expected "active") | The test runs the global domain sweep once and expects its own row processed. The sweep takes at most 200 rows per tick; this DB held 466 due `verifying` rows left by three runs against it, so the row can fall outside the tick. Same class as above (shared-DB accumulation); file unchanged from `main`. | Not changed here; proposed fix in §E. |
| 1 × `p64-phase2-security` (anonymous read of a protected object: 200, expected 403) | The local stack's S3 mock (s3rver) does not enforce signatures; CI uses MinIO, which does. MinIO could not be run here: no Docker daemon, and `dl.min.io` is blocked by this environment's network policy. | Not verifiable in this sandbox; it needs CI or a MinIO-backed run. |
| Backend unit `p64-phase2-defects` (600.001 s > 600 s) | Test arithmetic: the ticket's ceiling was measured from a timestamp taken before the call, so any elapsed millisecond failed it (seen under load). Pre-existing. | Fixed: ceiling from after the call, floor from before; a 30-minute ticket still fails (`f051d40`). |
| New J9 strict-mode test (added 2 Oct, the first real-browser run of strict auto-submit): the reviewer saw "left full screen 1 time" for an attempt auto-submitted after 2 exits | The exit that submitted the attempt was still open when the attempt ended, ~0.3 s later, and fell under the 2 s blip filter | Fixed in the signal rules ([atlas-backend#19](https://github.com/zeyadelbadawi/atlas-backend/pull/19)): an interval still open at the end is always kept; regression unit test; evaluation unchanged; J9 4/4 |
| J10 desktop visit: CLS not recorded | Harness: a Playwright route interceptor loses beacons sent during unload (measured CLS 0/5, INP 2/5 with it; 10/10 without). | Fixed in the test (`4d4d233`); product unchanged. |

### B.9 Not completed

- **Screen readers:** none run (none available here). Manual plan:
  `Reports/ACCESSIBILITY_AUDIT.md` §4.
- **Browsers:** Chromium only; Firefox and Safari/WebKit not run. Zoom
  200–400 % and forced colours not tested.
- **Real tab switch / window blur:** automated Chromium here cannot
  produce them; J9 dispatches the event (listener → server → signal is
  real). Covered by the manual plan.
- **Protected object store signatures:** one backend e2e assertion needs
  MinIO (§B.8); not runnable in this sandbox.
- **Backend CI:** `ci.yml` is disabled on GitHub, so the backend evidence
  is local only.
- **Production:** nothing from P1–P8 is deployed, so nothing is verified
  live. The baseline's public-site behaviour is also unverified live
  (all published sites' organizations are `trial_expired`).
- **Integrity on real learners:** no data; the evaluation is on designed
  scenarios.
- **RUM in production:** off; no field data exists yet.

## C. Assessment integrity

**Architecture.** The browser reports page events (visibility, focus,
full screen enter/exit/unavailable, copy/paste, print, heartbeat) to the
attempt engine, which stores them with server time after an allow-list
per event type. `decideIntegrity` (unchanged) counts violations for
warn/strict modes. `deriveIntegritySignals` turns stored events into
reviewer facts on read; nothing is precomputed, so historical attempts
need no migration.

**Signals.**

Intervals under 2 s are never reported. Thresholds are constants in
`integrity-signals.util.ts`, pinned by its spec.

| Signal | "Worth a look" when | Otherwise | Category | Strength alone |
|---|---|---|---|---|
| `time_away` (page hidden) | ≥ 30 s in total or ≥ 3 times | context | conduct | weak — breaks, calls, sleep |
| `focus_lost` (page visible, focus elsewhere) | ≥ 60 s in total | context | conduct | weak — side windows, magnifiers |
| `fullscreen_left` (full screen required) | ≥ 30 s out or ≥ 2 exits | context | conduct | moderate |
| `fullscreen_never_entered` (required, never entered, not reported unavailable) | always | — | conduct | moderate; an outdated client is the innocent case |
| `fullscreen_unavailable` | never | context | technical | context only (iPhone, refused) |
| `paste_without_copy` | always | — | conduct | moderate; dictation and assistive tools paste too |
| `paste_after_copy`, `copy` | never | context | conduct | context |
| `print` | always | — | conduct | strong in context |
| `connection_gap` (no batch for ≥ 180 s) | never | context | technical | never conduct: silence is usually the network |

**Scoring.** None. No score, likelihood or verdict is computed or shown.
The reviewer sees facts, numbers, evidence rows and innocent explanations,
and decides.

**Privacy.** Recorded: the events above, with timestamps and durations.
Never: camera, microphone, screen content, keystrokes, clipboard
contents, other tabs or applications, device fingerprints. The learner is
told both lists before Start.

**VPS requirements and cost.** No new service, process, model or
storage tier: signals are computed in the API on read from rows the
attempt engine already stores. One additive enum value. No third-party
service, no subscription — €0 added cost.

**Known limitations.** Anything outside the browser (phone, another
person) is invisible by design. A modified client can suppress events;
with full screen required that shows as `fullscreen_never_entered`,
without it there is only a `connection_gap`. Real tab switching could not
be produced by automated Chromium here (J9 dispatches the event; the
manual plan covers it). `second_session` and `device_change` exist as
event types with no producer.

## D. Production readiness

| | Status |
|---|---|
| **Verified locally** | Everything in §B, on both repositories' branch heads (§F). |
| **Verified in an isolated environment** | The disposable stacks above (fresh migrations from zero, seed, real PostgreSQL RLS, Redis, S3 mock). No staging environment exists. |
| **Not verified in production** | Deployed 2 Oct (§G). Signed-in behaviour (public library with picks, full-screen exams, reviewer signals) is not yet verified live: no browser here can reach production, and automated sign-in was refused (§G.1). Covered by the Owner's checklist and the read-only VPS script. RUM is off. |
| **Needs your approval** | Done 2 Oct (§G): merge, backend deploy with both migrations, frontend deploy; the read-only impact queries were run first (results below). Still open: (1) RUM — privacy-copy decision, `RUM_ENABLED=true`, a frontend build with `VITE_RUM_SAMPLE_RATE`. (2) Run the live checklist (needs your mailbox for sign-in codes). |
| **Accepted limitations** | Single-page app LCP ≈ 3.0 s (Owner decision, unchanged; SSR untouched). No screen-reader test. Chromium only. Integrity evaluation on designed scenarios only. |

**Behaviour changes on deploy** (to confirm with the read-only queries):

- Library entries an Owner already picked for a FAQ or testimonials
  section start appearing on the public site (if published and visible).
- A quiz with "require full screen" stored while integrity is off stops
  requiring it; quizzes with integrity on now genuinely enter full screen
  on Start, and attempts in progress show the gate after a reload.

**Results (owner-run, read-only, 2 Oct, before the merge):** 0 library picks
(no public output changes); quiz flags `on`; 2 published quizzes will
genuinely enter full screen (`warn` in an active Academy, `strict` in a draft
Academy, both in trial-expired test organizations, last attempts 22–24 Sep);
0 quizzes with full screen stored under integrity off; 0 attempts in
progress; both migrations absent.

Read-only queries (PostgreSQL in a read-only transaction):

```sql
-- 1. Library picks that would start showing publicly
WITH picks AS (
  SELECT p.academy_id, s->>'type' AS type,
         jsonb_array_elements_text(s->'config'->'libraryEntryIds') AS id
  FROM website_pages p, jsonb_array_elements(p.sections) s
  WHERE s->>'type' IN ('faq','testimonials')
    AND jsonb_typeof(s->'config'->'libraryEntryIds') = 'array')
SELECT type, count(*) AS picks, count(DISTINCT academy_id) AS academies,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM website_faq_entries e
    WHERE type = 'faq' AND e.id::text = picks.id AND e.academy_id = picks.academy_id
      AND e.status = 'published' AND e.visible
    UNION ALL
    SELECT 1 FROM website_testimonial_entries e
    WHERE type = 'testimonials' AND e.id::text = picks.id AND e.academy_id = picks.academy_id
      AND e.status = 'published' AND e.visible)) AS would_show
FROM picks GROUP BY type;

-- 2. Quizzes whose full-screen behaviour changes
SELECT count(*) FILTER (WHERE require_fullscreen AND integrity_mode = 'off')  AS stored_but_integrity_off,
       count(*) FILTER (WHERE require_fullscreen AND integrity_mode <> 'off') AS will_enter_full_screen
FROM quizzes;

-- 3. Attempts in progress now
SELECT count(*) FROM quiz_attempts WHERE status = 'in_progress';
```

Plus `grep -E '^FLAG_QUIZ_(ENGINE_V2|INTEGRITY)_MODE=' /opt/atlas/.env`
(flag values only) — full screen and signals apply only where those
flags are on.

## E. Remaining work

**Needs your decision or approval (nothing done):**

1. Run the read-only impact queries in §D on production and review the
   numbers.
2. Open PRs for both branches, then merge, then deploy the backend with
   its two migrations and the frontend — each step separately approved.
3. RUM: privacy-copy decision, then `RUM_ENABLED=true` and a frontend
   build with `VITE_RUM_SAMPLE_RATE` (e.g. 0.1).
4. An eligible organization (active or trialing) for live verification.
5. Still open from before: rotate the `atlas_vps` SSH key; remove
   `/home/deploy/step2/deploy.sh` from the VPS; Themes 2–5 production
   migration (gated); Gate H (SSR, optional).

**Engineering follow-ups (not done here; outside this scope or found late):**

6. Find what the backend e2e process retains between suites (heap
   snapshots between suites in-band), then decide whether the worker
   memory limit stays.
7. P63 test isolation: derive the expected subdomain from the effective
   base domain (`GET /platform-domain`) rather than the environment, or
   have `domain.e2e-spec.ts` restore the stored base domain after itself;
   in P63-DOM-021, sweep until the test's own row is processed (or seed
   the row as the oldest due) instead of assuming one tick reaches it.
8. Re-enable backend CI; it would have reported the stale contact e2e,
   the P63 order dependence and the e2e memory exhaustion.
9. Pre-existing product finding: edits to pages of a published website
   go live without republishing (pages have no draft layer; the public
   cache can lag up to 5 minutes). Needs a product decision.
10. Copy: a quiz-only course shows "0 of 0 lessons completed" to the
    learner.
11. Regenerate the Theme 1 "new Academy" fixture and re-record those
    visual baselines after review (plan §Z.6 #3).
12. Integrity: producers for `second_session` / `device_change`; calibrate
    thresholds only on real, consented, anonymised data after launch.
13. OG image crop of `home-hero` (plan §E.2).

## F. Commits

Branch `claude/practical-wozniak-pjcdhe` in both repositories. The
documentation commit that adds this report follows these in each repo.

**Frontend (`zeyadelbadawi/atlas`)**, on top of `a5a18f3`:

| Commit | Content |
|---|---|
| `775b455` | P2 typecheck to zero + CI gate; P1 journey harness fixes |
| `8698381` | P3 content library on the public site; picker ordering |
| `d9aa9b8` | P4 full screen on the Start gesture, gate; P5 reviewer signals |
| `0fd473e` | P6 real-user monitoring; reviewer policy line |
| `daae881` | J11 quiz lifecycle across roles; grading-status label fix |
| `98a375a` | J12 content library end to end |
| `e3be831` | J13 responsive + accessibility matrix and its fixes |
| `ccec9d3` | Revert of formatting-only churn swept into `e3be831` |
| `4d4d233` | J10 harness: detach the beacon interceptor before leaving |

**Backend (`zeyadelbadawi/atlas-backend`)**, on top of `a45fd17`:

| Commit | Content |
|---|---|
| `7eea17a` | P1 disposable local stack; stale contact e2e |
| `5a54b11` | P3 public library expansion; RLS read migration; cache revision |
| `663c4ed` | P4 full screen server-side; P5 signals + evaluation; migration |
| `413df0b` | P6 RUM ingestion and view; P5 categories |
| `4b3fe80` | Prettier on the P3–P6 files (lint to 0 errors) |
| `69e95da` | E2E harness: two stacks, flags pinned, worker memory limit |
| `f051d40` | Media spec: upload-ticket ceiling measured after the call |

## G. Production deployment (2 Oct 2026)

Authorized by the Owner (all production data is test data). Order:
backend with migrations first, then the frontend (the new frontend sends
the `fullscreen_unavailable` event, which only the new backend accepts).

| Step | Record | Evidence |
|---|---|---|
| Backend PR | [atlas-backend#18](https://github.com/zeyadelbadawi/atlas-backend/pull/18) merged → `main` `336891d` | GitHub |
| Backend deploy with migrations | [Run #234](https://github.com/zeyadelbadawi/atlas-backend/actions/runs/36977559664), `apply_migrations=true`, `production-migrations` approved. Backup `atlas-20261002T073437Z.sql.gz` (uploaded off-host); pre-check 0 attempts in progress; **both migrations applied** (134 total); backend recreated, healthy; Caddy healthy; rollback record backend `b9278250…` + Caddy `bb1da23e…` | run log |
| Frontend PR | [atlas#13](https://github.com/zeyadelbadawi/atlas/pull/13), CI green (lint, typecheck gate, unit, builds, SSR tests, theme/axe checks) → `main` `a973d03` | GitHub |
| Frontend deploy | {{FE_DEPLOY}} | run log |
| Follow-up fix (found by the strict-mode browser run) | [atlas-backend#19](https://github.com/zeyadelbadawi/atlas-backend/pull/19) → `main` `3d00417`: the exit an attempt ended in is kept by the reviewer's signals. Deployed by [run #235](https://github.com/zeyadelbadawi/atlas-backend/actions/runs/36980513908) (no migrations; migration job skipped): backend healthy, Caddy healthy, rollback record backend `2d09a9ce…` + Caddy `bb1da23e…`. | run log |
| Push-triggered backend run for `336891d` | [Run #233](https://github.com/zeyadelbadawi/atlas-backend/actions/runs/36977479462) cancelled on purpose: it would have stopped at the migration gate; run #234 replaced it | GitHub |

**Not changed:** `ATLAS_SSR` (unset), Themes 2–5, RUM (`RUM_ENABLED`
unset, `VITE_RUM_SAMPLE_RATE` unset — off), credentials, infrastructure.
**No data was reset or deleted.**

### G.1 Live verification — what was and was not possible here

- **Verified from the deploy logs:** migrations applied, backend and Caddy
  health, rollback record (above).
- **This sandbox cannot reach production** (the environment's network
  policy denies `atlass.dpdns.org`), so no browser here can open the live
  site.
- **Automated signed-in journeys in production were not run.** They need
  the emailed sign-in code; automating its retrieval from the production
  outbox was refused by this session's safety controls, and was not worked
  around. The signed-in checks (learner quiz in warn and strict mode,
  reviewer signals, the owner's library picker) are therefore a short
  manual checklist for the Owner, and the read-only VPS script covers the
  rest (migration state, RLS policies, enum, health, logs, SSR off, public
  routes, RUM endpoint).
- **The same behaviours were verified in a real browser locally** against
  the same code: J9 (full screen, gate, strict auto-submit, signals), J11
  (15-step lifecycle across roles), J12 (library on the public site).

### G.2 Live checklist for the signed-in flows (Owner)

Use plus-addresses of your own mailbox, e.g. `you+p8owner@gmail.com` (owner) and
`you+p8learner@gmail.com` (learner). The sign-in codes arrive in that mailbox.

#### 0. Make one test organization eligible (test data only)

After step 1a, run on the VPS (replace the address). It gives that one test
organization a 7-day trial so the subscription gate does not stop the checks.

```bash
sudo -u deploy -H bash -s <<'EOF'
cd /opt/atlas && docker compose exec -T postgres sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
WITH o AS (SELECT m.organization_id AS id FROM organization_memberships m JOIN users u ON u.id = m.user_id
           WHERE u.email = 'you+p8owner@gmail.com' AND m.role = 'owner' ORDER BY m.created_at LIMIT 1)
INSERT INTO tenant_subscriptions (organization_id, plan_id, status, trial_ends_at, updated_at)
SELECT o.id, COALESCE((SELECT plan_id FROM tenant_subscriptions WHERE organization_id = o.id),
                      (SELECT plan_id FROM tenant_subscriptions GROUP BY plan_id ORDER BY count(*) DESC LIMIT 1)),
       'trialing', now() + interval '7 days', now() FROM o
ON CONFLICT (organization_id) DO UPDATE SET status = 'trialing', trial_ends_at = now() + interval '7 days', grace_ends_at = NULL, updated_at = now()
RETURNING organization_id, status, trial_ends_at;
SQL
EOF
```

#### 1. Owner (https://atlass.dpdns.org)

a. Sign up with the owner address and an organization name ("P8 Verify"). Sign in with the code. Run step 0.
b. Finish onboarding: create the Academy (Theme 1, complete starter website). Publish the website.
c. Website → Content → FAQs: add two entries, publish both. Website → Pages → FAQs → edit the FAQ
   section → add both from the library, move the second one up → Apply → Save → Publish.
   **Expect:** the picker lists only published entries, with move up/down and remove.
d. Courses → new free public course → add a section → add two quizzes, each with 2 questions:
   - "Warn exam": Integrity = Warn, Require full screen = on, max violations 10.
   - "Strict exam": Integrity = Strict, Require full screen = on, max violations 2.
   Attach both to the section; publish the course.
   **Expect:** with Integrity = Off the full-screen switch is hidden, and a hint says why.

#### 2. Visitor (any browser, signed out)

Open `https://<your-academy>.atlass.dpdns.org/faqs` and `/ar/faqs`.
**Expect:** both library questions, in the order you set, in English and Arabic; the questions in
English keep left-to-right direction inside the Arabic page.

#### 3. Learner (academy site, Chrome or Edge on a desktop)

a. Sign up on the academy site with the learner address; sign in with the code.
b. As the owner, enrol the learner in the course (Students → the learner → grant course).
c. Learner → My learning → the course → "Warn exam".
   **Expect:** the intro says it opens in full screen and lists what is and is not recorded.
   Tick the box, press Start → the page goes full screen.
   Press Esc → the questions are hidden behind "Return to full screen" (answers kept).
   Press the button → full screen again. Switch tab for ~5 s and back → a warning dialog.
   Submit → results; full screen ends.
d. "Strict exam": Start → full screen. Wait ~6 s, press Esc, return with the button, wait ~3 s,
   press Esc again.
   **Expect:** after the second exit the attempt is submitted automatically
   ("Submitted automatically … the recorded-event limit was reached").
e. On an iPhone (Safari) open the Warn exam: a notice that full screen is unavailable, no gate.

#### 4. Owner reviews

Courses → the course → quiz results → open the learner's attempts.
**Expect (Warn exam):** a policy line ("Warn, full screen required"), "Worth a look" / "For
context" groups with "Full screen left" (count and seconds) and the innocent explanations; "Show
in timeline" highlights the rows. **Strict exam:** auto-submitted, reason integrity.

Send me: pass/fail per step, and a screenshot of any failure.

### G.3 Read-only post-deploy check (VPS)

```bash
sudo -u deploy -H bash -s <<'EOF'
{
cd /opt/atlas || exit 1
psqlro() { docker compose exec -T -e PGOPTIONS='-c default_transaction_read_only=on' postgres \
  sh -c 'psql -X -t -A -F" | " -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' ; }

echo "== 1 containers"
for svc in backend caddy postgres redis; do
  cid=$(docker compose ps -q "$svc")
  echo "$svc cid=${cid:0:12} started=$(docker inspect -f '{{.State.StartedAt}}' "$cid") image=$(docker inspect -f '{{.Image}}' "$cid" | cut -c1-19) health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}' "$cid") restarts=$(docker inspect -f '{{.RestartCount}}' "$cid")"
done
v=$(grep -E '^ATLAS_SSR=' .env | tail -1 | cut -d= -f2-); echo "ATLAS_SSR=${v:-<unset>}  ssr containers: $(docker compose --profile ssr ps -aq ssr | wc -l)"
r=$(grep -E '^RUM_ENABLED=' .env | tail -1 | cut -d= -f2-); echo "RUM_ENABLED=${r:-<unset>}"

echo; echo "== 2 rollback record"
cat .last-good; bash /opt/atlas/deploy.sh --check-rollback-record; echo "check exit=$?"

echo; echo "== 3 database (read-only)"
psqlro <<'SQL'
SELECT 'migrations applied|unfinished', count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL),
       count(*) FILTER (WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL) FROM _prisma_migrations;
SELECT 'new migration', migration_name, finished_at IS NOT NULL AND rolled_back_at IS NULL AS applied
  FROM _prisma_migrations WHERE migration_name IN ('20261101000000_public_content_library_read','20261101000100_quiz_event_fullscreen_unavailable');
SELECT 'enum fullscreen_unavailable', 'fullscreen_unavailable' = ANY(enum_range(NULL::quiz_attempt_event_type)::text[]);
SELECT 'faq select policy has anonymous branch', position('published' in qual) > 0 FROM pg_policies WHERE policyname='website_faq_entries_tenant_select';
SELECT 'testimonial select policy has anonymous branch', position('published' in qual) > 0 FROM pg_policies WHERE policyname='website_testimonial_entries_tenant_select';
SQL

echo; echo "== 4 backend health and logs"
docker compose exec -T backend node -e "fetch('http://localhost:3000/health').then(async r=>console.log('health', r.status, (await r.text()).slice(0,200))).catch(e=>console.log('health 000', e.message))"
since=$(docker inspect -f '{{.State.StartedAt}}' "$(docker compose ps -q backend)")
logs=$(docker compose logs --no-color --since "$since" backend 2>/dev/null)
echo "backend error lines since start: $(printf '%s\n' "$logs" | grep -cE '"level":50|"level":60| ERROR ')"
printf '%s\n' "$logs" | grep -E '"level":50|"level":60| ERROR ' | tail -5 | cut -c1-300
echo "caddy 5xx since backend start: $(docker compose logs --no-color --since "$since" caddy 2>/dev/null | grep -cE '"status":5[0-9][0-9]')"

echo; echo "== 5 public routes (anonymous)"
API=https://atlass.dpdns.org/api/v1
for url in "https://atlass.dpdns.org/" "$API/health"; do
  echo "$url -> $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url")"
done
echo "RUM beacon (accepted, dropped while RUM is off): $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X POST -H 'content-type: application/json' -d '{"samples":[{"metric":"LCP","value":1200,"route":"public:home","device":"desktop"}]}' "$API/rum/vitals")"
echo "RUM hostile beacon: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X POST -H 'content-type: application/json' -d '{"samples":[{"metric":"EVIL","value":1,"route":"/x?email=a@b.c","device":"desktop"}]}' "$API/rum/vitals")"
echo "entry script: $(curl -s --max-time 15 https://atlass.dpdns.org/ | grep -o '/assets/index-[^"]*\.js' | head -1)"
} 2>&1
EOF
```
