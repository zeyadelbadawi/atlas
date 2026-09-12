# Atlas Marketing Website — Design System (Master)

Generated with **UI/UX Pro Max v2.13.0** (`--design-system`, dials `--variance 5
--motion 4 --density 3`), then reconciled against the Atlas repository's existing
token layer. This file is the global source of truth for the **public marketing
site only** (`PUBLIC_ROUTES`: `/`, `/features`, `/pricing`, `/privacy-policy`,
`/terms`). It does not govern the authenticated dashboard or tenant academy
websites.

Page-specific overrides, if any, live in `./pages/<page>.md` and take precedence.

---

## 1. Resolved direction

| Axis | Decision | Source |
|---|---|---|
| Style | **Editorial Grid / Magazine**, adapted for SaaS | UI/UX Pro Max `style` domain — `editorial-grid-magazine` |
| Landing pattern | **Hero → Value prop → Capabilities → Proof → CTA → Footer** | UI/UX Pro Max `landing` — `hero-features-cta` |
| CTA placement | Sticky header CTA + hero primary/secondary + closing CTA | same |
| Colour | **Existing Atlas Deep Teal semantic tokens** (unchanged) | repo token layer, corroborated by skill |
| Typography | **Existing Readex Pro (display) + Rubik (body)** | repo token layer (override, see §2) |
| Motion | **Standard tier**, framer-motion | UI/UX Pro Max `motion` (override of GSAP, see §2) |
| Density | **Spacious** (dial 3/10) | `--density 3` |

### Why Editorial Grid and not the first result

The skill's initial `--design-system` pass returned **Glassmorphism**. It was
rejected for two documented reasons: the brief explicitly forbids "random
glassmorphism" and "excessive gradients", and the skill's own record flags it
`accessibility: risk:conditional` and `performance: drivers:animation,blur`. The
narrower retry returned `editorial-grid-magazine`, which carries
`accessibility: risk:low`, `performance: cost:low|drivers:none`, light + dark
support, and `framework: css-grid|tailwind` — a native fit for this stack.

Its asymmetric grid is also the direct answer to the brief's "avoid repetitive
card grids": capability content is laid out on a deliberately uneven editorial
grid with a lead item, not nine identical boxes.

---

## 2. Documented overrides of the skill's raw output

These are deliberate, and each has a hard product reason. They are recorded here
so a later session does not "restore" them.

1. **Typography — keep Readex Pro / Rubik; reject Plus Jakarta Sans.**
   The skill recommended Plus Jakarta Sans. It has **no Arabic glyph coverage**.
   Atlas is bilingual EN/AR with full RTL, and `--font-display: Readex Pro` /
   `--font-sans: Rubik` were chosen precisely because both ship complete Arabic
   sets. Adopting the recommendation would break the Arabic site. Non-negotiable.

2. **Colour — keep the Atlas Deep Teal scale; do not adopt a generated palette.**
   The skill's `color` domain independently returned teal for both
   *LMS (Learning Management System)* (`#0D9488`) and education/trust queries,
   which **corroborates** the existing brand hue (`--brand-500: 184 62% 34%`)
   rather than replacing it. Atlas is a live product with an established
   identity; rebranding is out of scope. Restraint is applied in *how much* teal
   appears, not in changing the hue.

3. **Motion — framer-motion, not GSAP.**
   The skill attaches GSAP snippets. `framer-motion` is already a dependency and
   `RISE_VARIANTS` / `createStaggerVariants` already exist in
   `src/design-system/motion/`. Adding GSAP would be a second animation library
   for no capability gain, against the brief's performance rule.

4. **No drop caps, no `::first-letter` treatment.**
   Part of the canonical Editorial Grid checklist, deliberately dropped: a drop
   cap is meaningless-to-hostile in Arabic script and would need an
   LTR-only exception on every block. Editorial character is carried by the type
   scale, the measure, and hairline rules instead.

---

## 3. Layout

### Container

The dashboard's `--layout-content-max-width` is `96rem` (1536px) — correct for a
data-dense app shell, far too wide for marketing prose. Marketing uses its own,
narrower measure.

```
--layout-marketing-max-width: 75rem;  /* 1200px — outer bound  */
prose measure:                 65ch   /* body copy             */
heading measure:               22ch   /* display headings      */
```

Never widen a paragraph past ~70ch. `text-wrap: balance` is applied to display
headings only, as a progressive enhancement with a tested natural-wrap fallback
(UI/UX Pro Max `ux` → *Heading Line Balance*: bound the measure, never force
line breaks).

### Section rhythm (density 3 — spacious)

| Token | Value | Use |
|---|---|---|
| section-y (mobile) | `4rem` | `py-16` |
| section-y (desktop) | `7rem` | `lg:py-28` |
| stack-lg | `2rem` | between a heading block and its content |
| stack-md | `1rem` | within a heading block |
| gutter | `1.25rem → 2rem` | `px-5 sm:px-6 lg:px-8` |

