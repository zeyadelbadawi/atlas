# Theme 4 — "Riwaq": plan and contract

Status: proposal written 7 Oct 2026, before implementation. Branch `claude/confident-bardeen-s216dw` in both repos.
Theme key: **`riwaq`** (kebab-case slug like `modern-education`, `atelier`, `manara`).

Facts in §1 were read from the code and the earlier plans (`THEME_1_ACADEMY_WEBSITE_PLAN.md`,
`THEME_2_ATELIER_PLAN.md`, `THEME_3_MANARA_PLAN.md`, `THEMES_2_5_RETIREMENT.md`). The integration checklist is
Manara's §1 list, unchanged: every shared module that enumerates themes gets a `riwaq` entry.

## 1. The three shipped themes, as products

| | Theme 1 (`modern-education`) | Theme 2 Atelier | Theme 3 Manara |
|---|---|---|---|
| Audience | the general modern school, adult learners | creator-led expertise schools | teacher-led exam prep, students on phones |
| Thesis | friendly product brochure | the Academy as a studio publication | the teacher on stage, the student on the phone |
| Ground | white | warm paper + ink chapters | night stage + day ground |
| Brand role | **signal** (CTAs, chips) | **slots** (thread, numerals, links) | **surface** (dyed blocks) |
| Type | Readex Pro / Rubik, bold | Fraunces + Markazi serif display, small caps | Alexandria black, giant numerals |
| Shape | 20 px radius, elevated cards, blobs | hairlines, arches, margin column | 0–8 px, 12° slanted seams, poster cards |
| Motion | one IO reveal | scroll-drawn thread, pinned scenes | hero beam sweep, header beam fill |
| Photography | adult professionals | warm window light, books, wood | after-hours desk lamp, deep blue shadow |
| Strengths | clear, safe, fast | the most distinctive, crafted | energetic, Arabic-first, proof-first order |
| Limits | generic, reveals leave blank bands in captures, centred hero | quiet; long; serif reads less "professional" in MENA corporate contexts | loud; wrong register for adult professional training |

**Occupied territory:** centred brochure; literary editorial (serif, chapters, threads, arches, warm paper);
loud poster stage (night, dyed blocks, slanted seams, beams, giant numerals). **Overused patterns:** numbered
chapters/steps as the main rhythm, line-draw motifs (thread, beam), card grids for courses (T1, T3), carousels for
testimonials (all three). **Image styles taken:** warm window light and books (T2), night lamp light (T3).

**Not served by any theme:** the **professional institute** — training centres, career and certification
academies, language institutes for work, continuing education, corporate academies. The Vision's third persona (the
training-centre owner), and the largest paying segment in the market Atlas serves: adults spending their own or
their employer's money on a credential, comparing programmes on **outcomes, syllabus, duration, level, price and
whether there is a certificate**. Atlas already holds every one of those facts per course (`outcomes`,
`requirements`, curriculum sections/lessons/quizzes/assignments, duration, level, language, instructors, reviews,
price, and `certificatesEnabled`). No theme turns them into a decision tool.

## 2. Concept

1. **Name**: **Riwaq** (رواق) — the arcade/colonnade; at al-Azhar the *riwaqs* were the halls where teaching
   circles met and students lived. The name, the grid, the photography and the motion all come from it.
2. **Target**: professional and career academies, training centres and institutes; visitors are adults deciding
   on a programme, often on a phone at work, sometimes comparing on a desktop.
3. **Design thesis**: *an institution's clarity — measured, open, specified.* Every programme reads like a well-made
   prospectus: what you will be able to do, how it is taught, how long, at what level, by whom, at what price,
   with what certificate — before anyone asks.
4. **Visual metaphor — the colonnade**: a visible column grid (thin vertical rules at column lines) runs behind the
   page like the pillars of an arcade; content stands between them; photographs are windows between pillars
   (rectangular, square-cornered, never arched or slanted); light falls across in long parallel bands.
