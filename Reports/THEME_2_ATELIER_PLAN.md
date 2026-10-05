# Theme 2 — "Atelier": plan and contract

Status: implemented and verified (2026-10-04); see §8. Branch `claude/confident-bardeen-s216dw` in both repos.
Theme key: **`atelier`** (kebab-case slug, the convention `modern-education` set; not one of the retired keys
`premium-academy`, `corporate-learning`, `minimal-editorial`, `bold-creative`).

This document is the contract between the workstreams. Facts below were read from the code, not from older plans.

## 1. What exists (verified)

- **Theme = key + token definition + ThemePack.** `src/types/website-theme.types.ts` (`SELECTABLE_WEBSITE_THEME_KEYS`),
  `src/features/website/themes/*.theme.ts` (tokens + `nameKey`/`descriptionKey`), `theme-packs/theme-pack.registry.ts`
  (`Record<WebsiteThemeKey, ThemePack>`). A pack supplies `renderers` (per section type, falling back to
  `BASE_RENDERERS`), `chrome {Header, Footer, AuthFrame}`, `pages {PageIntro, CourseDetails, NotFound, ComingSoon}` and
  `mapBrandPalette` (palette → CSS variables). Theme 1 (`modern-education/`) overrides all 16 section types.
- **Section data is shared by every theme.** 16 section types; one config schema per type (frontend zod +
  backend zod, kept identical by `__parity__/section-contracts-theme1.cases.json`). The backend strips unknown config
  fields (no `.strict()`), so **Theme 2 renders the existing contracts and adds no config fields**. The builder's section
  list, settings forms and previews are theme-agnostic and use the real `WebsiteRenderer` — Theme 2 inherits them.
- **Brand engine** (`brand-engine/`) derives 19 contrast-checked roles from seeds; each theme maps roles to its own
  CSS variables. Theme 2 adds a mapping, not a second engine.
- **Backend** stores only `website_configurations.theme_key` (TEXT, no CHECK). Allowed keys = `SELECTABLE_WEBSITE_THEME_KEYS`
  (`src/website/constants/website.constants.ts`) via `@IsIn` on the configuration and provisioning DTOs. Provisioning's
  theme step calls `getWebsiteTemplate(themeKey)` → a starter template per theme is mandatory. No migration needed.
- **Routes**: data-driven core pages (home, about, courses, faqs, contact, `courses/:id`), auth pages, `my/*` learner
  portal (shared components, themed through the palette bridge), 404, Coming Soon. **There is no instructor API or
  instructor profile route** in Atlas today; instructors are derived from public course data. Theme 2 does not invent
  one (no fabricated data); the instructors section renders the same derived data.
- **Motion today**: CSS + one `IntersectionObserver` reveal (`primitives/Reveal`). `framer-motion` is not on the public
  website bundle. **Fonts** are self-hosted (`src/styles/fonts.css`).
- **Assets**: `theme-asset:<theme>/<key>` references, manifest + `ThemeImage`, derivatives in `public/theme-assets/<theme>/v1/`
  produced by `tools/theme-assets/prepare.mjs` (AVIF/WebP + LQIP). Released folders are immutable.

## 2. Creative direction

**Atelier — the Academy as a studio publication.** Where Theme 1 is friendly product marketing (split hero, rounded
elevated cards, blobs), Atelier is art-directed editorial: an oversized serif display face, a warm paper canvas, hairline
rules, a strict asymmetric grid with a margin column, numbered chapters, and arched "studio window" image masks.
Audience: creator-led academies, design/craft/language/professional schools that sell expertise and want to look like a
premium publication rather than a template.

- **Typography**: display *Atelier Display* = Fraunces (variable, opsz/wght, Latin) + Markazi Text (variable, Arabic) under
  one family split by `unicode-range`; body stays Rubik (already self-hosted). Small-caps tracked labels for chapter
  marks and metadata. Numerals as typographic objects (01, 02 / ٠١, ٠٢).
- **Colour behaviour**: canvas is "paper" — the palette's neutral roles, warmed and capped at a low chroma; text is ink.
  The brand appears only in defined slots: the thread, chapter numerals, links, focus, CTA fill, one accent rule. Two
  environments: **paper** chapters and **ink** chapters (near-black tinted with the brand hue) — the homepage moves
  between them. Every text/fill pair comes from the engine's contrast matrix or is checked in the mapping.
- **Signature: the thread.** A single brand-coloured line runs down the margin column from the hero to the final CTA,
  drawn as the reader scrolls (CSS scroll-driven animation), passing through each chapter's mark — the learning path
  made visible. It is purely decorative (`aria-hidden`), and fully drawn under reduced motion / no support.
