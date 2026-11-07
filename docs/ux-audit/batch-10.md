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

| Theme            | Hier. | Type | Colour | Rhythm | Consist. | Resp. | RTL | Polish |
| ---------------- | ----- | ---- | ------ | ------ | -------- | ----- | --- | ------ |
| Modern Education | 8     | 7    | 8      | 8      | 7        | 7     | 7   | 7      |
| Atelier          | 8     | 4    | 9      | 5      | 6        | 5     | 7   | 6      |
| Manara           | 7     | 6    | 8      | 6      | 7        | 6     | 6   | 7      |
| Riwaq            | 8     | 4    | 8      | 6      | 6        | 7     | 5   | 7      |

## Findings

| #   | Theme                  | Where                       | What is wrong                                                                                                                                                                          | Rule        | Sev    |
| --- | ---------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------ |
| V01 | Atelier                | Every heading               | Upright Fraunces never renders: the family's faces declare different weight ranges, Chromium picks the Arabic set, Latin falls back to Liberation Serif; the hero mixes two typefaces. | type        | High   |
| V02 | Riwaq                  | All Arabic text             | The Arabic face never loads (weight ranges 100–700 vs 100–900): Arabic is a system font.                                                                                               | type        | High   |
| V03 | All                    | Desktop header              | Desktop nav from 1024 px with no `nowrap`: wraps in 6 of 8 theme/language pairs; Manara AR even at 1280.                                                                               | layout      | High   |
| V04 | Manara                 | Home › tracks               | "Developme / nt", "Programme / s" at 1280 (`overflow-wrap: anywhere`, 34.6 px in 221 px).                                                                                              | type        | High   |
| V05 | Atelier                | Home › recent courses (375) | Price on the same row leaves ~115 px: "Comprehens / ive", 10-line titles.                                                                                                              | layout      | High   |
| V06 | All                    | Sign-in / sign-up           | Ignores the theme: Readex 24/700 heading, 40 px / 8 px-radius controls, 51×17 "Sign up" link.                                                                                          | consistency | Medium |
| V07 | Modern Education       | Sign-in "Forgot password?"  | 4.46:1 (`text-primary`, the CTA role, not the link role 4.76:1).                                                                                                                       | 1.4.3       | Medium |
| V08 | Modern Education       | Courses header search       | Input border 2.85:1 on the soft surface.                                                                                                                                               | 1.4.11      | Medium |
| V09 | All                    | Latin text on AR pages      | Arabic line heights (1.45–1.7) applied to Latin titles.                                                                                                                                | type        | Medium |
| V10 | All                    | Cards, rows, spec tables    | `dir="auto"` aligns each block to its own direction: mixed alignment in one card.                                                                                                      | alignment   | Medium |
| V11 | All                    | Course thumbnails           | No image fallback: a broken URL shows the browser's broken-image icon.                                                                                                                 | polish      | Medium |
| V12 | Atelier, Manara, Riwaq | Section rhythm              | Same-ground sections keep both paddings: 262 / 218 / 256 px gaps (Theme 1 merges).                                                                                                     | rhythm      | Medium |
| V13 | Atelier, Manara        | Mobile header               | Academy name truncated "Web Development…".                                                                                                                                             | brand       | Medium |
| V14 | Manara                 | Catalog filter pills        | Unselected pill border 1.26:1.                                                                                                                                                         | 1.4.11      | Medium |
| V15 | Atelier                | FAQ questions               | Global `h3` 600 weight against the theme's 340–380 serif.                                                                                                                              | type        | Medium |
| V16 | Atelier                | Arabic nav                  | 12 px with 0.16em tracking.                                                                                                                                                            | type        | Medium |
| V17 | Manara                 | Hero                        | h1 56 vs h2 44 (1.27×).                                                                                                                                                                | hierarchy   | Low    |
| V18 | Riwaq                  | Catalog selects             | Native select chevron in a square system.                                                                                                                                              | consistency | Low    |
| V19 | Riwaq                  | Cell grids                  | Odd counts leave a shaded empty cell.                                                                                                                                                  | polish      | Low    |
| V20 | Riwaq                  | Programme explorer          | ☐ / ■ markers read as checkboxes.                                                                                                                                                      | affordance  | Low    |
| V21 | Riwaq                  | AR explorer                 | Western and Arabic-Indic digits on one page.                                                                                                                                           | RTL         | Low    |
| V22 | Manara, Riwaq, Atelier | Mobile page end             | Light spacer band under the dark footer; empty strip above it on course pages.                                                                                                         | polish      | Low    |
| V23 | Modern Education       | Page headers                | Blob plus generic icon tile reads as placeholder art.                                                                                                                                  | polish      | Low    |
| V24 | Modern Education       | Radius                      | 20, 12, 14, 16, 24, 28, 8 and full in use.                                                                                                                                             | tokens      | Low    |
| V25 | Atelier, Manara, Riwaq | Type scale                  | 12–14 one-off `clamp()` sizes per theme; Atelier 11 px count.                                                                                                                          | tokens      | Low    |
| V26 | Modern Education       | Catalog toolbar             | Divider overhangs the content by 32 px each side.                                                                                                                                      | grid        | Low    |
| V27 | Atelier                | Scroll scenes               | Home +40% taller with motion; one viewport is only a dark arch.                                                                                                                        | motion      | Low    |
| V28 | Atelier                | Course curriculum (375)     | Title, leader and count squeezed; Arabic title 3 lines in ~70 px.                                                                                                                      | layout      | Low    |
| V29 | Riwaq                  | Arabic weights              | One 400 Arabic file with synthesis off: flat beside Latin 500/700.                                                                                                                     | type        | Low    |
| V30 | Manara                 | AR steps (375)              | Outlined Arabic-Indic digits with leading zeros read as stray shapes.                                                                                                                  | RTL         | Low    |
| V31 | Modern Education       | Home                        | Numbered feature split followed by numbered steps.                                                                                                                                     | composition | Low    |
| V32 | Atelier                | Catalog search (375)        | Placeholder cut to "What would you like".                                                                                                                                              | truncation  | Low    |

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