5. **Brand role — ink**: the Academy's primary becomes the *ink* the institution is printed in: display headings,
   key figures and the brand-tinted photography (every photograph is shown as a monochrome in the brand's hue,
   developing to full colour on hover/focus on pointer devices). The accent is a single *marker* (the one
   emphasised phrase, active states, a figure). One deep-ink ground (primary darkened, chroma kept) carries the
   evidence band, the closing invitation and the footer. Body text stays neutral ink.
6. **Vs T1/T2/T3**: no centred hero, no rounded cards, no serif, no chapters, no slanted seams, no beams, no
   arches, no night stage, no warm paper. New: the colonnade grid, square-cornered datasheet cells, spec tables,
   a functional master–detail programme explorer, a syllabus spotlight with live curriculum, an academy crest,
   brand-tinted photography, a bottom-sheet menu on phones, a light-weight display face.

## 3. Design system

- **Typography**: **IBM Plex Sans** (variable Latin, 100–700, ~46 KB `latin` subset) + **IBM Plex Sans Arabic**
  (its designed companion; ONE static 400 file, ~43 KB `arabic` subset, declared for weights 100–900 with
  `font-synthesis: none`, so Arabic reads at regular everywhere — display, titles and labels — and never
  hairline or faux-bold), one family `Riwaq Sans` split by `unicode-range`. Shipping 600 too was measured and
  dropped: +46 KB on every Arabic page for a weight the Arabic hierarchy does not need (it is carried by size). All OFL,
  self-hosted from `@fontsource`, unmodified. A metric-matched fallback face (`size-adjust`/ascent overrides on
  local Arial) prevents layout shift on swap. Hierarchy by size and weight: display 300 (Latin) / 400 (Arabic)
  at clamp 40→88 px, tracking −0.025em Latin only; section titles 400 at 30→52; body 400 17/16 px, line-height
  1.6 (Arabic 1.75); labels 500, 13 px, +0.04em, tabular figures; figures in the ledger 300 at 56→112.
  No uppercase in Arabic; Latin labels in sentence case. Measure ≤ 62ch.
