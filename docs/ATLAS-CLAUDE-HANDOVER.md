# Atlas — Claude session handover (Theme 1 programme)

Written 30 Sep 2026 at the end of a Claude Code session that ran out of credit, so another Claude account can continue. **Do not trust this document blindly.** Every important claim below names its evidence (a file, a commit or a command); re-verify it against the repositories before acting.

Companion file: `atlas-backend/docs/ATLAS-CLAUDE-HANDOVER.md` (backend specifics).
Source of truth for scope: `Reports/THEME_1_ACADEMY_WEBSITE_PLAN.md` in this repo (the approved plan; phase results in §M–§U).

## ★★★★ Status update — H1–H4 remediation (1 Oct 2026)

The read-only production verification (Step 1, done by the Owner as the execution bridge) found four gates. All four are implemented and verified on this branch; nothing ran in production. Details: `Reports/SSR_ARCHITECTURE_ANALYSIS.md` §15.
- **Frontend `d7a128d`:** SSR HTML budget of 1 MiB, early cut-off on over-budget API responses, memory-bounded page cache, `tools/ssr-memory/measure.mjs`.
- **Backend `1b0d3e5`:** real rollback digests; postgres/redis never recreated by a deploy; `init: true` on caddy/ssr; ssr `mem_limit: 384m`; `deploy/test/deploy-script.test.sh` (48 checks) plus a CI job.

**Next:** Step 2 (merge, migrations, deploy) only on the Owner's explicit approval. The Owner should also rotate the `atlas_vps` SSH key that was pasted into chat.

Evidence labels used below:
- **VERIFIED (session)**: run and observed in this session on the exact commits named in §I.
- **VERIFIED (static)**: confirmed by reading the code or git in this session; not executed.
- **REPORTED, NOT RE-VERIFIED**: recorded by an earlier phase report and not re-run since.

---

## ★★★★ Status update — production R2 archive (1 Oct 2026). Read this first.

- The Owner approved four decisions:
  - accept the 26 SSR screenshot differences;
  - accept About AR CLS ~0.066, with the Arabic font preload kept off (localized performance debt);
  - accept the current SSR LCP;
  - enable SSR only after the R2 archive is verified.
- **R2 archive done and verified:** 12/12 masters plus 12 provenance records in `atlas-theme-sources`, byte-identical; idempotent; anonymous access refused. Plan §Y. **Bucket Lock enabled by the Owner** (dashboard). Re-audited after the lock: unchanged. The Owner approved continued use of the existing R2 credentials for this bucket: do not ask to rotate them unless they stop working.
- **SSR not enabled.** This environment has no VPS access. The access needed is listed in plan §Y's companion report to the Owner (the deploy user over SSH, `/opt/atlas`, the new compose file and `deploy.sh`, and a merge to `main` so the workflow builds both images).

## ★★★ Status update — Phase 8 SSR session (1 Oct 2026). Read this first.

Same branch (`claude/practical-wozniak-pjcdhe`, both repos). Nothing on `main`, nothing deployed, no production data or migration touched. Full record: plan §X and `Reports/SSR_ARCHITECTURE_ANALYSIS.md` §12–§14. This supersedes the LCP decision bullet of the ★★ section below.

- **SSR of the anonymous public Academy website is implemented and ships OFF.**
  - Caddy routes Academy page requests to the `ssr` renderer only when `ATLAS_SSR=on`. Every failure, and everything not public, falls back to the unchanged SPA.
  - Code: FE `144aa3f`, `41ddb34`, `6617da1`, `c1cb85b`, `997a959`; BE `73d620a`.
- **Verified:**
  - `pnpm test:ssr` 56/56 (needs `VITE_PLATFORM_BASE_DOMAIN=atlass.dpdns.org pnpm build && … pnpm build:ssr` first);
  - SPA theme baseline 1,047/1,047;
  - SSR theme baseline (`THEME_BASELINE_SSR=1`) 1,021/1,047. The 26 are explained screenshot differences (lazy image, reveal at the fold). They were **not** re-recorded and are an Owner decision.
  - FE unit 1,580; typecheck 31 (unchanged).
- **Lighthouse** (`e2e/theme-baseline/lighthouse/run-ssr-comparison.mjs`), mobile:
  - LCP EN 3.05 → 2.27 s;
  - LCP AR 3.2–3.3 → 2.58 s;
  - Course Details 2.57 / 2.87 s;
  - TBT → 0–38 ms;
  - About AR CLS 0.066 (font swap; options in SSR §13).
- **Owner actions:**
  - enable SSR (§14 runbook);
  - accept the 26 SSR screenshots;
  - About AR CLS option;
  - accept or commission the AR / Course Details LCP gap;
  - the Themes 2–5 production migration (BLOCKED here: no production access);
  - the R2 bucket.
- **Phase 9 not started.**
- **Environment notes:**
  - `ss` is not installed: kill by port with `lsof -t -iTCP:<port> -sTCP:LISTEN`.
  - The theme baseline reuses an existing server on :4173 (`reuseExistingServer`), so free the port first or you test a stale bundle.
  - Docker works after `dockerd` is started manually. Builds need this sandbox's proxy CA injected into the Node stages (the stock Dockerfile fails here identically).
  - Caddy can be built from source (`go install`).

## ★★ Status update — Phase 8 decisions session (30 Sep 2026). Read this first.

Same branch (`claude/practical-wozniak-pjcdhe`, both repos, nothing on `main`, no production change). Full record: plan §W. It supersedes the "Blocked — images" and "Owner decisions" bullets of the ★ section below.

- **LCP:** root-cause report `Reports/LCP_ROOT_CAUSE.md`. Fixes A–D shipped with no SSR and no visible change (FE `e5a9baa`).
  - HTTP/2 Lighthouse: performance 76 → 90; LCP 4.24 → 3.02 s.
  - **LCP ≤ 2.5 s not reached.** The report proposes the minimum HTML-first change (SSR of the public routes only) with its risks, and asks the Owner to choose (a) two small steps, (b) SSR as its own phase, or (c) accept 3.0 s. Not implemented, per instruction.