## Fixes

Measured in Chromium on the local stack with the audit's own harness (theme forced per page, theme
default seeds, starter pages); after-shots under the before shots' names. Every High and Medium item is
fixed or was already fixed; the 8 Low items first left open were settled by owner decisions and are
fixed too (marked "owner decision").

- **V01** fixed — every upright `Atelier Display` face declares `font-weight: 100 900` (Markazi was
  300–900, so Chromium treated it as a rival face and Latin fell back to Liberation Serif). Hero h1 now
  Fraunces ×40 glyphs (was Liberation Serif 19 + Fraunces 21); h2/h3/FAQ all Fraunces; Arabic Markazi.
- **V02** fixed — the Arabic `Riwaq Sans` face declares `100 700` like the Latin one; Arabic headings and
  text now render in IBM Plex Sans Arabic (was DejaVu Sans).
- **V03** fixed — links never break (`nowrap`), navigation and actions keep their width and the name
  takes the squeeze (≤ 2 lines, never clamped); the list may wrap only past half the bar, so a long
  navigation stays reachable. Theme 1 and Riwaq keep the desktop bar from 1024 px; Atelier and Manara
  (need ~1145 / ~1325 px in EN / AR) show it from 1280 px, the existing menu below. One row and a constant
  header height in all 8 theme/language pairs at 1024, 1100, 1180, 1279, 1280, 1366 and 1440.
- **V04** fixed — track names are sized to their tile (`min(…, 13.5cqi)`, container query) with
  `overflow-wrap: break-word; hyphens: auto` instead of `anywhere`: 29.9 px in 222 px at 1280, no word split.
- **V05** fixed — under 768 px the price sits under the title; titles get 231 px (was ~115 px).
- **V06** fixed — each theme's auth frame styles the shared form: heading in the theme face (Atelier
  Fraunces 380 / Markazi 500, Manara Alexandria 800, Riwaq Plex 500), 44 px controls with the theme radius
  (0 / 6 / 0 / 12 px), text links 28 px tall (Sign up was 51×17). Shared form markup unchanged.
