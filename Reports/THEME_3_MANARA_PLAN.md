# Theme 3 — "Manara": plan and contract

Status: proposal written 6 Oct 2026, before implementation. Branch `claude/confident-bardeen-s216dw` in both repos.
Theme key: **`manara`** (kebab-case slug, the convention `modern-education` and `atelier` set; not one of the retired keys).

This document is the contract between the workstreams. Facts in §1–§2 were read from the code and the earlier plans
(`THEME_1_ACADEMY_WEBSITE_PLAN.md`, `THEME_2_ATELIER_PLAN.md`, `THEMES_2_5_RETIREMENT.md`, `Atlas Vision (Volumes 1–6).md`).

## 1. What exists (verified, 6 Oct 2026)

- **Theme = key + token definition + ThemePack.** `src/types/website-theme.types.ts` (`SELECTABLE_WEBSITE_THEME_KEYS`),
  `themes/<key>.theme.ts` + `website-theme.registry.ts`, `theme-packs/theme-pack.loader.ts` (`CHUNKED_PACKS`: a pack is
  its own lazy chunk), `theme-packs/theme-stylesheets.ts` (its CSS is a plain `?url` asset linked in cascade order), one
  pack module (`renderers`, `chrome`, `pages`, `mapBrandPalette`, `assets`). Themes with a pack: `modern-education`,
  `atelier`. Retired keys render through the base pack.
- **Section data is shared by every theme.** 16 section types, one config schema per type in both repos (parity cases).
  Content limits live on the shared contract (`ARCHITECTURE.md` → "Content limits"). **Manara adds no config field.**
  The builder's section list, settings forms and previews are theme-agnostic and render through the real
  `WebsiteRenderer`; theme-only fields are declared with `SectionFieldDescriptor.themes` (`section-fields.registry.ts`).
- **Brand engine** derives 19 contrast-checked roles from the Academy's seeds/palette; each pack maps roles to its own
  CSS variables (`atelier.brand-mapping.ts` re-solves every text/fill pair per ground and proves it in a matrix test).
- **Backend** stores `website_configurations.theme_key` (TEXT). Allowed keys = `SELECTABLE_WEBSITE_THEME_KEYS` in
  `src/website/constants/website.constants.ts` (`@IsIn` on the configuration and provisioning DTOs). Provisioning's
  theme step calls `getWebsiteTemplate(themeKey)` → a starter template per theme is mandatory (`templates/<key>.template.ts`
  - `website-template.registry.ts`). No migration needed. Fixtures: `npm run fixtures:website-templates`.
- **Routes a theme must draw**: data-driven core pages (home, about, courses, faqs, contact, `courses/:id`), auth pages
  (`AuthFrame`), `PageIntro`, 404, Coming Soon, header, footer. The learner portal (`my/*`) is shared and themed by the
  palette bridge only.
- **Assets**: `theme-asset:<theme>/<key>`, per-theme manifest shipped with the pack, derivatives under
  `public/theme-assets/<theme>/v1/` from `tools/theme-assets/prepare.mjs` (AVIF q50 + WebP q75 + LQIP, byte budgets),
  `released-versions.ts`, masters archived to the private bucket by `archive-master.mjs` (needs `ATLAS_THEME_ARCHIVE_*`).
  Photographs follow the theme at render time (`adopt-theme-assets.ts`, `EQUIVALENT_KEYS` for slots whose key differs).