- **Interaction language**: underline-draw links, arrow nudges, image "unveil" (clip-path opening from the arch),
  hairline accordions, index rows that reveal a course image on hover (desktop only).

## 3. Homepage narrative (template order)

hero → **Chapter I** about/philosophy (featureSplit) → **II** what you'll learn (features) → **III** course categories
→ **IV** featured courses (index) → **V** method (steps) → instructors → statistics (ink) → testimonials (ink) →
FAQ → closing CTA (ink, the thread ends). Optional/empty data hides a chapter cleanly (the same public rules Theme 1
uses: < 2 stats, no instructors, < 2 categories, no testimonials → not drawn).

## 4. Motion engineering

- **No new runtime dependency.** Entrances: the existing `Reveal`/`useReveal` (one IO each, once). Scroll-linked effects
  (thread draw, hero image settle, ink-chapter unveil, slow parallax) are **CSS `animation-timeline: view()`/`scroll()`**
  inside `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`. No scroll
  listeners, no pinning, no scroll hijacking. Unsupported browsers and SSR/no-JS get the final, readable state.
- Only `transform`, `opacity`, `clip-path`, `stroke-dashoffset` animate. Phones (< 768px) drop parallax.

## 5. Workstreams and file ownership

| WS | Owner | Files | Depends on |
|----|-------|-------|------------|
| F  Foundation | lead | `src/types/website-theme.types.ts`, `themes/atelier.theme.ts` + registry, `theme-packs/theme-pack.registry.ts`, `atelier/atelier.pack.ts`, `atelier/atelier.brand-mapping.ts`(+test), `atelier/atelier.css` (tokens, fonts, thread), `atelier/atelier-parts.tsx`, fonts | — |
| B  Backend | agent | `atlas-backend`: constants, `templates/atelier.template.ts`, registry, specs, e2e cases, fixtures export | F (asset keys, section order below) |
| H  Home sections | agent | `atelier/sections/*` (hero, about, featureSplit, features, steps, categories, featuredCourses, instructors, statistics, testimonials, faq, cta, gallery) + `atelier/atelier-sections.css` + tests | F |
| P  Pages & chrome | agent | `atelier/chrome/*`, `atelier/pages/*` (pageHeader, pageIntro, catalog, contact, courseDetails, notFound, comingSoon, authFrame, header, footer) + `atelier/atelier-pages.css` + tests | F |
| O  Onboarding & builder | agent | `AcademySetupForm` live theme previews, theme tab, journeys | F |
| A  Assets | lead | Magnific generation, `public/theme-assets/atelier/v1/`, `theme-assets/manifests/atelier.manifest.ts` | F |
| Q  QA | agent + lead | theme-baseline matrix, axe, Lighthouse, SSR tests, real-stack journey | all |

Translations: each agent writes its keys to `atelier/i18n/<ws>.{en,ar}.json`; the lead merges them into
`website.json` under `atelier.*` (one owner of the shared files).

**Asset keys** (`theme-asset:atelier/<key>`): `home-hero` (4:5, arch), `home-philosophy` (4:5), `home-method` (3:2),
`home-cta` (16:9), `courses-launching` (3:2), `about-header` (21:9), `about-story` (4:5), `gallery-1…5` (mixed),
`auth-side` (4:5), `course-fallback` (3:2).

## 5a. Composition brief (every Atelier section differs structurally from its Theme 1 equivalent)

Shared rules: compose `atelier-parts.tsx` (`AtelierChapter`, `AtelierChapterMark`, `AtelierSectionHeader`,
`AtelierHeading`, `AtelierMedia`, `AtelierAction`, `AtelierMonogram`); colours only via `--atelier-*`/`--website-*`;
logical CSS properties only; `Reveal` for entrances (stagger ≤ 400 ms per group); one `<h1>` per page (the opening
`hero`/`pageHeader` asks `usePageOpeningHeading()`); same public-runtime rules as Theme 1 (`linkRenderer` present =
public; hidden targets render nothing; empty optional data hides the section; sample testimonials never public).