- **Colour** (`riwaq.brand-mapping.ts`, every pair re-solved as painted and proven over the 11 identity palettes):
  `porcelain` (L 0.985, C ≤ 0.004, cool), `stone` (L 0.955), `ink` (neutral text, ≥ 12:1), `brandInk` (primary
  moved to ≥ 7:1 on porcelain — headings, figures, links), `deep` (primary at L ≈ 0.27, chroma ≤ 0.12 —
  the deep-ink ground) with `deepText`/`deepMuted`, `marker` (accent solved ≥ 3:1 as a graphic on porcelain and
  deep; `markerText` for its label), `tint` (the photograph tint: brand hue, chroma ≤ 0.09), `rule` (column and
  cell lines, decorative) and `ruleStrong` (≥ 3:1, a control's edge), focus rings per ground. Defaults when an
  Academy has no colours: a deep teal-blue, a slate and a saffron.
- **Layout**: a 12-column grid (desktop ≥ 1024: 12; tablet: 8; phone: 4 with 16 px gutters) whose column lines are
  drawn as the colonnade; sections compose asymmetrically on it (start rail of 3 columns for the section label
  and its spec facts, content on 4–12; or full-width ledgers). Cells are square-cornered with 1 px rules and a
  registration tick at one corner. Spacing 8-pt scale, section rhythm clamp 72→144 px.
- **Iconography**: the existing lucide set, 1.5 px stroke, used sparingly in outcome and feature cells.

## 4. Section architecture (Home, template v1 order)

The narrative mirrors how a professional decides: *promise → outcomes → choose → inspect → how it works →
experience → who teaches → evidence → questions → commit.*

1. `hero` — **Portico**: label line (academy · eyebrow), display headline (the `highlight` underlined by the
   marker), subtitle, two actions, `highlights` as a **spec row** of bordered cells, optional search; the
   colonnade photograph between two column lines with the academy **crest** (name on a circular path + initials)
   overlapping its corner. Phones: headline → actions → spec row → photograph as a 5:4 window.
2. `features` — **Outcomes**: "What you will be able to do": a ledger of capability cells (icon, title, line).
3. `courseCategories` — **Departments** (≥ 2): an index of departments with counts, set in the display face.
4. `featuredCourses` — **Programmes**: a **master–detail explorer**: the list of programmes (tabs, roving
   focus) beside a spec sheet of the selected one (image, level, duration, lessons, assessments, certificate,
   language, price, instructor, link). Phones: each row expands in place (disclosure). Empty: a designed
   "programmes open soon" plate with `courses-launching`.
5. `courseSpotlight` (**new shared type**, §6) — **Programme in focus**: one real course's outcomes and its
   syllabus (sections and lesson counts from the public curriculum), facts and the enrolment action.
6. `steps` — **Course of study**: a horizontal timeline whose rail fills as it scrolls into view (CSS view
   timeline); optional plate (`home-method`). Vertical on phones.
7. `featureSplit` — **The learning experience**: photograph window + numbered points (platform-true copy).
8. `instructors` — **Faculty**: a directory of name plates (monogram, courses count); derived data only.
9. `statistics` — **Facts & figures** (deep ground, ≥ 2 live metrics): a ledger of light figures that count up
   once on entry.
10. `testimonials` — **Graduates** (deep ground, joined to the figures): one statement at a time beside its
    attribution stub; prev/next + "02 / 05"; no autoplay; samples never public.
11. `faq` — **Admissions**: two columns, the question index with a disclosure per row.
12. `cta` — **Enrol** (deep ground): the crest large, its name ring turning with scroll (user-driven, not
    autoplay), a display line, two actions.

A new Academy (no live data, sample testimonials only) reads hero → outcomes → programmes plate → course of study
→ experience → admissions → enrol: complete, with no fabricated person, number or claim.

**Inner pages**: `pageHeader` = **Plate** (label, display title, lead, optional search, optional photograph window).
About: plate + featureSplit story + features (values) + statistics + instructors + gallery (**colonnade gallery**:
photographs in column bays of varied heights) + cta. Courses: plate with search + `courseCatalog` (**faceted
layout**: a sticky start-column filter panel on desktop, a bottom-sheet "Filters" on phones; results as programme
sheets; numbered pagination). FAQs: plate + faq + cta. Contact: plate + contact (channels datasheet + form) + faq.
**Course Details — the dossier**: title block, facts table, an *on this page* index that tracks the reading
position (IntersectionObserver), sections Overview · Outcomes · Syllabus · Requirements · Faculty · Reviews,
sticky enrolment card (desktop) / sticky bottom bar (phones), related programmes. Auth frame: photograph window +
crest beside the form. 404 / Coming Soon: crest, ledger numerals, links. Header: masthead (academy name +
navigation + actions) that tightens on scroll (CSS scroll-driven, `@supports`), phones: **bottom sheet** menu
(Radix Dialog, focus-managed). Footer: deep ground, crest, academy name, link columns, contact, attribution.

## 5. Motion language — "light through the colonnade"

No new dependency; no scroll listeners; only `transform`, `opacity` (and one-time `stroke-dashoffset` on the crest).

- **Colonnade rise** (load, once): the column rules scale in from the baseline, staggered 40 ms, 700 ms.
- **Shutter** (first view of a photograph window): a porcelain shutter translates away from the start side
  (transform only, 650 ms); the headline never animates (LCP).
- **Develop** (hover/focus, fine pointers): the brand tint fades from the photograph, revealing colour (opacity,
  300 ms); image scale 1.03.
- **Entrances**: the shared `Reveal` (one IO each, once), rise 12 px + fade, stagger ≤ 360 ms per group.
- **Explorer**: the spec sheet cross-fades and settles 8 px on selection (180 ms).
- **Count-up**: figures count once on entry (rAF, ≤ 1.1 s, tabular figures, fixed width, final value in the DOM
  for SSR/screen readers).
- **Scroll-linked (CSS `view()`/`scroll()`, inside `@supports` and `prefers-reduced-motion: no-preference`)**: the
  study timeline's rail fills; the crest's name ring turns with the reader's scroll; the masthead tightens.
- **Reduced motion**: everything at its final state (rules drawn, shutters open, figures final, rail full, ring
  still); spacing identical; verified in a real browser.

## 6. CMS and shared-contract changes

- **New section type `courseSpotlight`** (both repos, parity-tested): `eyebrow?`, `title?`, `description?`,
  `courseId?` (absent → the newest published course), `showOutcomes` (bool), `showSyllabus` (bool),
  `maxModules` (1–12), `cta?`. Renders only real course data (`usePublicCourse` + `usePublicCourseCurriculum`);
  hidden publicly when the course is missing/unpublished. A **base renderer** draws it for every theme (no existing
  template contains it, so Themes 1–3 are unchanged); the builder offers it everywhere with a single-course picker.
- **Public course payload** gains `certificatesEnabled` (boolean, additive) so a certificate is claimed only where
  the course really issues one.
- No other new fields; every copy, image, alt, CTA, visibility and order is CMS data; template v1 interpolates only
  `{{academyName}}` and asserts nothing an Academy may not offer.

## 7. Images (Magnific only, new, none shared with T1–T3; a test compares master hashes)

**Art direction — "daylight architecture"**: editorial architecture and documentary photography of learning
places in crisp, cool morning daylight: colonnades, arcades, study halls, stairs, seminar rooms, long parallel
shadows; materials of professional study (notebooks, pens, rulers, books) on pale stone. Palette bone white, pale
grey, soft stone, very low saturation (so the brand tint reads); people only small, from behind or as hands; no
faces, no text, no screens, no logos. Keys (same slots as other themes where they exist, so photographs follow a
theme switch): `home-hero` 4:5 (priority), `home-benefit` 4:5, `home-method` 3:2, `home-cta` 16:9,
`courses-launching` 3:2, `about-header` 21:9, `about-story` 4:5, `gallery-1…5`, `auth-side` 4:5,
`course-fallback` 3:2, `theme-card` 16:9, `courses-header` 21:9, `faqs-header` 21:9, `contact-header` 21:9,
`coming-soon` 16:9, `not-found` 3:2 — 20 keys (the gallery is five frames; `home-philosophy` is not a Riwaq
slot and adopts `home-benefit` on a theme switch). Exploration on Nano Banana 2 (1k), finals on Nano Banana Pro (4k),
several candidates per key, full-frame + 100 % review, `prepare.mjs` → `riwaq/v1` (AVIF + WebP + LQIP, byte
budgets), provenance in the manifest, masters archived to the private bucket and verified.

## 8. Performance budgets (enforced by tests)

| Item | Budget | Reference (Manara / Atelier / T1) |
|---|---|---|
| Theme pack chunk (raw) | ≤ 115 kB | 121.6 / 132.4 / 155.5 kB |
| Theme stylesheet (raw) | ≤ 56 kB | 58.9 / 62.4 kB |
| Fonts on an EN page | ≤ 50 kB | ~65 kB / 118–186 kB |
| Fonts on an AR page | ≤ 100 kB | 63–128 kB / — |
| Hero image at 390 (eager) | ≤ 45 kB AVIF | — |
| Hero image at 1440 (eager) | ≤ 110 kB AVIF | — |
| Images before first scroll (390) | ≤ 90 kB | — |
| CLS | ≤ 0.02 | 0–0.056 |
| Runtime JS animation | count-up only (rAF ≤ 1.1 s); everything else CSS | — |

## 9. Accessibility, RTL, responsive

WCAG 2.2 AA: one `h1` (`usePageOpeningHeading`), landmarks, skip link, 44 px targets, 3 px focus ring solved per
ground, the programme explorer as disclosures (`button[aria-expanded]` + `aria-controls`; side by side from 1024
the open programme's panel spans the list, one always open), FAQ as disclosures, carousel with labelled
buttons and a text counter, bottom sheet focus-managed, decorations `aria-hidden`, count-up figures read once
(final value in an `sr-only` sibling), axe 0 violations on every case, real keyboard pass. RTL designed, not
mirrored: the crest's text path is set in Arabic from its own start point; directional icons flip; the timeline
fills from the reading start; the hero photograph moves to the reading end; Arabic display uses weight 400 and
1.25 line-height. Responsive at 390/430/768/1024/1280/1440/1920: the colonnade has 4/8/12 columns; nothing
scrolls sideways.

## 10. Workstreams

F Foundation (key, definition, pack, mapping + matrix test, fonts, CSS tokens, parts, loaders/stylesheets/vite/
manifest/adoption entries) → B Backend (key, `courseSpotlight` schema + parity, `certificatesEnabled`, template,
specs, e2e, fixtures) → H Home → P Pages & chrome → A Assets → Q QA (unit, SSR, theme-baseline screenshots/axe/
palette/pack split/budgets, Lighthouse, real-stack journey, browser QA EN/AR × 390/768/1024/1440, T1–T3 identity).

## 11. Results (7 Oct 2026, measured on the fixture build, Chromium 141, Lighthouse 13 mobile)

**Payload** (raw bytes as built; the budget test in `server/ssr/ssr.test.mjs` enforces these):

| | Riwaq | Manara | Atelier | Theme 1 |
|---|---|---|---|---|
| Theme pack chunk | 113.6 kB | 121.8 kB | 132.6 kB | 155.2 kB |
| Theme stylesheet | 47.2 kB | 59.1 kB | 62.4 kB | — |
| Fonts, EN Home (transfer) | 45 kB | 65 kB | 115–182 kB | 67 kB |
| Total transfer, Home (new) | 592 kB | 625 kB | 681 kB | 602 kB |

**Lighthouse mobile, first visit (median of 5)**: CLS 0–0.014 (Atelier up to 0.08, Manara up to 0.145); TBT
81–169 ms (others 90–182 ms); accessibility 100 on every case. LCP: Home rich 4.86 s (best of the four);
Home new 5.40 s, Courses 5.41 s, Course Details 5.72 s (others 4.78–5.68 s). The first-visit gap is not
bytes: Riwaq's lead photograph (above the fold on phones) is larger than the shared cookie-banner text, so
its LCP is the theme's own content, while on the other themes' inner pages the LCP element is the banner
paragraph the app shell paints before any theme loads. A static `<link rel="preload">` of the photograph in
the HTML did not move LCP (the image is ready before the page renders), confirming the render, not the
download, is the bound.

**Lighthouse mobile, consent given (the theme's own content is the LCP on every theme; median of 3)**:

| LCP | Riwaq | Theme 1 | Atelier | Manara |
|---|---|---|---|---|
| Home (new) | **5.35 s** | 5.44 s | 5.51 s | 5.49 s |
| Courses | 5.34 s | **4.54 s** | 5.04 s | 5.32 s |
| Course Details | 5.49 s | **4.93 s** | 5.43 s | 5.59 s |

Riwaq leads on Home and is level with Themes 2–3 on inner pages; Theme 1 is faster on inner pages. Fixed
on the way: Riwaq's card titles, FAQ questions and syllabus labels inherited the app's heading face (an extra
font download and the wrong face) and the skip link downloaded the app's body face — both now in Riwaq Sans.

**Accessibility / layout / motion** (`riwaq.spec.ts`, in CI): axe 0 violations on every Riwaq page, EN and
AR, at 1440 and 390, new / rich / unpublished; no horizontal overflow at 390/430/768/1024/1280/1440/1920;
keyboard: explorer, bottom-sheet menu (focus trapped, returned), catalogue filter sheet, FAQ; reduced motion
draws everything in its final state, and with motion the figures end on their real values.

**Visual baselines**: 153 Riwaq screenshots (EN/AR × 390/768/1024/1440 × new/rich/inner/unpublished + 11
palettes). **Themes 1–3**: the full screenshot + axe suite (1,196 cases) passed against the approved
baselines with no update — pixel-identical.

**Unit / SSR**: vitest 3,364 tests pass; SSR 97 tests pass (Riwaq isolation both ways, font preloads,
budget). Pack split: Riwaq never downloads another theme's code or stylesheet, and no other theme downloads
Riwaq's.