- **Shared code that enumerates themes** (every one gets a `manara` entry): `theme-pack.loader.ts` (`CHUNKED_PACKS`),
  `theme-stylesheets.ts`, **`vite.config.ts` `THEME_STYLESHEET_PATH` regex** (names the theme directories whose CSS
  becomes links), `theme-assets/manifests/index.ts`, `released-versions.ts`, `adopt-theme-assets.ts`,
  `src/test/setup-theme-packs.ts`, `renderer/__snapshots__/website-theme-scope-variables…snap`, tests that count
  themes (`setup-theme-picker.test.tsx`, `website-theme-tab-themes.test.tsx`, `website-theme.registry.test.ts`),
  `e2e/theme-baseline/{matrix.ts,server/fixture-server.mjs,lighthouse/run-lighthouse.mjs,screenshots.spec.ts,axe.spec.ts,
palette-injection.spec.ts,theme-pack-split.spec.ts}`, `server/ssr/ssr.test.mjs` (`PACKS`, `MARKERS`, stylesheet regex,
  size budget), `ssr/theme-font-preloads.ts` (opt-in, Atelier only today), i18n `website.json` → `themes.<key>` +
  `<key>.*`, backend `website.constants.ts` / `website-template.registry.ts` / `website-generation.matrix.spec.ts` /
  `test/{website,provisioning}.e2e-spec.ts`. Atelier reuses Theme 1's `useT1Navigate` and `setFaqFilter`; Manara does
  the same (shared helpers, not a dependency on Theme 1's look).
- **Motion today**: CSS + one `IntersectionObserver` reveal (`primitives/Reveal`); Atelier adds CSS scroll-driven
  scenes. `framer-motion` is not on the public bundle. Fonts are self-hosted (`src/assets/fonts`, OFL).
- **Quality harness**: theme-baseline (screenshots EN/AR × 1440/1024/390 × new/rich, axe, palette injection,
  pack-split guard, SSR mode), `server/ssr/ssr.test.mjs`, Lighthouse runner, real-stack Playwright journeys (J35g
  provisions Atelier through the setup form).

## 2. Who Atlas is for, and the gap

Evidence (paths in the audience notes): the marketing site says "For academies and training providers in Egypt and
beyond"; payments are Egyptian wallets/InstaPay/bank; the Vision's Phase 1 target and five-star persona is **the
Egyptian secondary-school (Thanaweya Amma) teacher** moving thousands of students off WhatsApp/Telegram, followed by
"the famous teacher" with a team and the training-centre owner. Learners are **students on phones**, often with a
parent paying. Atlas has the product for them (practice/exam quizzes with integrity mode, live sessions, certificates,
progress, Arabic UI, manual payments).

- **Theme 1** serves the general modern school for adult learners (friendly brochure, adult professional imagery).
- **Theme 2 / Atelier** serves creator-led expertise schools (quiet studio publication).
- **Neither** is teacher-led, mass-audience, result-driven, or Arabic-first in its typography. The most-used retired
  theme in production was `bold-creative` (9 of 18 retired-theme sites): real demand for an energetic look. Nothing
  today speaks to subjects, grade years, exam season, scores, or a classroom that is also a brand.

**Theme 3 fills that gap.**

## 3. Proposal

1. **Name**: **Manara** (منارة, "lighthouse/beacon"). The display face is _Alexandria_ — the Lighthouse of Alexandria.
2. **Target audience**: teacher-led and centre-led academies with large student audiences — secondary-school and
   exam-preparation teachers, tutoring centres, language/test-prep and bootcamp-style academies — whose visitors are
   students (and parents) on phones.
3. **Design thesis**: _the teacher on stage, the student on the phone._ A bold, kinetic, poster-like theme: a dark
   "night" stage, brand colour as **surface** (big dyed blocks), oversized Arabic-first display type, giant numbers,
   slanted "beam" seams, poster-style course cards, and a sticky "Join" action always one tap away.
4. **Why it belongs in Atlas**: it is designed for the product's own Phase 1 persona; it is Arabic-first in a market
   that is; it turns the data Atlas already has (courses, levels, counts, live sessions, exams) into proof and a path.
5. **Vs Theme 1**: T1 is a white brochure with rounded elevated cards, the brand as _signal_ (CTAs, strokes, chips),
   neutral canvas, Readex/Rubik, split hero, 20px radius. Manara is a dark stage with brand as _wash_ in defined
   blocks, 0–8px radius, slanted seams, a full-bleed type-led hero, poster cards, scoreboard numerals, a solid
   brand-block header, a mobile-first rail composition.
6. **Vs Theme 2**: Atelier is paper, hairlines, serif, numbered chapters, a drawn thread, cinematic pinned scenes,
   small-caps labels, quiet. Manara is loud and fast: no hairlines, no serif, no chapters, no pinning; blocks instead of
   margins; a one-shot beam instead of a scroll-drawn thread; proof-first order instead of narrative order.
7. **Visual direction**: two grounds — **night** (near-black tinted with the brand hue) and **day** (cool off-white).
   **Blocks**: the primary, solved to carry white text, and the accent, solved to carry its own ink text, fill whole
   tiles, the header, the scoreboard and the CTA. **Seams**: 12° slanted edges between grounds (`clip-path`, logical,
   mirrored in RTL). **The beam**: a diagonal band of the accent that sweeps once across the hero at load and marks
   the CTA. **Cards**: poster-style — image with a slanted bottom edge, level pill, price tag, bold title. **Numerals**:
   huge, in the display face, Arabic-Indic digits in Arabic.
8. **Typography**: display + UI = **Alexandria** (OFL, variable 300–900, Arabic and Latin designed as one family by
   Mohamed Gaber & Julieta Ulanovsky; self-hosted `arabic`/`latin`/`latin-ext` woff2 subsets, ~30 KB each, declared in
   `manara.css` like Atelier's face); body = Rubik (already self-hosted). Weight and size carry hierarchy — never
   uppercase (meaningless in Arabic). Scale (clamp): display 36→64 px, section titles 28→44, numerals 56→96, body 17/16,
   labels 13–14 at weight 600. Measure ≤ 60ch. Latin display tracking −0.02em; Arabic none.
9. **Colour strategy**: the engine's palette → `--mn-*` variables. Night = L 0.17, C ≤ 0.03 in the brand hue; day =
   L 0.985, C ≤ 0.006. `--mn-block` = primary re-solved so `#fff`-ish text ≥ 4.5:1; `--mn-accent` = accent re-solved for
   its ink text ≥ 4.5:1; links/focus/pills derived per ground. Every emitted text/fill pair is re-solved on the ground
   it is painted on and proven by a matrix test over the 11 baseline palettes (as Atelier's). Body text on day stays
   near-neutral ink: a logo never recolours paragraphs. Defaults when an Academy has no colours: a deep cobalt, a
   night navy and a warm amber (`defaultPrimary/Secondary/Accent`).
10. **Homepage architecture** (template v1 order; every section has a purpose; optional/empty data hides it):
    1. `hero` — **Stage**: night ground; eyebrow; display headline with the highlight in the accent; subtitle; actions
       (Join = accent block, Courses = light outline); highlights as **proof pills**; optional underlined search; the
       poster image on the end side with a slanted mask and the beam sweep. Phones: headline → actions → pills →
       poster banner (3:2 crop).
    2. `statistics` — **Scoreboard**: live metrics only (≥ 2), giant numerals on alternating brand/accent tiles.
    3. `courseCategories` — **Pick your track** (≥ 2): big block tiles with name, count and an arrow.
    4. `featuredCourses` — **Now enrolling**: poster cards, 3/2 columns, a scroll-snap rail on phones; empty state is
       a block with `courses-launching`.
    5. `featureSplit` — **How we teach**: slanted image + title + bold numbered points, day ground.
    6. `steps` — **Start in three steps**: a horizontal track with outlined numerals and a beam connector; vertical on
       phones.
    7. `features` — **What's included**: four icon tiles (platform-true copy: lessons on your phone, practice and
       exams, progress you can see, help when stuck).
    8. `testimonials` — **Students say**: night ground, bold quote cards, prev/next + "02 / 05", no autoplay; samples
       never public.
    9. `instructors` — **Your teachers**: large name plates (initials block, courses count); derived data; hidden
       when none.
    10. `faq` — **Before you join**: numbered bold accordion.
    11. `cta` — **Enrolment is open**: brand block with the beam; huge line; Join + Contact.
        Order is proof-first (hero → scoreboard → tracks → courses), unlike T1 (hero → highlights → categories …) and T2
        (hero → philosophy chapters …). A brand-new Academy (no live data) still reads: hero → how we teach → steps →
        what's included → FAQ → CTA.
11. **Inner-page architecture**: `pageHeader` = **banner block** (brand block, slanted bottom seam, giant title, lead,
    optional search, optional image tile). About: banner, `featureSplit` story (`about-story`), `features` values,
    `statistics`, `instructors`, `gallery` (slanted mosaic), `cta`. Courses: banner with search + `courseCatalog`
    (sticky pill filter bar: search/category/level/price/sort; poster cards; numbered pagination; typographic empty and
    error states; `useCourseCatalog`) + `cta`. FAQs: banner + `faq` + `cta`. Contact: banner + `contact` (channels as
    block tiles, bold-label form, existing submission + honeypot) + `faq` teaser. Course Details (`useCourseDetails`):
    night poster header (category pill, title, summary, meta pills, rating when reviews exist, the course's media),
    sticky enrolment panel on desktop / sticky bottom bar on phones, curriculum as a numbered track, reviews, related
    courses. Auth frame: night side panel (academy name huge, beam, `auth-side`) + form column. 404 / Coming Soon:
    night posters with giant numerals. Header: solid brand block, logo/name, nav, locale, Sign in, accent **Join**;
    phones: hamburger → full-screen Sheet (Radix, focus-managed) with display-size links. Footer: dark block, academy
    name large, link columns, contact, platform attribution on the copyright line.
12. **Interaction/animation strategy**: no new dependency, no scroll listeners, no pinning. (a) hero beam sweep once
    at load (transform/opacity, 900 ms) and staggered rise of supporting lines — the headline never animates; (b) one-
    time `Reveal` entrances per group (stagger ≤ 400 ms); (c) hovers: tile lift 2 px, poster image scale 1.03, link
    underline-draw (150–300 ms); (d) one CSS scroll-driven decoration — the header's beam fills with scroll
    (`animation-timeline: scroll()` inside `@supports` and `prefers-reduced-motion: no-preference`); (e) carousel is
    manual, keyboard-reachable, counter in text. Reduced motion: everything at its final state; verified in a real
    browser context. Only `transform`, `opacity`, `clip-path` animate.
13. **Image / art direction** (Magnific only, new assets, none shared with T1/T2 — a test compares master hashes):
    _"After-hours stage light"_ — photographic realism, high contrast, deep cool-dark grounds (charcoal, ink blue) with
    one warm directional key light (desk lamp, projector, window at dusk), low saturation so the brand dyes sit on top.
    Subjects are exam-season learning without people's faces: a lamp over notebooks and blank exam sheets, a lecture
    hall from the back rows, a blank whiteboard with markers under a spotlight, stacked plain textbooks, a phone face
    down beside notes, hands writing, a teacher's silhouette from behind at a blank board, a tutoring-centre corridor
    at night. Exclusions as Atelier's plus "no lit screens". 14 keys, same slots as the other themes so photographs
    follow the theme: `home-hero` 4:5 (priority), `home-benefit` 4:5, `home-cta` 16:9, `courses-launching` 3:2,
    `about-header` 21:9, `about-story` 4:5, `gallery-1…5` (4:5, 3:2, 1:1, 4:5, 3:2), `auth-side` 4:5,
    `course-fallback` 3:2, `theme-card` 16:9. Nano Banana Pro 4K masters, 2–4 candidates per key, full-frame + 100 %
    review (faces, hands, marks, logos, frame lines), `prepare.mjs` into `manara/v1`, provenance recorded, masters
    archived when credentials are present. `EQUIVALENT_KEYS.manara = { 'home-philosophy': 'home-benefit' }`.
14. **CMS content model**: no new fields; every section renders the shared contracts; all copy, images, alt text, CTAs,
    section visibility and order come from the CMS. New Academies get template v1 (bilingual, neutral claims,
    `{{academyName}}` only, metric-only statistics, sample testimonials). Content safety: the shared limits plus two
    SSR-safe fit rules documented here — the hero headline steps down one size above 48 characters, and a tile's
    title/label wraps with `overflow-wrap: anywhere`; nothing truncates. Legacy/over-limit content keeps rendering.
15. **Performance strategy**: LCP on phones is the headline text (fonts `swap`, ~30 KB subsets, preload opt-in as
    today); on desktop the poster (`priority`, 1200w AVIF ≤ 180 KB); every other image lazy with `sizes` per slot; the
    pack is its own chunk and stylesheet, linked only where Manara renders (pack-split guard extended); no new
    runtime dependency; targets: CLS ≤ 0.1, JS/CSS ≤ Atelier's, Lighthouse recorded on the fixture build before merge.
16. **Accessibility strategy**: one `h1` per page (`usePageOpeningHeading`), landmarks, skip link, 44 px targets,
    visible 3 px focus ring solved per ground, decorations `aria-hidden`, status by text not colour, Radix Sheet menu,
    carousel buttons labelled with a text counter, contrast matrix test, axe 0 violations on every theme-baseline case
    (EN/AR, new/rich, all pages).
17. **Responsive strategy**: composed for 390 first (single column, rails, stacked blocks), then 768 (2-up tiles),
    1024 (3-up, banner + aside), 1440 (12-col asymmetric blocks). Slanted shapes are `clip-path` on in-flow boxes with
    `overflow-x: clip`, so nothing scrolls sideways; checked at 390/768/1024/1440 in EN and AR, short and long content.

UI/UX Pro Max gate (run 6 Oct 2026, `--design-system`, variance 8 / motion 5 / density 6): pattern _Trust & Authority +
Conversion_ (hero → proof → solution → CTA) — matches §3.10; style _large blocks, bold 700+ type, visible grid,
asymmetric, high contrast_ — adopted, with 150–300 ms transitions instead of "instant"; avoid playful design and AI
purple/pink gradients — adopted. The tool's generic Arabic pairing (Noto Naskh/Sans) is replaced by Alexandria, a
single Arabic+Latin family that keeps EN and AR identical in weight and rhythm; recorded as a deliberate deviation.

## 4. Workstreams and file ownership

| WS               | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F Foundation     | `src/types/website-theme.types.ts`, `themes/manara.theme.ts` + registry, `theme-packs/{theme-pack.loader,theme-stylesheets}.ts`, `manara/manara.pack.ts`, `manara/manara.brand-mapping.ts`(+test), `manara/manara.css` (tokens, fonts, beam, seams), `manara/manara.stylesheet.css`, `manara/manara-parts.tsx`, `src/assets/fonts/alexandria-*.woff2` + OFL, `theme-assets/manifests/manara.manifest.ts` + index, `adopt-theme-assets.ts`, `src/test/setup-theme-packs.ts`, i18n `website.json` (`themes.manara`, `manara.*`) |
| B Backend        | `website.constants.ts`, `templates/manara.template.ts` + registry + spec, e2e cases, fixtures export                                                                                                                                                                                                                                                                                                                                                                                                                          |
| H Home           | `manara/sections/*` (all 13 home types) + `manara-sections.css` + tests                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| P Pages & chrome | `manara/chrome/*`, `manara/pages/*` (pageHeader/pageIntro, catalog, contact, courseDetails, notFound, comingSoon, authFrame, header, footer) + `manara-pages.css` + tests                                                                                                                                                                                                                                                                                                                                                     |
| A Assets         | Magnific generation, `public/theme-assets/manara/v1/`, manifest release, `released-versions.ts`, archive                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Q QA             | theme-baseline matrix (+ fixture server, Lighthouse), axe, SSR tests, pack-split guard, J43 real-stack journey, reduced motion in the browser, visual review EN/AR × 390/768/1024/1440                                                                                                                                                                                                                                                                                                                                        |

Rules: colours only via `--mn-*`/`--website-*`; logical CSS properties only; `Reveal` for entrances; `linkRenderer`
present = public runtime (hidden targets render nothing; empty optional data hides the section; samples never public).

## 5. Acceptance

- Every section type and page renders from real data; empty/optional data hides cleanly; no fabricated people or numbers.
- EN + AR at 390/768/1024/1440 with no sideways scroll; one `h1`; keyboard; reduced motion = final state; SSR/no-JS
  content visible, no hydration mismatch.
- Contrast ≥ 4.5:1 (≥ 3:1 large/UI) for every emitted pair on every baseline palette.
- Theme 1 and Atelier screenshots/axe/identity baselines unchanged.
- Unit, theme-baseline (screenshots, axe, palette injection, pack split), SSR tests, real-stack journey, Lighthouse.
- CI green in both repos; PRs reviewed; backend merged and deployed first; production smoke test incl. a CMS edit round
  trip and the Theme 1/2 health check.

## 6. Phases

1. Foundation (F) → 2. B, H, P, A in parallel → 3. integration + i18n → 4. QA, fixes, visual refinement →
2. PRs (backend first), merge, deploy, production verification → 6. Results recorded in §7.

## 7. Results

Recorded as delivered (6 Oct 2026). Items marked _pending_ are filled in by the
release report once the remaining gates run.

### 7.1 What shipped

- **Theme key** `manara`, selectable in the setup picker and the Theme tab;
  starter template v1 in the backend (`manara.template.ts`): Home = hero →
  statistics → courseCategories → featuredCourses → featureSplit → steps →
  features → testimonials → instructors → faq → cta; About, Courses, FAQs and
  Contact open with the banner block (`pageHeader`). No new CMS fields, no
  migration.
- **Pack** `manara.pack.ts`: all 13 Home renderers, `pageHeader`,
  `courseCatalog`, `contact`, Header/Footer/AuthFrame, PageIntro,
  CourseDetails, NotFound, ComingSoon. Lazy chunk 121.6 kB (Atelier 132.4 kB,
  Theme 1 155.5 kB); stylesheet 58.9 kB (Atelier 62.4 kB), loaded only when
  the theme is active (`theme-pack-split.spec.ts`, SSR pack isolation tests).
- **Brand mapping** `manara.brand-mapping.ts`: day/night/block/accent tokens
  re-solved per palette; 127 matrix tests over the §I.2 identity palettes.
- **Assets**: 14 photographs generated with Magnific (Nano Banana Pro, 4k),
  28 + 8 candidates reviewed at full frame and 100% (faces, hands, readable
  marks, logos, screens, frame edges); 14 approved, prepared as AVIF/WebP +
  LQIP under `public/theme-assets/manara/v1` (92 files, 1.9 MB) with full
  provenance (prompt = `buildThemeAssetPrompt`, seed, job, sha256). No image
  is shared with Theme 1 or Atelier (asserted). Masters kept in the session
  scratchpad; R2 archive upload _pending_ (`ATLAS_THEME_ARCHIVE_*` not present
  in this environment).

### 7.2 Verification

| Gate                                                                                                          | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript / ESLint / Prettier (frontend)                                                                     | clean                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Frontend unit tests                                                                                           | 3164 passed (incl. 240 Manara: brand mapping 127, sections 39, chrome 17, inner pages 32, course details 12, loader/registry/assets)                                                                                                                                                                                                                                                                                                                   |
| Backend lint / tsc / unit                                                                                     | clean; 460 passed (23 new Manara template tests)                                                                                                                                                                                                                                                                                                                                                                                                       |
| Backend e2e (website, provisioning)                                                                           | 56 passed, incl. Manara selection + provisioning                                                                                                                                                                                                                                                                                                                                                                                                       |
| SSR renderer tests (`test:ssr`)                                                                               | 84 passed — Manara pack isolation, stylesheet link, Alexandria preloads                                                                                                                                                                                                                                                                                                                                                                                |
| Theme 1 / Atelier / retired-theme visual + axe regression                                                     | 1303/1304; the one diff is a lazy-image capture race on an Atelier page (passes on re-run), no baseline changed                                                                                                                                                                                                                                                                                                                                        |
| Manara visual baseline (EN/AR × 1440/1024/390, new/rich/unpublished, 11 palettes)                             | _pending_                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Manara axe (0 violations)                                                                                     | 40 snapshots (EN/AR × 1440/1024/390, new/rich pages, Coming Soon), 0 violations after the §7.3 contrast fixes; `e2e/theme-baseline/__screenshots__/axe/themes/manara/**`                                                                                                                                                                                                                                                                               |
| Lighthouse (mobile, simulated throttling, median of 3, fixture server, same machine/run for all three themes) | Manara perf 64–67 · a11y 100 · best-practices 100 · SEO 100 · CLS 0–0.056 · TBT 286–410 ms; Atelier 63–67, Theme 1 65–71 on the same run. The score is bounded by the shared SPA boot (FCP ≈ 3.6 s on every theme; LCP element = the hero `h1`, hero image eager/high). Manara carries the smallest script (474 kB vs 477/490) and font (67 kB vs Atelier 118–186) payloads; the full report is `e2e/theme-baseline/baselines/lighthouse-manara.json`. |
| Real browser: reduced motion                                                                                  | no-preference → `mn-rise`/`mn-sweep` + scroll-driven header beam; reduce → none, reveals in final state, hero h1 never animates                                                                                                                                                                                                                                                                                                                        |
| Real browser: keyboard                                                                                        | skip link → nav → locale → sign in/up → CTAs with 3 px rings; full-screen menu opens on Enter, focus to Close, Esc returns focus; FAQ accordion toggles                                                                                                                                                                                                                                                                                                |
| Real browser: layout                                                                                          | no horizontal overflow at 390/768/1024/1440 EN+AR, one `h1` per page, no console errors                                                                                                                                                                                                                                                                                                                                                                |
| J35h real-stack provisioning journey                                                                          | passed with J35g (Postgres + Redis + API + Vite): Manara chosen by keyboard in the setup picker → academy provisioned → public site renders in Manara; J35g now expects all three selectable themes                                                                                                                                                                                                                                                    |

### 7.3 Fixed during browser QA

- Coming Soon: the beam overshot its block when nothing followed → `overflow: clip` on `.mn-block`.
- Course Details at exactly 1024: phone purchase bar and sticky panel both showed (utility class lost to the stylesheet's specificity) → explicit `≥1024` rule.
- **RTL never applied on the public runtime**: `dir` sits on the locale wrapper _above_ the theme scope, so `[data-theme-pack] [dir='rtl']` never matched; every RTL rule now also carries Atelier's `[dir='rtl'] [data-theme-pack='manara']` form (seams, beams, select chevrons, letter-spacing verified in Arabic).
- Banner block bottom padding tightened.
- axe colour-contrast (32 nodes on the first recording): the shared platform attribution kept its light-ground colours on the night footer (1.12:1 / 3.17:1) → footer text tones; translucent count pills on block/accent tiles (3.7:1) → solid inverted pills; the shared mobile bottom bar drew `brandText` on a 95%-opaque surface over the night footer (4.41:1) → `brandText` solved to 5:1.

### 7.4 Harness fixes found by CI and the re-runs

Theme 1 and Atelier rendering code is untouched; these change only how the
baseline harness measures.

- **Theme 1 identity audit (CI only, `home 390`)**: the audit repaints the
  brand slots on the theme scope with a sentinel and treats every colour
  that does not follow as "brand colour outside a slot". On CI's newer
  Chromium the footer contact icons never followed: they sit inside the
  closed `<details>` of the mobile footer column, whose content renders with
  `content-visibility: hidden`, and Chromium skips style recalc inside that
  subtree, so `getComputedStyle` kept reporting the pre-paint colour. Every
  disclosure is now opened before a capture.
- **Stale `ch` measure (local, ~1 in 6 full runs)**: with the diagnostics
  added to the failure message, the odd pass read `max-inline-size: 585px`
  for `.t1-lead` (65ch at the 0.5em placeholder Chromium uses while a font
  is loading) with every Rubik face reported `loaded`; the real value is
  742.9px. The layout settle now tracks x/width as well as y/height, counts
  a loading font face as unstable, and re-resolves every element's style
  once the fonts are in. 12 consecutive local runs of the audit passed.
  The same stale length can in principle reach a visitor on a cold cache;
  it is a Chromium invalidation quirk around `ch` inside `var()` and is
  noted as a follow-up for Theme 1, not changed here.
- **Manara screenshots**: a full-page capture paints the lazy photographs
  below the fold for the first time during the shot. Depending on timing the
  recorded state was the LQIP (the image decoded asynchronously after the
  frame was captured), the compositor's quick lower-quality scale, or the
  final image — 0.5–3% of pixels on the gallery, course-card and teaching
  photographs, invisible to the eye, different run to run. `settleImages`
  now switches every image to synchronous decoding, scrolls the page so the
  lazy images load in their final layout, waits for each rendered image to
  be complete and decoded, repeats until a pass finds nothing new, and fails
  on a broken image rather than recording it; the Manara baselines were
  re-recorded in that state (Theme 1/Atelier baselines untouched).