- **Themes 2–5:** retired from selection (API `400`, the pickers offer Theme 1; a website still on a retired theme renders unchanged). Report: `Reports/THEMES_2_5_RETIREMENT.md`.
  - Gated migration tooling: `atlas-backend` `npm run db:retire-website-themes`, with dry run → `--apply --plan` → `--rollback`. It was verified on a copy of the dev database and by `theme-retirement.spec.ts` (160/160).
  - **Not run in production.** Next: the production dry run and review, a backup, apply, verify. Then a separate change deletes the retired code.
- **Images:** all 12 released (v1) from the 44 existing candidates; no new credits. The §P.7 gate and in-context QA passed (48 cases, EN/AR, 390–1440). Exactly 82 image-slot snapshots were re-recorded (FE `c4cd90e`, `c4597bf`).
- **R2 archive:** the tool was rehearsed end to end against a local private bucket. **Owner:** create `atlas-theme-sources` (private, no `r2.dev` or custom domain, an indefinite bucket lock, a bucket-scoped token), then run `archive-master` × 12 and `verify-archive` (plan §W.C).
- **Regression (final code):**
  - theme baseline 1,047/1,047;
  - FE unit 159 files / 1,573 tests (the known Vitest RPC-timeout message remains);
  - FE typecheck 31, identical to the session start; lint clean;
  - BE unit 156 suites / 4,194 tests. The two cross-repo suites need `ATLAS_FRONTEND_ROOT=/home/user/atlas` in this container layout.
  - BE e2e (provisioning, website) 50/50.
- **Phase status:** Phases 0–7 closed. Phase 8: all in-scope work done except the LCP ≤ 2.5 s target (needs the Owner's decision); the production migration and the R2 archival are prepared, waiting on the Owner. **Phase 9 not started.**
- **Environment notes:**
  - `pgrep -f`/`pkill -f` with a pattern that also appears in your own command line kills your own shell; kill by PID.
  - Run the theme baseline with `THEME_BASELINE_CHROMIUM=/opt/pw-browsers/chromium`.
  - The baseline's full-page shots don't scroll, so lazy images far below the fold show their LQIP. That is expected; use a scrolled capture for in-context QA.

## ★ Status update — continuation session (30 Sep 2026). Read this first.

The sections below describe the state at the first handover. Since then, on the same branch (`claude/practical-wozniak-pjcdhe`, both repos, nothing on `main`):

- **Done and pushed** (details and evidence: plan §V): P-1 CLS, S-1 SSRF (+ S-3), BR-1, A-1 (DOM-only part), J-21, GEN-1, J-ENV (+ J1–J8 all green), P-2 (language-split translations), E-1, OPS-1, image slot audit + manifest re-freeze, and a pre-existing checkout-commission bug found by J5 (BE `5264331`).
- **Regression on the final code:** theme baseline 887/887; FE unit pass; BE unit 155/4,186; BE e2e 166/166; J1–J8 pass.
- **Blocked — images:** 44 candidates (4 × 11 keys) are generated in the Owner's Magnific account, with the seeds and prompts recorded in the manifest's recipe. This environment's network policy denies `pikaso.cdnpk.net` (Magnific's CDN), so they can't be downloaded. Once allowed: fetch the URLs with `mcp__MAG__creations_get`, then run the §P.7 release gate per key, `tools/theme-assets/prepare.mjs`, record provenance (generator, model `imagen-nano-banana-2` = Nano Banana Pro, prompt from `buildThemeAssetPrompt`, seed, creation id, date, licence basis) in the manifest, set `released` / `v1`, and run in-context QA (390–1920 × EN/AR) and the baseline. Creation ids per key (candidates 1–4; `seed` + index):
  - home-benefit (seed 20260910): ks3BB4h16B, 1lRooN7r4r, cpu77aK0eP, TdFOOC3VNR
  - home-cta (20260920): 1lRooRir4r, xS2II2mjfW, JNVQQVwOq4, tCsAAljmZJ
  - courses-launching (20260930): rgZ88n4xtc, SyWffMvUb8, LwGmm0wswO, EbJ00NNuuO
  - about-header (20260940): WDEww1rcXe, Xm1iiwTBfo, gOYaaX6SXO, lJnvvd8gv9
  - about-story (20260950): 1lRoopMr4r, hugzzRpvqL, JNVQQfGOq4, xS2IIXDjfW
  - gallery-1 (20260960): bxNeepC5Y2, p85999Lehw, cpu777R0eP, dtk66ivXSL
  - gallery-2 (20260970): tCsAYEtmZJ, s7zhCOYl8e, JNVQbiQOq4, lJnvEPPgv9
  - gallery-3 (20260980): lJnvEiigv9, ks3BtOX16B, xS2Iv9UjfW, O6MF5ntynm
  - gallery-4 (20260990): VXHyNEHMMU, P3pqkTr42C, Cq7cMSHEEy, 5j6d84dKxe
  - gallery-5 (20261000): LwGmfYfswO, 1lRomGPr4r, hugzc7RvqL, ovxRGld829
  - auth-side (20261010): JNVQb8POq4, VXHyNjgMMU, ovxRGJt829, 3z8rsuBREY