Sections are separated by a **hairline rule** (`border-border`), not by
alternating background blocks — an editorial device, and it keeps the page
calm. At most one tinted section (the closing CTA) per page.

### Asymmetric capability grid

```
┌───────────────────────────────┬───────────────┐
│  LEAD CAPABILITY  (2 cols)    │  capability   │   ← 12-col grid
│  larger type, more space      ├───────────────┤
│                               │  capability   │
├───────────────┬───────────────┴───────────────┤
│  capability   │  capability   │  capability   │
└───────────────┴───────────────┴───────────────┘
```

Implemented with `grid-cols-12` + explicit `col-span` per item, collapsing to a
single column below `sm`. This is the anti-pattern escape for "repetitive card
grids".

---

## 4. Colour application

Tokens only — never a raw hex in a component (the repo already enforces this).

| Role | Token | Where it may appear on marketing |
|---|---|---|
| Brand/primary | `primary`, `primary-foreground` | primary CTA fill, logo mark, lead capability marker, active nav |
| Surface | `background`, `surface`, `card` | page ground, closing-CTA block, capability cards |
| Text | `foreground`, `muted-foreground` | headings / body |
| Lines | `border`, `border-strong` | section rules, card edges, header underline |
| Focus | `ring` | every focusable element — never removed |

**Restraint rule:** teal appears in at most **three** places per viewport. No
gradient meshes, no coloured blur blobs, no tinted glass panels. The one
permitted gradient is a single very low-contrast `surface → background` wash
behind the hero, which must remain invisible in a screenshot taken at 50%
brightness.

**Contrast:** CTA label against button fill ≥ 4.5:1 (UI/UX Pro Max `landing`
note). `primary` (`184 68% 26%`) against `primary-foreground` (`184 44% 97%`)
clears this comfortably in both modes.

---

## 5. Typography scale

`font-display` = Readex Pro, `font-sans` = Rubik.

| Role | Class | Notes |
|---|---|---|
| Hero h1 | `text-[2.5rem] sm:text-6xl lg:text-7xl`, `font-display`, `font-semibold`, `tracking-[-0.03em]`, `leading-[1.05]` | measure `max-w-[22ch]`, `text-balance` |
| Section h2 | `text-3xl sm:text-4xl lg:text-5xl`, `tracking-[-0.02em]`, `leading-[1.1]` | |
| Card h3 | `text-lg`, `font-display`, `font-semibold` | |
| Lead paragraph | `text-lg sm:text-xl`, `leading-relaxed`, `text-muted-foreground` | measure `max-w-[58ch]` |
| Body | `text-base`, `leading-relaxed` (1.625) | UI/UX Pro Max `ux` → *Line Height* 1.5–1.75 |
| Eyebrow | `text-xs`, `font-medium`, `uppercase`, `tracking-[0.14em]` | RTL: no uppercase transform issue in Arabic; keep tracking |
| Numerals | via existing `NumericExpression` / `isolateNumericExpression` | bidi-neutral characters reorder in RTL — a correctness issue, not cosmetics |

Minimum body size 16px. Never below 12px anywhere.

---

## 6. Component treatment

| Component | Rule |
|---|---|
| Radius | `rounded-xl` (`--radius-xl`, 0.875rem) for cards and the CTA block; `rounded-md` for controls; `rounded-pill` only for the eyebrow. **One radius per role — never mixed within a section.** |
| Shadow | `shadow-xs` at most on a resting card. No `shadow-lg` anywhere on marketing. Depth comes from borders and spacing. |
| Border | `1px solid border` hairline. `border-strong` only on hover of an interactive card. |
| Icon | Lucide, `strokeWidth 1.75`, `size-5`; always `aria-hidden` when adjacent text names the thing (UI/UX Pro Max `icons`). Never an emoji. |
| Button | shadcn `Button`; `size="lg"` for hero and closing CTA, `size="sm"` in the header. `cursor-pointer`, 150–300ms transition. |
| Card | `bg-card border border-border rounded-xl p-6 lg:p-8`. No nested cards. |

---

## 7. Motion (Standard tier, 4/10)

```
enter:   opacity 0→1, y 12→0     duration 400ms   ease [0.16,1,0.3,1]
stagger: 60ms per item, cap total at ~480ms
scroll:  whileInView, { once: true, margin: '-80px' }
hover:   150ms colour/border only
```

Rules:
- Animate **`opacity` and `transform` only**. Never width/height/top/left.
- Reveal **groups**, not every element. A paragraph does not need its own entrance.
- The hero animates on load; everything below animates on scroll, once.
- **`prefers-reduced-motion`** must render the final state immediately — no
  parallax, no pulsing CTA. Enforced by the existing `@motion` presets plus a
  `motion-reduce:` guard on any CSS-driven transform.

