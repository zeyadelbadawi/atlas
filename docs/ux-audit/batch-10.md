# B10 — Website themes, visual design (Nov 2026)

The four selectable academy website themes (`modern-education`, `atelier`, `manara`, `riwaq`)
judged as design systems against their own plans (`Reports/THEME_*_PLAN.md`): type, colour,
contrast (text and non-text), spacing, radius, consistency, responsiveness, RTL and polish.
Local stack; the theme forced per page by rewriting `themeKey` in the public configuration
response (never in the database), each theme's default colour seeds and its own starter pages;
375 / 768 / 1024 / 1280 / 1440, EN and AR; in-page contrast, type, font and measurement scans;
every write answered by the test. 193 screenshots. UX behaviour (forms, flows) is B9.

**32 findings — 5 High, 11 Medium, 16 Low.** Text contrast passes almost everywhere (one link
at 4.46:1). The serious problems: two theme typefaces never render in Chromium, desktop headers
that wrap at 1024 px, words split mid-word, and shared components (auth pages, line heights,
`dir="auto"` alignment, images) that ignore the theme.

| Theme | Hier. | Type | Colour | Rhythm | Consist. | Resp. | RTL | Polish |
|---|---|---|---|---|---|---|---|---|
| Modern Education | 8 | 7 | 8 | 8 | 7 | 7 | 7 | 7 |
| Atelier | 8 | 4 | 9 | 5 | 6 | 5 | 7 | 6 |
| Manara | 7 | 6 | 8 | 6 | 7 | 6 | 6 | 7 |
| Riwaq | 8 | 4 | 8 | 6 | 6 | 7 | 5 | 7 |

## Findings

| # | Theme | Where | What is wrong | Rule | Sev |
|---|---|---|---|---|---|
| V01 | Atelier | Every heading | Upright Fraunces never renders: the family's faces declare different weight ranges, Chromium picks the Arabic set, Latin falls back to Liberation Serif; the hero mixes two typefaces. | type | High |
| V02 | Riwaq | All Arabic text | The Arabic face never loads (weight ranges 100–700 vs 100–900): Arabic is a system font. | type | High |
| V03 | All | Desktop header | Desktop nav from 1024 px with no `nowrap`: wraps in 6 of 8 theme/language pairs; Manara AR even at 1280. | layout | High |
| V04 | Manara | Home › tracks | "Developme / nt", "Programme / s" at 1280 (`overflow-wrap: anywhere`, 34.6 px in 221 px). | type | High |
| V05 | Atelier | Home › recent courses (375) | Price on the same row leaves ~115 px: "Comprehens / ive", 10-line titles. | layout | High |
| V06 | All | Sign-in / sign-up | Ignores the theme: Readex 24/700 heading, 40 px / 8 px-radius controls, 51×17 "Sign up" link. | consistency | Medium |
| V07 | Modern Education | Sign-in "Forgot password?" | 4.46:1 (`text-primary`, the CTA role, not the link role 4.76:1). | 1.4.3 | Medium |
| V08 | Modern Education | Courses header search | Input border 2.85:1 on the soft surface. | 1.4.11 | Medium |
| V09 | All | Latin text on AR pages | Arabic line heights (1.45–1.7) applied to Latin titles. | type | Medium |
| V10 | All | Cards, rows, spec tables | `dir="auto"` aligns each block to its own direction: mixed alignment in one card. | alignment | Medium |
| V11 | All | Course thumbnails | No image fallback: a broken URL shows the browser's broken-image icon. | polish | Medium |
| V12 | Atelier, Manara, Riwaq | Section rhythm | Same-ground sections keep both paddings: 262 / 218 / 256 px gaps (Theme 1 merges). | rhythm | Medium |
| V13 | Atelier, Manara | Mobile header | Academy name truncated "Web Development…". | brand | Medium |
| V14 | Manara | Catalog filter pills | Unselected pill border 1.26:1. | 1.4.11 | Medium |
| V15 | Atelier | FAQ questions | Global `h3` 600 weight against the theme's 340–380 serif. | type | Medium |
| V16 | Atelier | Arabic nav | 12 px with 0.16em tracking. | type | Medium |
| V17 | Manara | Hero | h1 56 vs h2 44 (1.27×). | hierarchy | Low |
| V18 | Riwaq | Catalog selects | Native select chevron in a square system. | consistency | Low |
| V19 | Riwaq | Cell grids | Odd counts leave a shaded empty cell. | polish | Low |
| V20 | Riwaq | Programme explorer | ☐ / ■ markers read as checkboxes. | affordance | Low |
| V21 | Riwaq | AR explorer | Western and Arabic-Indic digits on one page. | RTL | Low |
| V22 | Manara, Riwaq, Atelier | Mobile page end | Light spacer band under the dark footer; empty strip above it on course pages. | polish | Low |
| V23 | Modern Education | Page headers | Blob plus generic icon tile reads as placeholder art. | polish | Low |
| V24 | Modern Education | Radius | 20, 12, 14, 16, 24, 28, 8 and full in use. | tokens | Low |
| V25 | Atelier, Manara, Riwaq | Type scale | 12–14 one-off `clamp()` sizes per theme; Atelier 11 px count. | tokens | Low |
| V26 | Modern Education | Catalog toolbar | Divider overhangs the content by 32 px each side. | grid | Low |
| V27 | Atelier | Scroll scenes | Home +40% taller with motion; one viewport is only a dark arch. | motion | Low |
| V28 | Atelier | Course curriculum (375) | Title, leader and count squeezed; Arabic title 3 lines in ~70 px. | layout | Low |
| V29 | Riwaq | Arabic weights | One 400 Arabic file with synthesis off: flat beside Latin 500/700. | type | Low |
| V30 | Manara | AR steps (375) | Outlined Arabic-Indic digits with leading zeros read as stray shapes. | RTL | Low |
| V31 | Modern Education | Home | Numbered feature split followed by numbered steps. | composition | Low |
| V32 | Atelier | Catalog search (375) | Placeholder cut to "What would you like". | truncation | Low |

## Works well — keep
- Brand-engine colour mapping: text contrast solved per background in every theme; muted text
  5.2–5.8:1, CTA text 6.3–9.8:1, placeholders 4.5–9.7:1; almost no hard-coded colours.
- Focus rings solved per ground (Atelier 7.6, Manara 5.8–9.8, Riwaq 6.3–7:1).
- Every section type themed in all four packs; designed hover states (lift, underline and image
  peek, tinted photo developing); 404 pages designed as posters.
- RTL mirroring of the thread, seams and arrows; ink-measured Arabic line heights for Arabic text.
- Modern Education's merged same-tone gap; Manara and Riwaq mobile composition.

## Not tested, with reason
- Firefox and Safari font matching (V01, V02 verified in Chromium only). Dark mode (light-only
  themes). Disabled, loading and empty states outside Modern Education (B9 covers them).
- Blog, instructors, legal and custom pages: no local data; shared sections reviewed through
  fixture pages. AR 768 / 1440 home only. Real logos and long academy names.