- **V07** fixed — text links in Theme 1's auth form take the link role: 4.76:1 (was 4.46:1).
- **V08** fixed — Theme 1's input border is solved for 3:1 against the soft surface as painted too:
  hero search 3.08:1 on the surface, 3.24:1 on its fill (was 2.85:1).
- **V09** fixed — every Arabic line-height rule also needs `:dir(rtl)` (inside `:where`, no added
  weight); Latin `dir="auto"` titles on Arabic pages keep the Latin value (Atelier row title 1.12 in AR
  and EN; was 1.35–1.45).
- **V10** already fixed — the global match-parent `dir="auto"` alignment rule in `src/index.css` (#99).
- **V11** already fixed — B9 V15 (`useImageFailure`, `ThemeImage` `errorValue`).
- **V12** fixed — same-ground blocks in a row share one gap in Atelier, Manara and Riwaq (and in the
  preview): 131 / 109 / 128 px (was 262 / 218 / 256). Atelier's cinematic opening scene keeps its
  hand-over padding to the first chapter (the chapter slides over the pinned stage).
- **V13** already fixed — B9 V14.
- **V14** fixed — unselected filter pills use the 3:1 field boundary token: 3.29:1 (was 1.26:1).
- **V15** fixed — FAQ questions set at the display weight 380 (Arabic 500), not the global h3 600.
- **V16** fixed — Atelier's RTL rules also match when `dir` sits above the theme scope (and only where
  text runs RTL): Arabic nav 15 px, no tracking, no uppercase (was 12 px / 0.16em).
- **V17** fixed (owner decision) — a long hero headline's step (`--mn-display-compact`) is 64 px from 1280
  (was 56), fluid down to 30 px on phones as before; the fit rule still steps a long headline down from the
  72 px display size (48 characters, plan §3.14). EN hero h1/h2 64/44 = 1.45× at 1280 and 1440 (was
  56/44 = 1.27×; the starter headline now wraps to 4 lines at 1280, 3 at 1440); 54/43 at 1024; 375 and the
  short AR headline (72/44) unchanged. The course title (`mnp-course-title`) uses the same step: 64 px.
- **V18** fixed — Riwaq selects draw their own chevron (as Atelier's and Manara's), mirrored in RTL.
- **V19** fixed — ledger cells draw their own 1 px rule (outline over the shared gap): a short row ends
  with the last cell, no shaded empty cell.
- **V20** fixed — explorer rows mark with a line chevron (down/up on phones, toward the sheet from
  1024 px, mirrored in RTL) instead of ☐ / ■.
- **V21** fixed (owner decision, one digit system) — Arabic uses Western digits (0–9) everywhere: the
  shared formatters and every theme ornament format through `intlLocale` (`ar-EG-u-nu-latn`), and
  Atelier's CSS counters no longer switch to `arabic-indic` in RTL. Arabic month names, separators and
  RTL are unchanged; Arabic-Indic digits a person types are still accepted (`normalizeDigits`).
