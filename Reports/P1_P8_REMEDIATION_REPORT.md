# Atlas — P1–P8 remediation, assessment integrity and production readiness

Recorded 2 Oct 2026. Branch `claude/practical-wozniak-pjcdhe` in both
repositories, on top of the baseline already in production (frontend
`a5a18f3` → `main` `b3f7a4d`; backend `a45fd17` → `main` `dafa461`).
**Nothing in this report is merged, released or deployed.** Commit hashes
are in §F.

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
| **Not verified in production** | Public library rendering, full-screen exams, reviewer signals, RUM — none of it is deployed. The baseline's public-site features are also unverified live, because all 25 published sites belong to `trial_expired` organizations (owner-run read-only query, 1 Oct). |
| **Needs your approval** | (1) Merge each branch to `main` (PRs not opened). (2) Backend deploy **with migrations** — `20261101000000_public_content_library_read` (RLS SELECT policies gain an anonymous published-and-visible branch) and `20261101000100_quiz_event_fullscreen_unavailable` (additive enum value): `apply_migrations=true` plus the `production-migrations` environment. (3) Frontend deploy. (4) Before merging, the read-only impact queries below. (5) RUM: the privacy-copy change, `RUM_ENABLED=true`, a frontend rebuild with `VITE_RUM_SAMPLE_RATE` — each a production configuration change. (6) An eligible (active or trialing) organization for live verification, which is a production data decision. |
| **Accepted limitations** | Single-page app LCP ≈ 3.0 s (Owner decision, unchanged; SSR untouched). No screen-reader test. Chromium only. Integrity evaluation on designed scenarios only. |

**Behaviour changes on deploy** (to confirm with the read-only queries):

- Library entries an Owner already picked for a FAQ or testimonials
  section start appearing on the public site (if published and visible).
- A quiz with "require full screen" stored while integrity is off stops
  requiring it; quizzes with integrity on now genuinely enter full screen
  on Start, and attempts in progress show the gate after a reload.

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
