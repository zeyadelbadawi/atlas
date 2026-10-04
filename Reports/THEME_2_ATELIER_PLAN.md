# Theme 2 — "Atelier": plan and contract

Status: implementation in progress (started 2026-10-04). Branch `claude/confident-bardeen-s216dw` in both repos.
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

## 8. Results

(Recorded at the end of the work.)