| Type | Atelier composition |
|------|---------------------|
| hero | Type-led spread: academy eyebrow + oversized display headline spanning 8 cols with the highlight in brand italic; subtitle/description in a narrow end column; actions as a primary button + ghost; tall **arch** image on the end side (`settle`); `highlights` as a numbered hairline list under the headline; `showSearch` as an underlined search field. The thread starts under the actions (`thread="start"`). Never a split card like T1. |
| featureSplit | "Folio" spread: chapter mark; large image (`drift` on desktop) bleeding to the start edge with a caption line; text column with title and items as **numbered paragraphs** (01, 02…) separated by hairlines. `imagePosition` honoured logically. |
| about | Editorial lede: drop-cap first paragraph in the display face, pull-quote width, optional image as a small arch plate. |
| features | An **index**, not cards: each item one row — big numeral, title (display), description; `layout: strip` → two-column hairline grid. Icons rendered small and quiet or omitted. |
| steps | "Syllabus": a horizontal track on desktop where the thread turns sideways through each step's knot; vertical on phones. Step number as Roman-free numerals, title, description. |
| courseCategories | Typographic list: category names set huge (display) as links with course counts in small caps; hover underline; wraps naturally (no cards). |
| featuredCourses | "Contents page": an index of rows (index no., title, level/duration meta, price, arrow); on desktop the hovered row reveals its image in a fixed frame (decorative, `aria-hidden`); `layout: carousel` → horizontally scrollable editorial plates with scroll-snap (native, keyboard reachable). Uses the same data hooks and price formatter as T1. |
| instructors | A "masthead": names in the display face in a flowing list with roles/courses in small caps; monogram plates (no fabricated photos); derived from public courses like T1. |
| statistics | **Ink** chapter (`unveil`): giant light numerals with labels, separated by vertical hairlines; real `metric` values only; < 2 values → not drawn. |
| testimonials | **Ink** chapter: one large pull quote at a time in the display face, attribution in small caps, prev/next buttons + count ("02 / 05"); no autoplay; library entries; samples never public. |
| faq | Two columns: sticky title/description on the start side (desktop), hairline accordion (native `<details>`/button with aria-expanded) on the end side; numbered questions. |
| cta | Closing **ink** chapter: the thread ends in a filled knot (`thread="end"`); a huge display line, description, actions as ink buttons. |
| gallery | Contact sheet: asymmetric grid of mixed ratios with numbered captions; no lightbox requirement. |
| pageHeader | Inner-page masthead: breadcrumb-like small-caps trail, display title, lead; `search` field when configured; hairline under; optional arch image on the end side. |
| courseCatalog | Editorial catalogue: filters as a quiet small-caps bar (search, category, level, price, sort) above an index of course rows / plates; pagination as numbered links; empty and error states set in type. Uses `useCourseCatalog`. |
| contact | Letter layout: address/channels as a colophon column; the form as underlined fields with labels above; uses the existing contact submission + honeypot like T1. |

Chrome: header — academy wordmark/logo at start, small-caps nav, a single CTA; transparent over paper, hairline on
scroll (CSS only where possible); mobile: full-screen overlay menu with display-size links (Radix Dialog/Sheet for focus
management). Footer — a "colophon": academy name set very large in the display face, columns of links, contact,
platform attribution. Auth frame — paper form column + arch image (`auth-side`). Pages — Course Details as an
editorial product spread (title spread, sticky purchase "ticket" aside, curriculum as a table of contents, reviews,
related courses) built on `useCourseDetails`; 404 and Coming Soon as typographic posters.

## 6. Acceptance (per WS)

- Renders every section type and page from real data; empty/optional data hides cleanly; no fabricated numbers/people.
- EN + AR (RTL) at 390 / 768 / 1024 / 1440 / 1920 with no sideways scroll; one `<h1>` per page; skip link; keyboard.
- Reduced motion: no motion, final state. No-JS/SSR: content visible.
- Contrast: every emitted text/fill pair ≥ 4.5:1 (≥ 3:1 large/UI) for every theme-baseline palette.
- Theme 1 screenshots/axe/identity baselines unchanged.
- Unit tests (mapping, parts, sections, pages), theme-baseline (screenshots, axe, palette injection), SSR tests,
  real-stack journey (provision with Atelier → public site → builder edit → publish → switch themes).
- Lighthouse on a production build: LCP ≤ 2.5 s, CLS ≤ 0.1, TBT reported (INP proxy); results in §8.

## 7. Phases

1. Foundation (F) → 2. parallel B, H, P, O, A → 3. integration + i18n merge → 4. QA, fixes, visual refinement →
5. PRs (backend first), merge, deploy, production verification.

## 8. Results (4 Oct 2026)

**Delivered.** `atelier` is a selectable theme in both repos (no migration; index 0 stays the default) with a bilingual
starter template. The pack draws all 16 section types, its own header/footer/auth frame, page intro, Course Details,
404 and Coming Soon; the brand mapping re-solves every text/fill pair on its paper and ink grounds (99 matrix tests).
Onboarding shows live previews of both themes (real renderer); the builder's theme tab previews and switches them.
14 Magnific photographs (`atelier/v1`) plus a higher-resolution hero release (`atelier/v2`, up to 3200w from the 3712px
master — no upscaling).