---

## 8. Responsive

Breakpoints verified at **375 / 768 / 1024 / 1440**.

| Width | Behaviour |
|---|---|
| 375 | single column; header collapses to logo + CTA + menu trigger; hero h1 `2.5rem`; full-width stacked buttons |
| 768 | 2-col capability grid; nav still in drawer |
| 1024 | full inline nav; asymmetric 12-col grid active |
| 1440 | container caps at `75rem`; gutters grow, measure does not |

Hard requirements: **no horizontal overflow at any width**; touch targets
≥ 44×44px with ≥ 8px separation; no `user-scalable=no`.

---

## 9. Accessibility (priority 1–2, CRITICAL)

- Body/UI text contrast ≥ 4.5:1 in **both** light and dark.
- One `<h1>` per page; heading levels never skip.
- `<nav>` landmarks carry `aria-label`; the mobile drawer traps focus and closes
  on `Escape` (shadcn `Sheet` provides both).
- Focus is **visible on every operable control** — `focus-visible:ring-2
  ring-ring ring-offset-2`. Never `outline: none` without a replacement.
- Decorative SVG: `aria-hidden` + `focusable="false"`. Meaningful imagery gets
  real alt text.
- Tab order matches visual order; verified with no pointer.
- `prefers-reduced-motion` honoured (§7).

---

## 10. Anti-patterns — do not ship

From the brief and the skill's `AVOID` output, combined:

- glassmorphism panels, backdrop-blur decoration, gradient meshes
- excessive gradients, coloured blur blobs, neon glows
- a 3×3 grid of identical feature cards
- `shadow-lg`/`shadow-2xl` stacks, mixed radii inside one section
- badges used as decoration; pills with no state meaning
- walls of text; paragraphs wider than ~70ch
- animating everything; entrance animations on body copy
- dark mode as the default (Atlas defaults to light)
- **fabricated content of any kind** — no invented logos, testimonials,
  statistics, awards, integrations, guarantees or pricing. Marketing copy comes
  from `localization/resources/{en,ar}/*.json`; plan data comes from the real
  `GET /public/plans` catalogue.

---

## 11. Content sources (real, never fabricated)

| Surface | Source |
|---|---|
| Hero, value prop, capabilities, how-it-works, closing CTA | `en/home.json` + `ar/home.json` |
| Feature detail | `en/features.json` + `ar/features.json` |
| Plans, limits, feature comparison | live `GET /public/plans` → `usePublicPlans()` |
| Legal | `features/legal/content/{privacy-policy,terms}.{en,ar}.ts` |
| Nav / footer labels | `en/layout.json` + `ar/layout.json` |

Atlas has **no** customer logos, testimonials or usage statistics in the
repository. The "trust" slot is therefore filled with a **verifiable
architecture statement** drawn from real shipped behaviour (database-level tenant
isolation, per-academy subdomains, bilingual EN/AR) — not social proof that does
not exist.

---

## 12. Homepage v2 — cinematic hero override (documented deliberately)

A later, explicit product decision widened the hero only, past §4's/§10's default
restraint. Recorded here, per this document's own convention, so a later session
does not "restore" the restrained split hero by mistake.

**What changed:** the homepage hero is now full-viewport (`100svh`) with a
Magnific-generated, muted, autoplaying, looping ambient background video — one
deliberate cinematic moment at the very top of the page. This is a genuine
override of §10's "excessive gradients / neon glows" anti-pattern and §4's
"teal in at most three places" restraint, scoped **to the hero band only**.

**Why it's still Atlas and not a rebrand:** the video's palette is the existing
brand teal (`--primary`) and cream, not an invented palette; the motif (loose
fragments drifting into one coherent form) is a literal rendering of the
product's own value proposition (scattered tools → one platform), not decoration
for its own sake; and every section below the hero is untouched by this
override — same hairline dividers, same one-tinted-closing-CTA rule, same
`framer-motion` Standard-tier motion, same no-fabricated-content rule.

**Non-negotiables preserved even inside the hero:**
- `prefers-reduced-motion` renders a static poster frame, no autoplay.
- The video is `muted`, `playsInline`, decorative (`aria-hidden`), and never the
  only carrier of information — headline and CTAs are real DOM text, not baked
  into the video.
- Contrast: headline/body sit over a fixed dark scrim tuned to hold ≥4.5:1
  regardless of which video frame is behind it, in both light and dark mode.
- Readex Pro / Rubik, RTL correctness, and real-content-only sourcing are
  unchanged — the hero copy still comes from `home.json`.

**Companion asset:** one small supporting illustration (the same crystalline
motif, settled/resolved) appears once more, near the "why Atlas exists"
comparison — reinforcing the hero's visual language instead of introducing a
second one. No further generated imagery appears elsewhere on the page; §4's
restraint rule otherwise stands.
