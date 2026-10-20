# Atlas Help Center — Design System (Master)

Generated with **UI/UX Pro Max** (`--design-system "documentation help center
knowledge base SaaS bilingual"`, dials `--variance 3 --motion 2 --density 5`,
20 Oct 2026), then reconciled with the Atlas marketing design system
(`../atlas-marketing/B1-STATIC-SITE.md`). It governs the help center on
`docs.<base>` (DL-57) only: static pages rendered at build time from
`content/docs/{en,ar}/**.md`, in `src/docs/`.

## 1. Resolved direction

| Axis    | Decision                                                                                           | Source                                                 |
| ------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Pattern | **FAQ/Documentation landing**: search hero → popular categories → common tasks → contact CTA       | Pro Max `landing`                                      |
| Style   | **Minimalism & Swiss**: grid, white space, high contrast, functional                               | Pro Max `style` (a11y risk low, perf cost low)         |
| Colour  | **Atlas Royal Navy + Gold** platform tokens (`src/index.css`), not the generated slate + link blue | Override 1                                             |
| Type    | **Readex Pro** (headings) + **Rubik** (body), self-hosted, same files as marketing                 | Override 2                                             |
| Motion  | **None beyond colour/opacity transitions** (≤ 200 ms), all behind `prefers-reduced-motion`         | Pro Max motion 2/10; no scroll reveal on reading pages |
| Density | Standard (16–64 px scale); article body measure 68ch                                               | `--density 5`                                          |
| Avoid   | Poor navigation, no search                                                                         | Pro Max `AVOID`                                        |

## 2. Overrides of the raw output (do not "restore")

1. **Colour.** The skill proposed neutral slate with a blue accent. The help
   center is part of the Atlas brand (owner-approved palette 1, 20 Oct 2026):
   navy for primary actions, links and the active nav item; gold only for the
   "Recommended next step" marker and the search hero's keyline.
2. **Typography.** Atkinson Hyperlegible has no Arabic glyphs. Readex Pro +
   Rubik cover Arabic and Latin; Arabic body uses `line-height: 1.9`.
3. **Motion.** No GSAP, no scroll reveal: a reader scanning steps must never
   wait for content to appear. Only hover/focus colour changes and the
   drawer's opacity.

## 3. Layout

```
┌──────────────────────── header (sticky, 64px) ────────────────────────┐
│ Atlas Help   [ Search help…            / ]   EN|ع  ◐  Back to Atlas │
├──────────┬───────────────────────────────────────────┬────────────────┤
│ category │  breadcrumbs                              │ On this page   │
│ tree     │  H1 + 40–60-word answer + badges          │ (≥1280px)      │
│ (≥1024)  │  step cards (number, text, screenshot)    │                │
│          │  callouts · related · prev/next · helpful │                │
└──────────┴───────────────────────────────────────────┴────────────────┘
footer: categories · legal · contact · language
```

- Container `max-width: 90rem`; sidebar `16rem`; TOC `14rem`; article measure
  `68ch`, screenshots may extend to the column width (max 960 px).
- Below 1024 px: the category tree is a `<details>` drawer under the header
  ("Browse topics"); TOC is hidden; search stays in the header (icon opens a
  full-width field).
- `scroll-margin-top: 80px` on every anchored heading (sticky header never
  hides a target).

## 4. Components

| Component            | Rule                                                                                                                                                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search box           | Visible label (sr-only text + placeholder), `/` shortcut, results list under the field as you type (`role="listbox"`, arrow keys, Enter opens), "No results" state with the three most popular articles and a contact link. Full `/search?q=` page works without JS (server shows popular list; JS fills results) |
| Step card            | `<ol>` of `<li>`; number badge (navy circle, 32 px, Arabic-Indic digits on AR pages), the instruction quoting the exact UI label in **bold**, the screenshot in a `figure` with a light browser frame, caption "Demo content", meaningful alt text. Screenshot links to the full-size file (zoom without JS)      |
| Callouts             | `Note` (navy), `Limitation` (amber, "What this does not do"), `Warning` (red). Icon + label text, never colour alone                                                                                                                                                                                              |
| Badges               | Role ("Owner", "Manager", "Instructor", "Learner") and plan eligibility. Text badges, no decorative pills                                                                                                                                                                                                         |
| Category card (home) | Icon (Lucide, 20 px, `aria-hidden`), title, one-line description, article count. Grid 1/2/3 columns; no identical 3×3 wall: the first row is "Start here" with larger cards                                                                                                                                       |
| Helpful?             | Two native buttons ("Yes" / "No"), beacon event only, thank-you text replaces them; no identifiers                                                                                                                                                                                                                |
| Breadcrumbs          | `nav[aria-label]`, `ol`, current page `aria-current="page"`; RTL chevrons flip                                                                                                                                                                                                                                    |
| Prev/next            | Within the category order                                                                                                                                                                                                                                                                                         |

Radius: `rounded-lg` cards and screenshots, `rounded-md` controls. Shadows:
none at rest on reading pages; `shadow-xs` on hover of category cards only.

## 5. Accessibility and performance (must pass)

- Contrast ≥ 4.5:1 for text in light and dark; focus ring visible on every
  control; skip link to `#main`.
- One `h1`; headings in order; landmarks `header`, `nav` (labelled), `main`,
  `aside`, `footer`.
- Images: fixed `width`/`height`, `loading="lazy"` except the first step,
  WebP, `srcset` 960/1440 desktop and 390/780 mobile.
- No horizontal scroll at 375 px; tables scroll inside their own wrapper.
- Works without JavaScript: navigation, drawer (`details`), theme default
  (system), images, prev/next. JS adds instant search, theme toggle memory,
  copy-link on headings and the helpful buttons.
- Budget: ≤ 30 KB JS (gzip) for search + UI; the search index loads on first
  focus of the search box, per language.

## 6. RTL

Logical properties only (`ps-`, `me-`, `start-`), `dir="rtl"` on Arabic pages,
chevrons and prev/next arrows mirrored, screenshots are real Arabic captures
(never mirrored English).

## 7. Content rules (validator-enforced)

- Real UI labels from the locale files, routes from the router, limits from
  the catalog (`{trialDays}`, never a hard-coded number); no Premium.
- Banned marketing strings (SPEC §A.10) also apply.
- Protection articles state what a feature does and does not do (DL-50).
- Demo data only in screenshots; no testimonials, reviews or student counts
  (XA-07).