- **Owner decisions still open:** the network allowlist (above); IMG-3 archive bucket; A-1 colour-contrast on Themes 2–5 (visual change); LCP ≤ 2.5 s needs prerender/SSR or a namespace-level split (plan §V.D #8); M-1 gated production migration + deploy (Phase 9).
- **Phase status:** Phases 0–7 closed; Phase 8 not closed (images, LCP); Phase 9 not started.
- **Environment notes learned this session:** Docker Hub pulls are blocked (build MinIO with `go install github.com/minio/minio@latest`); run journeys with the stack from §K plus `npm run e2e:prepare-journeys` in atlas-backend; plain `vite` now serves on :3001 and proxies `/api` to :3000; harness background tasks can be killed mid-run (the full BE e2e was, at 164/166; the last two were re-run).

---

## 0. Quick start for the next Claude

1. Both repos are on branch **`claude/practical-wozniak-pjcdhe`**. Stay on it: commit and push only there, never to `main`.
2. Frontend HEAD before this handover: `1be621d`. Backend HEAD: `d81ba03` (the backend handover commit comes on top).
3. Before this handover commit, both working trees were **clean** (nothing staged, unstaged or untracked) and **in sync with the remote branch** (ahead/behind 0/0).
4. **Nothing from the latest instruction ("full audit → fixes → images → Phase 9") was implemented.** Only investigation happened (§D). No code changed after `1be621d` / `d81ba03`, apart from these handover documents.
5. Read §F (the exact stopping point) and §K (the continuation plan).

---

## A. Project context (from the code and the approved plan)

**Repositories**
- `zeyadelbadawi/atlas`: the frontend. React 18, Vite, TypeScript, Tailwind, shadcn/Radix, TanStack Query, react-i18next (EN/AR), react-hook-form + Zod. Package manager: pnpm.
- `zeyadelbadawi/atlas-backend`: the backend. NestJS, Prisma, PostgreSQL with row-level security (RLS), Redis, BullMQ, S3-compatible storage (Cloudflare R2 in production; MinIO in CI). Package manager: npm.
- Production is a single VPS behind Caddy, which serves the SPA and `/api/*` on the **same origin**. See `Caddyfile` (this repo) and `atlas-backend/.github/workflows/deploy.yml`.

**Tenancy and roles** (backend `src/academy/guards/academy-scope.guard.ts`, `src/website/services/website-configuration.service.ts`, `prisma/migrations/*rls*`)
- Organization → Academies. Organization membership roles and Academy member roles are separate: an Academy role is one of owner / administrator / manager / instructor / staff.
- Guard chain: `JwtAuthGuard` → `ManagementSurfaceGuard` → `AcademyScopeGuard` (org or Academy membership, checked through RLS-scoped lookups). Services then call `assertCanManage`, which requires owner, administrator or manager of **that** Academy for website reads and writes.
- Provisioning uses `OrganizationMembershipGuard` (org routes) and `PlatformOwnerGuard` (platform console).
- Public website routes (`/public/websites/*`, `/public/media/*`) are unauthenticated. Tenant resolution runs through SECURITY DEFINER SQL functions (`resolve_public_hostname`, `resolve_academy_organization`, `resolve_public_presentation`).
- Entitlements and plan limits are enforced server-side (subscriptions / tenant usage; see `p61-*` and `plans-*` e2e suites).

**Website builder**
- Each Academy has a `WebsiteConfiguration` (theme key, brand, SEO, navigation, header/footer) and pages holding typed **sections**.
- Section contracts are Zod schemas, mirrored in both repos. Parity cases live in byte-identical `__parity__/*.cases.json` files in each repo.
- Five themes: `modern-education` (**Theme 1**, the subject of this programme) and `premium-academy`, `corporate-learning`, `minimal-editorial`, `bold-creative` (**Themes 2–5**, which must stay pixel-identical).
- **ThemePack** (`src/features/website/theme-packs/`): renderer dispatch is `pack.renderers[type] ?? BASE_RENDERERS[type]`. Packs also provide chrome, page slots (PageIntro, CourseDetails, NotFound, ComingSoon) and `mapBrandPalette`.
  - Theme 1 lives in `src/features/website/modern-education/`.
  - Themes 2–5 use the base renderers.
- **Brand Engine**: the frontend has the full engine (`src/features/website/brand-engine/`: OKLab/OKLCH, logo analysis in a Worker, role derivation, validation, alternatives). The backend mirrors derivation + validation (`atlas-backend/src/website/brand-engine/`), with shared golden vectors.
  - The backend is authoritative: palettes are re-derived on save, and a confirmed palette is never overwritten silently (`atlas-backend/src/website/brand/brand-palette-update.ts`).
  - The public API strips `confirmedBy`, `confirmedAt` and `extraction`.
- **Media**
  - Tenant uploads are MediaAssets in R2, typed by magic bytes, and referenced by the relative path `/api/v1/public/media/academies/<academyId>/<uuid>.<ext>`.
  - Theme photography is **not** tenant media. It uses the Theme-asset pipeline: `theme-asset:modern-education/<key>` references, resolved by `src/features/website/theme-assets/` and served same-origin from `public/theme-assets/<theme>/<version>/` with immutable caching (Caddy `(theme_assets)` block).
- **Provisioning**: org owner request → BullMQ worker → Academy + subdomain + website generated from a template (`atlas-backend/src/website/templates/`). Theme 1 uses template **v2**. `template_key` / `template_version` provenance is stamped once.
- **Sample content**: Theme 1's starter testimonials are `sample: true`.
  - They're stripped from the public pages payload before caching.
  - Publishing warns about them.
  - Only the explicit editor action "This is a real testimonial" clears the flag.
- **EN/AR**: the dashboard language is a stored preference. The public site's language comes from the **URL** (`/ar/...`, via `usePublicWebsiteDocumentDirection`). RTL is applied on `<html dir>`.
- **Security headers**: an enforced CSP in `Caddyfile` (`script-src 'self'`, `object-src 'none'`, …). The theme baseline harness runs under that exact CSP.

---

## B. The original 10-phase plan (0–9) and its real status

Plan: `Reports/THEME_1_ACADEMY_WEBSITE_PLAN.md` §H (definitions), §I (tests), §J (27 acceptance criteria).

| Phase | Objective (plan §H) | Implementation | Verification | Key commits (FE / BE) | Known remaining work |
|---|---|---|---|---|---|
| 0 | Baseline harness: fixture route, screenshot matrix, axe, Lighthouse, tool checks | Done | REPORTED §M; the harness ran 878/878 in the previous session | `7382baf` / `45dfec9` | — |
| 1 | ThemePack registry, primitives, brand engine core, golden vectors, BE mirror | Done | REPORTED §N; unit suites passed in the previous session | `d83b751` / `1824ab3` | — |
| 2 | Section contracts, categories, MediaAsset uploads, palette persistence, sample model, provenance migration | Done | REPORTED §O | `f3acf5c` / `a66c7cc`, `330480a`, `7a97646` | Provenance migration not yet deployed to production |
| 3 | Theme asset pipeline + Magnific readiness + `home-hero` pilot | Done | REPORTED §P | `8aae2eb`, `fe11666` | Master archive not done (bucket missing); see §H |
| 4 | Theme 1 visual system, chrome, Brand Studio | Done | REPORTED §Q | `48b29c5`, `59489ba`, `2c0da3e`, `d040f46` | "Logo changed elsewhere" suggestion (§F.4.6) **never built**; 12-palette screenshots exist, but the J.21 invariance **audit** doesn't |
| 5 | Theme 1 Home renderers | Done | REPORTED §R | `ec6ecef` | JS budget over §G (the Owner deferred the decision) |
| 6 | Theme 1 inner pages, page heroes, 404, Coming Soon | Done | REPORTED §S | `8e7ab6a` / `9ced7f5` | Presentation migration not yet deployed |
| 7 | Starter content template v2, publish warning, checklist | Done | REPORTED §T | `e2d2d02` / `c777bb9` | — |
| 8 | Hardening & verification (plan §H includes the **final image stage**) | Hardening done and **approved by the Owner**. **The final image stage was NOT done** (the Owner forbade images in Phase 8; the latest instruction now authorises it) | Final runs VERIFIED in the previous session (§C) | `1be621d` / `d81ba03` | Images; J.21 audit; open findings in §G |
| 9 | Release & production verification (§H Phase 9: release order, launch-verify journey, existing Theme 1 academies, production visual QA) | **NOT STARTED** | — | — | Everything; gated on §K |

**Conclusion:** Phases 0–7 are implemented and were approved. Phase 8 is approved as hardening, but under the plan's own definition it is **not closed**: the final image stage, the J.21 automated identity audit and the open findings in §G remain. **Phases 0–8 are therefore not yet formally closed.** Phase 9 has not started.

---

## C. Verified completed work (evidence)

The last complete verification ran in the previous session on exactly the current HEADs (`1be621d` / `d81ba03`; the working trees were identical to those commits):

| Check | Result | Label |
|---|---|---|
| Theme baseline (`pnpm test:theme-baseline`: screenshots, axe, palette injection, production CSP) | **878/878**; Themes 2–5 pixel diff 0 | VERIFIED (previous session, on this HEAD) |
| Responsive overflow sweep 360/768/1280/1920 × EN/AR, Theme 1 pages | 112 states, 0 overflow | VERIFIED (previous session; ad-hoc script, not committed) |
| Frontend unit (`npx vitest run`) | 156 files / 1550 tests pass. Vitest exits 1 because of a `[vitest-worker]: Timeout calling …` RPC error that **also occurs on the approved Phase 7 tree** | VERIFIED (previous session) |
| Frontend typecheck | 31 errors, all from the pre-Theme 1 base commit (platform add-ons, zoom, tenant tests, one website test) | VERIFIED |
| Frontend lint | clean | VERIFIED |
| Backend unit (`npx jest`) | 152 suites / 4151 tests | VERIFIED (previous session) |
| Backend full e2e (`npx jest --config test/jest-e2e.json --runInBand`, fresh DB, **migrate + seed like CI**, MinIO) | **166/166 suites, 2009/2009 tests** | VERIFIED (previous session) |
| Adversarial tenant isolation (`atlas-backend/test/phase8-theme1-tenant-isolation.e2e-spec.ts`) | 9/9 | VERIFIED (previous session) |
| Browser journeys J7 + J8 (`e2e/j7-*.spec.ts`, `e2e/j8-*.spec.ts`, real stack) | 10/10 | VERIFIED (previous session) |
| Migrations vs schema (`prisma migrate diff --exit-code`) | no difference | VERIFIED (previous session) |
| Lighthouse mobile (method as §M.4.2) | Theme 1: perf 55–71, LCP 4.7–5.2 s, Course Details CLS 0.335 | VERIFIED (previous session; numbers in plan §U.D) |
| Journeys J1–J6 (learner / instructor / manager / platform flows) | **NOT RUN**: they need a published website for the seeded Academy, which the seed doesn't create | not verified |

Details of every Phase 8 result: plan §U.

---

## D. What the latest (interrupted) session actually did

The latest instruction asked for a full audit → fixes → production images → regression → closure → Phase 9. **Only the audit's investigation part happened.** Each item below was verified against the repo at handover time.

| # | Claim | Verified? | Evidence |
|---|---|---|---|
| 1 | Both repos inspected | yes | this document |
| 2 | Both clean at the start and in sync with the remote | yes, and still true at handover | `git status -sb`: `## claude/practical-wozniak-pjcdhe...origin/...`, ahead/behind `0 0` |
| 3–4 | Frontend `main` is 4 commits ahead of the branch base, with trees identical to the base | **re-verified**: the 4 commits (`fa429ac`, `479190e`, `f907bb0`, `4a3f5f6`) are merge commits; `git diff --stat <merge-base> origin/main` is **empty**. Backend `main` == the branch base (0 ahead) | `git rev-list --count $(git merge-base HEAD origin/main)..origin/main` |
| 5–6 | The plan was used as the audit contract; Phase 8 acceptance rechecked | yes | plan §H, §I, §J |
| 7 | J.21 automated geometry/style invariance audit missing | yes (static) | 12-palette **screenshots** exist (`e2e/theme-baseline/screenshots.spec.ts`, `BRAND_PALETTES` in `matrix.ts`: default + 11). No test compares DOM geometry, typography, chroma caps or brand-slot usage across palettes (grep for geometry/invariant in `e2e/theme-baseline` finds nothing) |
| 8–11 | Asset pipeline inspected; Theme 1 references 11 photographic keys; only `home-hero` released | yes | `src/features/website/theme-assets/manifests/modern-education.manifest.ts`: 12 entries (the 11 referenced + `auth-side`), `home-hero` `released` `v1`, all others `pending`; files only for `home-hero` in `public/theme-assets/modern-education/v1/` |
| 12 | Suspicious reference `theme-asset:modern-education/nope` | **resolved: not a finding.** It appears only in the negative resolver test `src/features/website/theme-assets/theme-assets.test.ts:232` | grep |
| 13–15 | Open: logo-changed suggestion, private master archive, Magnific terms | yes | plan §Q.5/§R.5/§S.5 carry the first two; §P.3 records that the Owner **lifted** the terms gate on 29 Sep 2026 (paid-plan approval recorded as `licenseBasis`). A live re-check of the account and terms before new generation was planned but **not done** |
| 16 | Server-side overwrite protection for confirmed palettes exists | yes (static) | `atlas-backend/src/website/brand/brand-palette-update.ts` (inputs only, server re-derives, confirmation kept) + e2e `website-theme1-phase2.e2e-spec.ts` |
| 17 | The §F.4.6 "Your logo changed — preview a matching palette?" UI is missing | yes (static) | nothing in `WebsiteBrandTab.tsx` / `brand-studio/` compares `palette.extraction.logoFingerprint` with the current logo |
| 18 | No generation-service test covers every theme × both setup modes | yes (static) | only Theme 1 has it (`atlas-backend/src/website/templates/modern-education.template.spec.ts`); the registry spec checks templates, not generation output. Phase 7 changed shared generation code (`emptyModeMinimum`, section defaults) that affects every theme |
| 19 | J1–J6 couldn't run: the seeded Academy has no website or subdomain | yes | `prisma/seed.ts` creates the Academies (`web-development-academy`, …) but no website; `GET /public/websites/resolve?hostname=web-development-academy` → 404 on a fresh seed |
| 20 | "The audit prepared the seeded Academy context for those journeys" | **FALSE: not done.** Only the approach was decided (create and publish the seeded Academy's website through the real API as the seeded owner before running J1–J6). Nothing was created or committed | — |
| 21–25 | SSRF investigation | yes (static), details in §G S-1 | `atlas-backend/src/certificates/services/certificate-renderer.service.ts` `fetchImage` (any http/https host, `redirect: 'follow'`, no address vetting) vs the vetted pattern in `atlas-backend/src/domain/services/https-probe.service.ts` + `src/domain/utils/outbound-address.util.ts` |
| 26 | Uploaded logos are absolutised and fetched back over HTTP; in dev the base is `http://localhost:3001` | yes (static) | `certificates.service.ts` `absolutePublicMediaUrl` / `publicBaseUrl()` (≈ lines 1293–1310) |
| 27–28 | Proposed SSRF design | **investigation only, NOT implemented** | no diff in either repo |
| 29 | Course Details CLS investigation started | yes: root cause measured (§F) | — |

**No implementation commit was made in the latest session.** The only new commits are these handover documents.

---

## E. The latest session's task checklist and status

| Task | Status | Evidence |
|---|---|---|
| Audit: reconstruct the real state of Phases 0–8 | INVESTIGATED (partial: plan vs code done for most §J criteria; runtime not re-run) | §B, §D |
| Remaining-work model (A/B/C/D classification) | NOT STARTED (a draft classification is in §G) | — |
| Fix SSRF (certificate logo and similar patterns) | INVESTIGATED (design chosen, not implemented) | §G S-1 |
| Fix performance (public route JS, translations, CLS) | INVESTIGATED (CLS root cause found; JS attribution from Phase 8) | §F, §G P-1..P-3 |
| Production images: manifest, licensing check, Magnific generation, integration, QA | NOT STARTED | §H |
| Themes 2–5 accessibility decision | NOT STARTED (facts in §G A-1) | — |
| Local development environment fix | INVESTIGATED (root cause proven in Phase 8) | §G E-1 |
| Migrations | INVESTIGATED (both additive and pending in production) | §G M-1 |
| Remaining B items (logo-changed suggestion, J.21 audit, theme-init matrix, J1–J6 setup) | INVESTIGATED | §G |
| Full regression + closure matrix | NOT STARTED | — |
| Phase 9 per the original plan | NOT STARTED | — |

---

## F. Exact stopping point

**Where:** performance investigation, Course Details CLS (plan §J.8 target CLS ≤ 0.05; Lighthouse had measured Theme 1 at 0.335 and Themes 2–5 at 0.23–0.45).

**How it was measured:**
1. Serve the theme fixture build: `pnpm theme-baseline:build`, then `node e2e/theme-baseline/server/fixture-server.mjs --port 4176`.
2. Run a one-off Playwright script (not committed; recreate it). At a 412×823 viewport it opens `/courses/fx-course-1?__atlas_academy_preview=fx--modern-education--rich--default--c1`, and the same for `fx--premium-academy--rich`.
3. A `PerformanceObserver({type:'layout-shift', buffered:true})` is registered from `addInitScript`, and each shift's `sources` (node, `previousRect` → `currentRect`) are logged.

**Result (observed):**
- modern-education: CLS **0.335**, one shift at ≈1.9 s whose source is `footer.mt-auto.border-t…`, moving from y 547 (h 276) to out of the viewport.
- premium-academy: **0.328**, again the `footer`.
- **Root cause:** during loading, Course Details renders a short loading state, so the footer sits inside the first viewport. When the course data arrives, the content pushes the footer below the fold. The whole shift is the footer. The images and the hero aren't the cause.

**Not yet done:**
- decide the fix;
- check the loading state's markup (`src/features/website/modern-education/T1CourseDetails.tsx` for Theme 1; `src/features/website/renderer/CourseDetailsTemplate.tsx` / the base page slot for Themes 2–5);
- re-measure.

**Candidate fix (not implemented):** make the loading state reserve at least a viewport of height (for example a skeleton with `min-h-[100svh]`) so the footer starts below the fold. This changes only the loading state, not the final render, so the screenshot baseline (captured after load) should stay identical. Verify with the full baseline.

At the moment of interruption the local services (Postgres, Redis, MinIO, the fixture server) had stopped with the container reset. See §K for how to recreate them.

---

## G. Open findings

| ID | Finding | Area | Status | Evidence | Next action |
|---|---|---|---|---|---|
| J-21 | 12-palette identity matrix lacks the automated invariance audit (layout geometry, typography, background/surface chroma caps, brand only in defined slots; plan §I.2 last rows, §J.21) | Theme 1 / tests | OPEN | §D #7 | Add a Playwright spec over `BRAND_PALETTES` comparing element boxes and computed styles against the default palette |
| IMG-1 | 11 of 12 Theme 1 photographic assets are unreleased and render placeholders (§J.3, §J.26) | Theme 1 / assets | OPEN | manifest statuses | §H workflow |
| IMG-2 | `theme-asset:modern-education/nope` | assets | **CLOSED: intentional negative test** | `theme-assets.test.ts:232` | none |
| IMG-3 | Private master archive not in place: needs an Owner-created private R2 bucket `atlas-theme-sources` + a bucket-scoped token (plan §P.7). The `home-hero` master exists only in the Magnific account | assets / ops | BLOCKED (Owner) | plan §P.7 | Ask the Owner; tool ready: `tools/theme-assets/archive-master.mjs` (`npm run archive-master`, `verify-archive`) |
| IMG-4 | Magnific commercial terms | licensing | Owner decision recorded (§P.3: paid plan approved, gate lifted). A live re-check before new generation is still recommended (magnific.com was blocked by the network policy in Phase 3) | plan §P.3 | Check `mcp__magnific__account_profile` / `account_balance`; try reading the terms; record in provenance |
| BR-1 | §F.4.6 "Your logo changed — preview a matching palette?" suggestion missing (also §I.2 "palette persistence", §J.20). The no-overwrite half is implemented server-side | Theme 1 / Brand Studio | OPEN | §D #17 | In `WebsiteBrandTab`: when the palette is `confirmed` or overridden and `palette.extraction.logoFingerprint` ≠ sha256 of the current logo bytes, show a banner with review → accept; never auto-save |
| GEN-1 | Generation output not tested for all 5 themes × {complete, empty} | backend tests | OPEN | §D #18 | Unit matrix through `WebsiteGenerationService` (pattern in `modern-education.template.spec.ts` `setup()`), validating every page with `sectionInstanceArraySchema` |
| J-ENV | J1–J6 need the seeded Academy's website created and published | e2e env | OPEN (not prepared) | §D #19–20 | Before running J1–J6: as `sarah.chen@acme-academy.dev` / `DevPassword123!`, create or bootstrap and publish the website of `web-development-academy` through the API (and a subdomain if resolve still 404s); document the prep in the handover or a helper |
| S-1 | **Certificate renderer SSRF (Medium, pre-existing):** `fetchImage` fetches the logo and signature URL from any http(s) host, follows redirects, with no address vetting. Reachable by any Academy manager through the API (the UI only offers the media picker) or through legacy absolute `academy.logoUrl` values. Blind: nothing is returned except an image embedded in the PDF. Warnings aren't exposed (preview discards them; `renderError` isn't in any DTO) | backend security | INVESTIGATED; design chosen, **not implemented** | `certificate-renderer.service.ts` ~L727–770 | Implement: (1) own media paths `/api/v1/public/media/academies/<uuid>/<uuid>.<ext>` read via `MEDIA_STORAGE_PROVIDER.getObject` (exported by `MediaModule`, already imported by `CertificatesModule`) with no HTTP; (2) legacy `data:image/(png|jpeg|jpg|webp);base64` decoded in-process; (3) any other http(s) URL only through a vetted fetch reusing `isPublicAddress` / `isIpLiteralHostname` from `src/domain/utils/outbound-address.util.ts` (resolve all addresses, refuse non-public, pin the connection with a custom `lookup`, **no redirects**, timeout, streamed byte cap). Stop absolutising media URLs in `certificates.service.ts` (`absolutePublicMediaUrl`). Add unit tests (private/loopback/metadata IPs refused, redirects refused, own media from storage) + an e2e |
| S-2 | Other outbound fetches reviewed: Zoom recording downloads (URL from Zoom's authenticated API), monitoring sources (platform-configured), Google/Zoom OAuth, Cloudflare, email providers (fixed hosts), domain probe (already vetted) | backend security | Investigated → acceptable (D) | `live-sessions/services/recording-import.service.ts`, `zoom.provider.ts` | Optionally add a `*.zoom.us` host allowlist as defence in depth |
| S-3 | Dev-only: certificates never show uploaded logos locally (base URL points at the frontend on :3001) | backend | Fixed by S-1's storage read | §D #26 | Covered by S-1 |
| P-1 | Course Details CLS 0.33–0.45 on all themes | perf | ROOT CAUSE FOUND | §F | Reserve viewport height in the loading state; re-measure; the full baseline must stay 878/878 |
| P-2 | Main public chunk ≈ 398 KB gzip; translations for all 41 namespaces × EN+AR are statically bundled (≈ 218 KB gzip, ≈ 56 %); total JS on public pages 612 KB; LCP 4.7–5.2 s (target 2.5 s) | perf (platform-wide) | INVESTIGATED, decision pending | plan §U.D; `src/localization/resources/index.ts` imports everything; `src/localization/i18n.ts` builds all resources | Evaluate (a) language-split loading (only the active language; low risk), (b) namespace-split for the public route (bigger win, needs namespace coverage), (c) dashboard-only modules found in the main chunk (`CourseCompletionSettingsCard`, quiz-authoring schemas, `LifecyclePanel`, cmdk, input-otp). Measure the API waterfall too. The 2.5 s target may need SSR/prerender; document that honestly |
| P-3 | Brand engine colour-space helpers on the public route (≈ 1.5 KB gzip) | perf | Acceptable (D): used by Theme 1's legacy-colour mapping | plan §U.D | none |
| A-1 | Themes 2–5 axe: `page-has-heading-one` (84 states), `color-contrast` (8), premium-academy's own 404 / Coming Soon `landmark-one-main` / `region` | a11y | OPEN: decision needed | `e2e/theme-baseline/__screenshots__/axe/**` | Investigate whether heading/landmark fixes can be DOM-only (pixel diff 0), as done for `PublicWebsiteStatus` in Phase 8 (h1 needed `tracking-normal`). Contrast fixes are visual: leave them unless the compatibility contract allows |
| E-1 | Local dev: the checked-in `.env` sets `VITE_API_BASE_URL=http://localhost:3000/api/v1` (cross-origin from Vite :3001). Axios has no `withCredentials`, so the session cookie is never stored (reload → sign-in) and relative media URLs break. Production (same origin) is unaffected. Proven A/B in Phase 8 | dev config | ROOT CAUSE PROVEN; not changed | plan §U.I | A non-breaking fix: e.g. `.env.development` / docs using `VITE_API_BASE_URL=/api/v1` + `BACKEND_PORT=3000` (Vite `/api` proxy exists in `vite.config.ts`). Check who relies on the current `.env` first |
| M-1 | Two additive migrations are pending in production: `20261024000000_website_template_provenance` (nullable columns), `20261030000000_public_website_presentation` (SECURITY DEFINER function). The Phase 6–7 code depends on them | backend / release | Understood; **must go through the gated deploy** | `atlas-backend/.github/workflows/deploy.yml` (`apply_migrations=true` + `production-migrations` environment approval) | Phase 9 release step; needs the Owner's approval. Never run it without authorisation |
| OPS-1 | BullMQ builds its Redis connection from host/port/password only (drops DB index and TLS) | backend infra | OPEN (low today) | plan §U.H | Fix before any TLS/managed Redis |
| T-1 | Frontend typecheck: 31 pre-existing errors; vitest RPC-timeout exit 1 (pre-existing) | tooling | Known, pre-existing | §C | Optional cleanup; not Theme 1 |
| UX-1 | Cookie banner covers part of the mobile hero | UX | Recorded out of scope (§Q.5) | — | Revisit with production images |

---

## H. Image / asset handover

> **NO PRODUCTION IMAGE GENERATION WAS COMPLETED DURING THIS SESSION.** The repository contains exactly one released photograph (`home-hero`, generated in Phase 3, 29 Sep 2026). Everything else is `pending` and renders the designed placeholder.

- **Manifest (source of truth):** `src/features/website/theme-assets/manifests/modern-education.manifest.ts`. Each entry holds key, ratio, master size, delivered widths, focal point, EN/AR alt text, direction (prompt subject), composition (slot, crop per breakpoint, safe area, overlay exclusion, RTL), byte budget, status and provenance.
- **Schema:** `theme-asset.schema.ts`. A `released` entry requires version, LQIP ≤ 300 B and full provenance: generator, tool, model, exact prompt, seed / job id, date, reviewer, outcome, license basis and master sha256.
- **Prompt builder:** `buildThemeAssetPrompt`. The recorded prompt must equal it (tested).
- **Resolver / renderer:** `resolve-theme-asset.ts`, `ThemeImage.tsx` (`<picture>`, AVIF/WebP `srcset`, intrinsic size, LQIP, focal → `object-position`, lazy except the priority hero).
- **Released files:** `public/theme-assets/modern-education/v1/home-hero-{480,800,1200,1600}.{avif,webp}`. Released folders are listed in `released-versions.ts` (`modern-education/v1`); an immutability test enforces the list.
- **Preparation tool:** `tools/theme-assets/prepare.mjs` (own `package.json`; `npm ci` there). It uses sharp for sRGB conversion, metadata stripping, AVIF q50 / WebP q75 at the manifest widths, and the LQIP, enforces budgets, and never overwrites.
- **Archive tool:** `tools/theme-assets/archive-master.mjs` (blocked on IMG-3).
- **Integration:** templates reference `theme-asset:modern-education/<key>`. Backend template v2 (`atlas-backend/src/website/templates/modern-education.template.ts`) applies them in both setup modes. Do **not** push theme photos into tenant MediaAssets. Releasing an asset = files in `public/theme-assets/modern-education/v1/` + the manifest entry set to `released`. New keys may join `v1`, but a released file is never changed: a changed asset means `v2` plus a reference bump.
- **Keys** (planning values from the manifest and plan §E.2 / §P.7; the plan requires re-freezing them from the implemented UI, §E.6 steps 7–9, before generation):

| Key | Status | Ratio / master | Widths | Slot (desktop / tablet / mobile) |
|---|---|---|---|---|
| home-hero | **released v1** (Nano Banana Pro 4K, candidate 2 of 4) | 4:5 · 2000×2500 | 480, 800, 1200, 1600 | Home hero image column 4:5 ~560px / 16:10 full / 4:3 full; top band clear for the chip (top-right EN, top-left AR) |
| home-benefit | pending | 4:3 · 2400×1800 | 480, 800, 1200, 1600 | Home featureSplit, logical start |
| home-cta | pending | 3:4 · 1500×2000 | 400, 800, 1200 | Ink CTA band, logical end; hidden < 480px; plain near-black edges |
| courses-launching | pending | 16:9 · 2400×1350 | 640, 1024, 1600 | Featured-courses empty state |
| about-header | pending | 21:9 · 2800×1200 | 800, 1280, 1920, 2560 | About page hero band; 4:3 phone crop |
| about-story | pending | 4:3 · 2400×1800 | 480, 800, 1200, 1600 | About story split |
| gallery-1 | pending | 4:3 · 2400×1800 | 480, 800, 1200, 1600 | About gallery bento 2×2 |
| gallery-2 | pending | 4:3 · 2400×1800 | 480, 800, 1200, 1600 | Bento 2×1 |
| gallery-3/4/5 | pending | 1:1 · 1600×1600 | 400, 800, 1200 | Bento 1×1 |
| auth-side | pending | 3:4 · 1500×2000 | 400, 800, 1200 | Auth shell side panel, desktop only (`ModernEducationAuthFrame.tsx`) |

- **Art direction and exclusions:** the shared direction strings at the top of the manifest (documentary photography, warm-neutral grade, diverse adults incl. modest attire; no text, logos, readable screens, watermarks or real people).
- **Release gate:** plan §P.7, the checklist every candidate must pass (anatomy, no text or logos, safe area, LTR/RTL, crops in context, budgets, alt text, 0 CSP violations, provenance, archive).
- **Magnific:** the MCP was connected. Phase 3 used Google Nano Banana Pro at 4K (150 credits per image). The account is Premium+ (as of Phase 3). Licensing: the Owner approved using the paid subscription (§P.3); record the `licenseBasis` per asset.
- **Approval basis for generation:** plan §E.6 step 4 requires the re-frozen matrix to be approved before generation. The Owner's latest instruction (30 Sep 2026) directs generating once the manifest is validated; record that as the approval basis.
- **Approved or placeholder:** only `home-hero` is approved and released. Every other slot is a placeholder. OG image (plan §E.2 "derived from `home-hero`") isn't implemented: `useDocumentSeo` uses `seo.ogImage` only.

---

## I. Commits

| Repository | Commit | Purpose | Phase | Status |
|---|---|---|---|---|
| atlas | `43ea054`, `f7ae9df` | Theme 1 plan (+ approved decisions) | plan | on branch |
| atlas | `e240ee4` | UI/UX Pro Max skill (project) | tooling | on branch |
| atlas | `7382baf` | Baseline harness | 0 | approved |
| atlas | `d83b751` | ThemePack, brand engine, primitives | 1 | approved |
| atlas | `f3acf5c` | Contracts, base renderers, media uploads, catalog URL, samples | 2 | approved |
| atlas | `8aae2eb`, `fe11666` | Asset pipeline; `home-hero` release | 3 | approved |
| atlas | `48b29c5`, `59489ba`, `2c0da3e`, `d040f46` | Visual system, chrome, Brand Studio; compositions + archive tool; plan update | 4 | approved |
| atlas | `ec6ecef` | Home renderers | 5 | approved |
| atlas | `8e7ab6a` | Inner pages, page heroes, 404, Coming Soon | 6 | approved |
| atlas | `e2d2d02` | Publish warning, checklist, preview samples | 7 | approved |
| atlas | `1be621d` | Hardening, a11y fixes, J8, report §U | 8 | approved (hardening) |
| atlas-backend | `45dfec9` | Template fixture exporter | 0 | approved |
| atlas-backend | `1824ab3` | Brand engine mirror | 1 | approved |
| atlas-backend | `a66c7cc`, `330480a`, `7a97646` | Contracts, categories, samples, palette; provenance migration; MediaAsset paths | 2 | approved |
| atlas-backend | `9ced7f5` | Hostname presentation (migration) | 6 | approved |
| atlas-backend | `c777bb9` | Template v2 | 7 | approved |
| atlas-backend | `d81ba03` | Tenant-isolation suite, logo validation | 8 | approved |
| both | *(this commit)* `docs: add Atlas Claude session handover` | This handover | handover | pushed to the working branch |

**The latest session produced no implementation commit.**

---

## J. What may and may not go to `main`

**Current branch to continue from:** `claude/practical-wozniak-pjcdhe` in both repos.

**Safe to merge eventually** (after the Phase 9 release gate, the Owner's go-ahead and the gated migration run): the Phase 0–8 commits listed in §I. They are implemented, reviewed and verified, and belong to the approved plan. The branch merges cleanly: frontend `main` differs from the base only by tree-identical merge commits; backend `main` == base. **Release order (plan §H Phase 9):** backend contracts/validation → frontend packs/renderers/Brand Studio → backend template v2, with both migrations through the gated `apply_migrations` deploy.

**Must not be merged yet:**
- anything unverified or partially implemented (none exists yet);
- any future SSRF or performance change until it passes the full regression (878 baseline, unit, full e2e, journeys);
- generated images before the §P.7 release gate and in-context QA;
- production migration execution without the Owner's approval;
- anything touching Themes 2–5 visuals.

**Never:** push to `main`, force-push, rebase the shared branch, or deploy, without explicit authorisation.

---

## K. Instructions for the next Claude

1. Read this file and `atlas-backend/docs/ATLAS-CLAUDE-HANDOVER.md`. **Verify** the key claims (git state, manifest statuses, the absence of the S-1/BR-1/J-21 implementations) rather than trusting them.
2. `git fetch`; confirm both repos are on `claude/practical-wozniak-pjcdhe`, clean, and at the handover commits.
3. Read the plan: §H (phases), §I (tests), §J (acceptance), §E (images), §P.7 (release gate), §U (Phase 8 results).
4. Recreate the local environment (services died with the container):
   - PostgreSQL 16: the data dir used was `/var/lib/postgresql/atlas-e2e`; start it as the postgres user with `pg_ctl -D … -o '-p 5432 -k /tmp' start`. Roles `atlas` / `atlas_ci_password` and `atlas_app` / `atlas_app_dev_password`. **E2E DBs must be migrated AND seeded (`npx prisma migrate deploy && npx prisma db seed`), exactly as CI does.**
   - Redis: dev on 6379, e2e on 6380 (the BullMQ prefix `bull-test` isolates test queues).
   - MinIO (CI credentials `atlas_media_ci` / `atlas_media_ci_password`, bucket `atlas-media-ci`, `R2_FORCE_PATH_STYLE=true`, endpoint `http://localhost:9000`). Run it as a detached daemon (`setsid nohup … & disown`), because harness background tasks are killed after 30 min. The binary was built from source via the Go proxy (downloads from dl.min.io and quay were blocked).
   - The backend e2e env mirrors `.github/workflows/ci.yml`'s env block.
   - Frontend: Vite on :3001. The dev API is `node dist/main.js` (after `npx nest build`) on :3000 with `CORS_ALLOWED_ORIGINS=http://localhost:3001`. Seed users: `sarah.chen@acme-academy.dev` (org owner), `admin@atlas.dev` (platform owner), password `DevPassword123!`.
   - Clear the sign-in rate limiter with `redis-cli --scan --pattern 'ratelimit:*' | xargs -r redis-cli del`.
   - Browser tests: `E2E_CHROMIUM=/opt/pw-browsers/chromium`; theme baseline: `THEME_BASELINE_CHROMIUM=/opt/pw-browsers/chromium pnpm -s test:theme-baseline` (after `pnpm -s theme-baseline:build`).
   - Backend unit tests need a sibling symlink `/home/user/atlas-front` → `/home/user/atlas` for 2 suites (remove it afterwards).
   - Never `pkill -f` a pattern that also matches your own shell command.
5. Continue from §F: fix P-1 (Course Details CLS), then work through §G in priority order: security S-1 → data safety / Brand BR-1 → a11y A-1 decision → regression gaps (J-21, GEN-1, J-ENV) → performance P-2 → E-1 → OPS-1. Make technical decisions yourself (the Owner's instruction), and verify each with tests.
6. Images (§H): re-derive the slots from the implemented UI (plan §E.6 steps 7–9) → validate the manifest → re-check the Magnific account and terms → generate 3–4 candidates per key → release gate (§P.7) in context at 390/768/1024/1280/1440/1920 × EN/AR → `prepare.mjs` → release in the manifest → archive (blocked on IMG-3; report it).
7. Full regression: frontend unit, typecheck, lint, build; backend unit, e2e (fresh + seeded), lint, format, typecheck; the 878-case theme baseline; J1–J8 journeys (prepare J-ENV); Lighthouse; axe; RTL.
8. Produce the Phase 0–8 closure matrix with evidence. Start Phase 9 (plan §H Phase 9) only when every gate in the Owner's instruction is met. Production migrations and deploys need the Owner's explicit authorisation.

**Remaining decisions that belong to the Owner:** creating the private R2 archive bucket (IMG-3); authorising the gated production migration and deploy (M-1); approving any visible change to Themes 2–5 (A-1 contrast).