- **V22** fixed — the strip under the footer above the phone bar takes `--website-footer-surface` (the
  footer's own ground: Atelier deep, Manara night, Riwaq deep; Theme 1 unchanged). The "empty strip"
  above the course-page footer did not reproduce in a live viewport (full-page capture artefact).
- **V23** fixed (owner decision) — the art at an inner page hero's end is one of the theme's own
  photographs (`ThemeImage`, lazy, the manifest's focal point, `alt=""` through a new `decorative` option)
  on the brand shape: Courses `courses-launching`, Contact `gallery-2`, About (intro) `about-story`, FAQs
  (intro) `gallery-4`, custom pages `gallery-3`. No icon tile. Same box (320×256 at 1024 px, 352×288
  at 1280 px) and hero heights unchanged (Courses 516 / Contact 448 px at 1280 EN); an unreleased or
  failed photograph leaves the brand shape alone.
- **V24** fixed (owner decision) — Theme 1 has four radii: `--t1-radius-small` 8, `-control` 12, `-card` 20
  and `-pill` (full). 6 and 14 → 8 / 12, 10 → 12, 24 and 28 → 20, `rounded`/`-xl`/`-2xl`/`-3xl` and
  literal px mapped to the tokens, and the app's `--radius-*` variables re-pointed inside the theme so
  shared blocks (legal links, shared sections) follow. Radii measured on 7 pages × EN/AR: 2, 6, 8, 10, 12,
  14, 19, 20, 24, 28, full → 8, 12, 20, full, plus a card's inner photo at 19 (concentric inside its 1 px
  border) and the shared phone field's 2 px flag.
- **V25** fixed (owner decision) — every fluid font size in Atelier, Manara and Riwaq is a named step of the
  theme's scale (custom properties on the theme scope, smallest first; no `font-size: clamp()` outside
  it), each one-off snapped to the nearest step: Atelier's 24 (4 of them the cinematic stages' fits, now
  `min(step, Nsvh)`) onto 9 steps, 5 new (`--at-heading-s/m/l`, `--at-display-s`, `--at-figure`);
  Manara's 20 onto 11, 6 new (`--mn-heading-s/m/l`, `--mn-figure`, `--mn-figure-l`, `--mn-poster`);
  Riwaq's 11 onto 9, 3 new (`--rw-heading-s/m/l`). The 404 figures and the quote glyph are named ornament
  sizes. Atelier's 11 px category counts and placeholder labels → 12 px, its small-print floor
  (`--at-small`, which its 12 px labels use too). Measured on 4 pages × EN/AR × 375/1280:
  198 / 102 / 70 of 3342 / 2978 / 3278 text elements change size, most by ≤ 2 px; the largest are Atelier
  category names 66→70 (36→40 on phones), Riwaq's enrol title 59→67, Manara's countdown 77→72 (44→36 on
  phones); no horizontal scroll.
- **V26** fixed — the catalog toolbar's divider is inset by the toolbar's own padding (32 px each side
  at 1024+), its ground still bleeds.
- **V27** fixed (owner decision) — each pinned scene has half its scroll (opening 170 → 85svh, method
  40 → 20svh a step, ink 150 → 75svh): with motion the Home is 18% taller than without (9,867 vs
  8,356 px at 1280 EN; was 11,890, +42%; AR +16%, was +38%). The ink now covers the stage by the time it
  pins and the title and figures rise straight away, so no viewport is only dark ink. Reduced motion and
  the static fallbacks are unchanged.
- **V28** fixed — under 640 px the curriculum leader goes and the lesson count sits under the title:
  Arabic title one line in 227 px (was 3 lines in ~70 px).
- **V29** fixed (owner decision) — IBM Plex Sans Arabic Medium and Bold added
  (`@fontsource/ibm-plex-sans-arabic` 5.3.0, OFL 1.1 as the Regular, 45.3 / 44.3 kB) in their own family,
  `Riwaq Sans Arabic` (bands 100–450 / 451–600 / 601–700), named after `Riwaq Sans` (Latin, 100–700), so
  no family mixes scripts with different weight ranges (V02). Arabic headlines are Bold, Arabic titles
  Medium; names, labels and
  subtitles (500) get the Medium file. Chromium `getPlatformFontsForNode`, AR Home and About: h1 →
  IBMPlexSansArabic-Bold, h2/h3 → IBMPlexSansArabic-Medium, body → Regular; the Latin file downloads once.
  Riwaq stylesheet 55,928 B (was 55,984; repeated rules merged to fit the 56,000 B budget); fonts 4 files,
  each ≤ 50 kB.
- **V30** fixed — revised by the one-digit-system decision: Arabic steps are numbered 01 02 03 in
  Western digits, as in English (no more ١ ٢ ٣). They stay filled in Arabic: the Arabic face's digits
  have overlapping contours that the outline stroke draws as stray lines.
- **V31** fixed (owner decision) — the feature split's benefits are a list with a check mark each, not
  numbered (`ul`, no `t1-number`); the steps after it are Home's only numbered list.
- **V32** fixed — the catalog search field keeps 15rem; on phones the button moves under it: field
  291 px for a 228 px placeholder (was 169 px).