**Cinematic scroll (added on request).** Four CSS scroll-driven scenes (view timelines + sticky pinning, no scroll
listeners, no dependency): Opening (the arch becomes a full-window photograph, Chapter I slides over it), Method (the
steps advance sideways through the thread; the optional steps plate uncovers step by step), Into the ink (ink rises
through an arched window, real figures rise in turn), Closing (the plate pulls back, the thread ends). Gated by
scroll-timeline support (Chrome/Edge 115+, Safari 26+; Firefox static), no reduced motion, em-based viewport gates,
public runtime only. Three safety layers keep CMS content from breaking a scene: a pure SSR-safe content budget, the
em gates, and a ResizeObserver fit check — anything over budget renders the static layout, never clipped.

**Content limits.** Layout-critical section copy is capped on the shared section contract (all themes; table in
`Reports/ARCHITECTURE.md` → "Content limits"), enforced by the builder (live counters, field-level errors, a page notice
for content saved before the limits) and by the backend on every page write (path-level violations). Existing content is
never truncated; reads, reorder and publish keep working. `steps` gained an optional `image`/`imageAlt` (offered for
Atelier only).

**Quality.** Theme-baseline: Theme 1 and Themes 2–5 pixel-identical; 123 Atelier screenshots (EN/AR, 1440/1024/390,
11 brand palettes) recorded under real reduced motion; axe 0 violations on all 40 Atelier cases. The harness's reduced
motion now really reaches the browser (`harness.spec.ts`); legacy cases keep the condition they were recorded under —
under real reduced motion 80 Theme 1 Home/About screenshots differ only by below-the-fold reveals now drawn (same
layout and height, axe unchanged), reported rather than re-recorded. Cinematic and content-limit browser specs cover
motion/reduced/unsupported, 390, AR, reverse scroll, boundaries, focus.

**Performance** (Lighthouse 13.5, mobile simulated throttling, median of 3, same machine): Theme 1 Home on `main`
LCP 4.47 s / perf 75 → on this branch 4.69 s / 73; Atelier Home LCP 4.89 s / perf 66–70, CLS ≤ 0.010 (catalogue 0.080).
Desktop unthrottled LCP 0.44–0.49 s. The plan's 2.5 s LCP target is not met under simulated mobile throttling by any
theme (Theme 1 was already 4.4 s); every public site now carries Atelier's code (+29 KB JS, +9 KB CSS transferred)
because the pack registry is static — follow-up: lazy-load packs per theme (SSR preloads the active pack before render).


### 8.1 Follow-up (5 Oct 2026)

- **Photographs follow the theme.** A site generated on Modern Education and switched to Atelier kept Modern
  Education's starter photographs (section content stores `theme-asset:modern-education/…`, and content survives a
  theme switch). The renderer now draws another theme's starter photograph as the active theme's photograph for the
  same slot (`theme-assets/adopt-theme-assets.ts`; `home-benefit` ↔ `home-philosophy`, every other slot shares its
  key). Render-time only: stored content is unchanged, owner uploads are never touched.
- **Atelier v3 photographs.** All fourteen replaced with new learning photographs generated with Magnific (reading
  rooms, books, study desks, online study; no identifiable faces, no logos, no readable text). None is shared with
  Modern Education (a test compares master hashes). Keys and slots unchanged; v1/v2 stay served.
- **Theme cards.** The Theme tab shows each theme's feature image (`theme-card`, `atelier/v3`,
  `modern-education/v2`); a theme without one (retired) keeps the live miniature.
- **Colophon.** The footer's academy name is capped at ~4.5rem (smaller still past 24 characters).
- **Each site loads only its theme.** Theme packs are their own chunks with their own stylesheets, loaded before
  render (SSR) or hydration; theme stylesheets are linked in front of the entry stylesheet so Tailwind utilities keep
  winning ties. Each theme's image manifest ships with its pack. Theme 1 Home: JS −12.0 KB, CSS −9.2 KB (gzip) vs
  `main`; Atelier Home: JS −24.2 KB, CSS −2.0 KB; plus ~10 KB for the other theme's manifest no longer shipped. A
  build guard fails if a Theme 1 page's code carries Atelier (and vice versa). The Atelier display-font preload was
  measured slower (LCP more variable) and ships off (`preloadThemeFonts`).
- **Atelier inner pages' lead image** (About plate, Course Details plate) loads eagerly at high priority: mobile LCP
  ~5.3 s → ~2.6–3.0 s on those pages.
