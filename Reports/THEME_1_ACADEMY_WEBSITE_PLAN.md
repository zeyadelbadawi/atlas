# Theme 1 ("Modern Education") — Academy Website Redesign Plan

Status: **v2, updated for approval. Nothing here is implemented.**
Scope:
- Turn Theme 1 into a complete, launch-ready academy website that every Academy receives automatically.
- Build the architecture so Themes 2–5 can later get their own identity and page composition.
- Derive each Academy's website colours intelligently from its logo.

---

## What changed in v2

| Area | Change |
|---|---|
| Decisions (§L.4) | All three decisions recorded as **approved**, with your clarifications. |
| §0 (new) | Tool availability, verified: Magnific MCP **not connected**; UI/UX Pro Max **not installed**. Stop rules for both. |
| §D.4 | The sample social-proof rule is now traced through every layer: data model → provisioning → editor → preview → publish validation → public API → frontend render → tests. |
| §D.5 (new) | **Theme presentation update vs Academy content migration**, defined as two separate operations. Only the first is in scope. |
| §E | Rewritten. The ~18-image estimate is replaced by an **asset matrix derived from the final design** (12 generated photos and 9 code-generated decorative assets). It adds the **Magnific workflow with a hard stop rule**, a review checklist, production preparation, storage/versioning and provenance metadata. |
| §F.4–F.6 (new) | The **Brand System**: logo → intelligent semantic palette, accessibility engine, live preview, Owner control and source of truth, and **Brand Palette ≠ Theme Token Mapping**. |
| §B, §C.1 | Brand expression rules (how Theme 1 stays Theme 1 across very different brands). |
| §H | The same 10 phases, updated: Magnific in Phases 0 (check), 3 (pipeline + pilot), 4 (production run after the design freeze) and 8 (asset QA); the brand system in Phases 1/2/4/7/8/9; **UI/UX Pro Max in every phase** (§H.0 table). |
| §I | A new brand-system test suite covering all 19 cases you listed, plus hostile images. |
| §J | New brand-system acceptance criteria. |
| §K | New risks (brand engine, Magnific, skill availability). |
| §L | Recommendation updated; the remaining decisions are listed in §L.4. |

---

## 0. Tool availability and stop rules (verified 29 Sep 2026)

| Tool | Status in this session | What I checked | Stop rule |
|---|---|---|---|
| **Magnific MCP** | **Not connected** | No Magnific tools are present. The session has **no connectors attached**. The connector directory has no Magnific entry (so it must be added as a custom connector). | Asset **generation** (the Phase 3 pilot and the Phase 4 production run, §E.3) stops and I report this. **No other image service is ever substituted, and I never generate images myself.** Every other phase continues. |
| **UI/UX Pro Max skill** | **Not installed** | It isn't in the session's installed skills or in the organisation's plugin catalogue. | Before each phase, I verify the skill is loaded. If it isn't, **I don't start** the phase's design/QA work and report instead. Pure backend work in the same phase (for example Phase 2 contracts) may proceed. |

**What you need to do for Magnific:**
1. Connect it at **https://claude.ai/customize/connectors**. It isn't in the directory, so use *Add custom connector* with Magnific's MCP server URL and authorise it.
2. Make sure it's enabled for Claude Code sessions.
3. **Start a new session.** Connectors are read when a session starts; the current session can't see a connector added later.

**What you need to do for UI/UX Pro Max:** install the skill (or its plugin) in your Claude environment, then start a new session so it loads.

**Also check:** when Magnific is connected, I first **inventory its actual tools**. If they only upscale or enhance and can't generate from a text prompt, the generation step is blocked and I report that. I won't substitute another generator, and I won't upscale unrelated images.

---

## A. Current state audit

*(Unchanged from v1 apart from A.5.)*

### A.1 The flow, end to end (as implemented)

| Step | Where | What actually happens |
|---|---|---|
| Client Owner creates an Academy | FE `features/provisioning/components/AcademySetupForm.tsx` | The form collects the name, subdomain, `selectedThemeKey` and `websiteSetupMode` (`complete` pre-selected). **No logo is collected.** Provisioning is the **only** Academy-creation path. |
| Provisioning | BE `provisioning/services/provisioning-orchestrator.service.ts` → `executeThemeStep` | `updateConfiguration({ themeKey })`, then `WebsiteGenerationService.generate(...)` in the requester's tenant+user RLS context. |
| Generation | BE `website/services/website-generation.service.ts` | Creates the core pages from the theme's template (`website/templates/*.template.ts`), including bilingual starter copy, CTA intent resolution, navigation, footer and header CTA. Idempotent. |
| Stored data | Prisma `WebsiteConfiguration` (themeKey, brand JSON, seo, navigation, header, footer, status), `WebsitePage` (sections JSON), `Academy.logoUrl` / `faviconUrl` | Academy-scoped, FORCE RLS. |
| Branding today | FE `WebsiteBrandTab.tsx` (+ Academy Branding page for the logo) | The Owner hand-picks 3 colours (`primaryColor` / `secondaryColor` / `accentColor`, HSL) with native colour inputs. `color.utils.ts` has WCAG contrast helpers but nothing derives colours from the logo. The logo is a URL string set on the Branding page. |
| Publishing | `POST …/website/publish` | Flips status. **No page-level draft copy**: edits to a published site are live. |
| Public rendering | `PublicWebsiteRouter` → `usePublicWebsiteData` → `WebsiteRenderer` → `WebsiteChrome` + `SectionRenderer` (a switch over 12 types) / `CourseDetailsTemplate` | One payload with all published pages. |
| Theming | `themes/*.theme.ts` → `WebsiteThemeScope` | A theme is a token set (variants, radius, shadow, spacing, width, heading style, default HSL colours) mapped to `--website-*` CSS variables. |
| Media | `MediaAsset` (per-Academy R2 prefix); FE `WebsiteImageField` | **A direct upload is stored as a base64 `data:` URL inside the section JSON.** |
| Theme switching | `WebsiteThemeTab` | Saves `themeKey` only; content is untouched. |
| Image tooling | BE `sharp` + BullMQ `media-processing.processor.ts` (async dimensions) | Available for server-side image work. |

### A.2 Why a new Theme 1 site looks empty

1. **No imagery anywhere.** The split hero shows an empty tinted 4:3 box.
2. **Live-data sections have no data on day one.**
   - Featured courses and instructors show EmptyState icons.
   - Statistics publicly shows **"0 · 0 · 0"**.
3. **Testimonials are seeded with a title and `items: []`.**
4. **Inner pages have one section each**, identical for every theme.
5. **Minimal, interchangeable renderers.** There's no rhythm, image treatment, depth or motion.
6. **Themes are token sets over the same components**, so they read as colour variations.

### A.3 Keep

- Tenancy and data flow, and sections as typed data.
- The template registry plus idempotent generation.
- Bilingual `LocalizedText` and routing.
- Live-data sections.
- One renderer on every surface.
- The public course APIs.
- The existing dependencies: `framer-motion` (dashboard only), `embla-carousel-react`, Radix Accordion, `lucide-react`, Tailwind and `sharp`.
- The existing contrast helpers in `color.utils.ts`, which the brand engine will absorb.

### A.4 Redesign or introduce

- Theme 1 renderers and chrome.
- 4 new shared section types.
- Theme 1's own inner-page templates.
- Empty-data rules and a sample-content rule.
- A theme asset pack.
- A CSS-first motion system.
- The base64 upload fix.
- **The brand system (new, §F.4).**

### A.5 Brand-colour audit (new)

- **No automatic derivation:** colours come only from three manual pickers.
- **Brand colours are used directly as UI colours.** `WebsiteThemeScope` maps `primaryColor` straight to CTA backgrounds and the `--primary` token. A light or neon brand colour therefore produces low-contrast buttons today.
- **Contrast checking exists** (`hasAccessibleContrast`, 4.5:1) but isn't enforced anywhere in the save path, and there's no backend check.
- **No semantic roles** beyond primary/secondary/accent. Background, surface, foreground and border are hard-coded in `WebsiteThemeScope`, and there are no status or focus roles.
- **The logo isn't part of provisioning.** It's set later as a plain URL and never analysed.

---

## B. Target experience

**Personality: "a confident, welcoming modern school".** Bright, warm and optimistic; clearly an education brand; editorial rather than SaaS-generic.

- **Visual direction.**
  - **Canvas:** a white base, soft neutral alternating bands, and **one deep "ink" band** for the final CTA.
  - **Brand colour as signal, not wash:** CTAs, a highlight stroke under one heading phrase, chips, focus and active states, and the brand shape behind imagery.
  - **Cards:** 20px radius, hairline border, elevation on hover.
  - **Typography:** the existing `font-display` / `font-sans`. Display 64/56/40, section titles 40/32/28, body lead 18/17, line length ≤ 65ch.
- **Brand expression (new): how Theme 1 stays Theme 1 across brands.**
  - **Invariant:**
    - layout;
    - composition and section order;
    - type scale and typography;
    - spacing rhythm;
    - radius and elevation;
    - the ink band;
    - motion;
    - the neutral canvas (background, surfaces and text stay near-neutral and are only faintly tinted by the brand hue).
  - **Variable:** the brand fills only defined **slots**:
    - CTA fill;
    - the highlight stroke;
    - the brand shape;
    - chips, link, focus ring and active nav indicator;
    - the ink band's glow;
    - icon tiles;
    - the accent dot or underline.
  - **Result:** a blue, an orange and a purple Academy are recognisably the same Theme 1, each wearing its own brand. **A logo can never turn page backgrounds or body text a brand colour in Theme 1.** That's a Theme 1 mapping rule (§F.5), not a limitation of the engine.
- **UX.** Every screen answers "what is this / why care / what next". Search is in the hero, every section ends with a next step, and the primary CTA is always one tap away on mobile.
- **Hierarchy (Home):** promise → proof → discovery → offer → reasons → process → people → proof → reassurance → action.
- **Density:** one idea per section, 3–6 items; vertical rhythm 96/80/64px.
- **Motion:** one orchestrated hero entrance, one-time reveals, physical-feeling hovers. Nothing loops, nothing autoplays, no gimmicks.
- **Responsive:** composed separately for 1440/1024/390px, not just stacked.

---

## C. Theme 1 page and section inventory

*Unchanged from v1 except for asset keys (matching §E.2) and brand slots.*

Legend for *Source*:
- **authored** = seeded bilingual copy the Academy edits;
- **live** = real Academy data at render time;
- **asset** = a theme image the Academy can replace;
- **sample** = preview-only content (§D.4).

### C.1 Home

| # | Section (type) | Purpose | Content / layout / imagery | Interaction & motion | Responsive | Source / reuse |
|---|---|---|---|---|---|---|
| 1 | Hero (`hero`, extended) | Promise + first action | Eyebrow; headline with one highlighted phrase (brand highlight stroke); sub-copy; primary CTA "Explore courses" and secondary "How it works"; inline course search → `/courses?q=`; 3 highlight chips. Image: `home-hero` with the `brand-shape-hero` behind it and a floating live course-count chip (only when > 0). | Orchestrated entrance (text, then CTAs/search, then image). The LCP headline isn't faded. | D 55/45 split · T stacked, image first at 16:10 · M headline, full-width search, image at 4:3, chip rail | authored + asset + live / shared + T1 |
| 2 | Highlights band (`features`, `layout: strip`) | Value | 4 icons (brand icon tiles) + titles on the soft surface | Staggered rise | 4-up / 2×2 | authored |
| 3 | Explore by category (`courseCategories`, new) | Discovery | Live categories with counts as icon tiles; **hidden with < 2 categories** | Tile lift | 4 / 3 / rail | live |
| 4 | Featured courses (`featuredCourses`) | Offer | Image-led cards, "View all". **Empty:** a "Courses launching soon" panel using `courses-launching` | Card hover; embla rail | 3 / 2 / swipe rail | live (+ asset for the empty state) |
| 5 | Why {{academyName}} (`featureSplit`, new) | Differentiation | `home-benefit` image with `brand-shape-soft`, title, lead, 3 numbered benefits | Image clip reveal, stagger | side-by-side / image-first | authored + asset |
| 6 | How it works (`steps`, new) | Remove friction | 3 steps with a connector line (`steps-connector`, brand-coloured) | Ordered reveal; line draws once | horizontal / vertical timeline | authored |
| 7 | Instructors (`instructors`) | People | Live only; **hidden publicly when none**; editor preview shows labelled samples | Hover lift | 4 / 2 / rail | live |
| 8 | Numbers (`statistics`) | Proof | Live only; **zeros hidden; section hidden with < 2 metrics** | Count-up once | 3–4 / 2×2 | live |
| 9 | Testimonials (`testimonials`) | Proof | Large-quote carousel with initials avatars. **Seeded items are `sample`** (§D.4) | Arrows, dots, no autoplay | 1 + peek / rail | library + authored (sample) |
| 10 | FAQ teaser (`faq` + `maxItems`, `cta`) | Reassurance | Split: heading + contact link / 4-item accordion | Accordion | split / stacked | authored |
| 11 | Final CTA band (`cta` + `secondaryCta`, `image`) | Conversion | The ink band with brand glow; `home-cta` photo (dark studio background blends into the band) | Fade + CTA hover | image right / below / hidden < 480px | authored + asset |
| — | Header (T1 chrome) | Navigation | Logo, nav, language, Sign in, Sign up (CTA slot); transparent → solid on scroll | 200ms state change; mobile sheet | full / condensed / menu + CTA | config |
| — | Footer (T1 chrome) | Wayfinding | Brand + about + social; quick links; top categories; contact (Academy data) | Link underline | 4 → 2 → 1 accordion | config + live |

### C.2 Courses

- `pageHeader`: no photo, `brand-shape-page` instead, with search.
- `courseCatalog`: T1 renderer with category chips, sticky toolbar, mobile filter sheet, URL state, skeletons and a no-results state.
- `cta` → Contact.

### C.3 Course Details

Template redesign on the existing data:
- hero band with meta and rating (only when reviews exist);
- sticky purchase card on desktop, which becomes a sticky bottom bar on mobile;
- outcomes, requirements, curriculum accordion with preview, instructors, reviews and related courses.

Cards without thumbnails use the code-generated `course-fallback-pattern` in the Academy's brand colours.

### C.4 About

1. `pageHeader` with `about-header`.
2. `featureSplit` with `about-story`.
3. `features` values.
4. `statistics` (live rule).
5. `instructors` (live rule).
6. `gallery` bento with `gallery-1…5`.
7. `cta`.

### C.5 FAQs

`pageHeader` (with FAQ filter) + `faq` (8 bilingual questions) + `cta` → Contact.

### C.6 Contact

`pageHeader` + `contact` (method cards from Academy data, existing form, success state) + `faq` teaser.

### C.7 Other surfaces

- The auth shell uses `auth-side`.
- Coming Soon and 404 use `brand-shape-page` (no photo).
- The learner area is out of scope.

### C.8 Not added

- **Blog or events page:** blog content isn't public today (see `website-section.types.ts`).
- **Pricing page:** pricing lives on the courses themselves.
- **Map embed:** there's no maps integration, and it would add a third-party origin the CSP blocks.
- **Logo cloud:** there's no honest source of partner logos for a new Academy.

---

## D. Data and content model

### D.1 Flow

```
Theme template v2 (BE) ──generate──► Academy-owned WebsitePage rows ──publish──► public runtime
                                          ▲ editable in Page Editor            │
Brand System: logo ─► analysis ─► semantic Brand Palette ─(Owner confirms)─► WebsiteConfiguration.brand.palette
                                                                                │
ThemePack token mapping (Theme 1) ◄──────────────────────────────────────────────┘ ─► CSS variables ─► render
Live data (courses, categories, instructors, stats, reviews) ───────────────────────► render
```

### D.2 Required changes

**Section contracts** (unchanged from v1; additive and backward compatible, no data migration):
- new types: `pageHeader`, `courseCategories`, `steps`, `featureSplit`;
- `hero`: `highlight?`, `highlights?`, `showSearch?`;
- `features`: `layout?`;
- `faq`: `maxItems?`, `cta?`;
- `cta`: `secondaryCta?`, `image?`, `imageAlt?`;
- `testimonials` items: `rating?`, **`sample?`**.

**Public API:** `GET public/websites/:academyId/categories`. Published-only, public fields only, same tenancy pattern.

**Template v2** (Theme 1 only): gains `version`, per-section asset references, `sample` flags and Theme 1-specific inner pages. The other templates are unchanged.

**Provenance:** nullable `website_configurations.template_key` and `template_version`. It's additive, and it prepares a future (out-of-scope) Refresh Starter Content feature.

**Brand palette:** new, stored in the **existing `WebsiteConfiguration.brand` JSON column**, so **no schema migration** is needed. Shape (all HSL triplets):

```ts
brand: {
  // Legacy — kept and kept in sync with the palette's seeds, so Themes 2–5
  // (still on base renderers) and old clients behave exactly as today:
  primaryColor, secondaryColor, accentColor, darkLogo?,
  palette?: {
    schemaVersion: 1,
    algorithmVersion: 'bp-1',            // deterministic engine version
    status: 'proposed' | 'confirmed',
    source: 'logo' | 'manual' | 'themeDefault',
    seeds: { primary, secondary?, accent? },   // brand-identity inputs
    roles: {                                    // resolved semantic roles
      primary, primaryForeground, secondary, secondaryForeground,
      accent, accentForeground, background, surface, surfaceMuted,
      foreground, foregroundMuted, border, success, warning, error,
      focus, link, cta, ctaForeground,
    },
    usage: { [seed]: 'full' | 'decorativeOnly' },  // e.g. neon kept as accent only
    overrides: Partial<seeds & roles>,           // Owner's manual choices: authoritative
    report: { pairs: [{ fg, bg, ratio, required, pass }], adjustments: [...] },
    extraction?: { logoFingerprint /* sha256 of logo bytes */, candidates: [...], flags: [...] },
    confirmedAt?, confirmedBy?,
  }
}
```

The backend **re-validates** every palette write: format, all required contrast pairs (§F.4.4), and that each override is either passing or allowed as decorative only. A failing text role is rejected with a precise error key.

**Provisioning:** **no change to the provisioning request or schema** for branding (see §F.4.3 for why).

### D.3 Branding sources

- **Name:** header, footer, interpolated copy.
- **Logo:** `Academy.logoUrl`. The dark logo is used on the ink band; otherwise the logo sits on a light pill.
- **Colours:** **the Brand Palette** (§F.4) through Theme 1's token mapping (§F.5).
- **Live data:** always this Academy's own.
- Templates never contain another Academy's data.

### D.4 Sample social proof (Decision 2, approved): end-to-end rule

**Rule:**
- Sample testimonials exist for preview/design only, clearly marked **Sample**.
- They never become public automatically.
- Publishing warns if any remain.
- Statistics and instructors are always real Academy data.
- There is no fabricated public social proof.

| Layer | Implementation |
|---|---|
| Data model | `TestimonialItem.sample?: boolean` (backend + frontend Zod). Library entries (`WebsiteTestimonialEntry`) have no sample flag: they're always authored by the Academy. Statistics items in Theme 1 v2 carry **`metric` only**. The template never sets the authored `value` fallback, so there's no hand-typed number. |
| Provisioning | The Theme 1 template seeds 3 testimonial items with `sample: true` and initials avatars (no photos of fake people). Statistics and instructors are seeded as live configuration only. |
| Editor | A "Sample" badge on each sample item and on the section in the page tree. The explicit action "This is a real testimonial" clears `sample`. **Editing text does not clear it automatically** (a typo fix shouldn't turn a fake quote real). Help text explains why. |
| Preview (Page Editor, dashboard preview, theme gallery) | Sample items render with a small, visible "Sample" label. Live sections with no data show **labelled** sample cards (instructors) or labelled placeholders (stats), which are **never** produced on the public route. |
| Publish validation | `POST …/website/publish` computes `sampleContent` (a list of page/section ids with sample items). The publish dialog shows a warning listing them: publish anyway, or review. It's a warning, not a block. The same list appears in the website overview checklist. |
| Public API (defence in depth) | `GET public/websites/:id/pages` **strips `sample: true` items server-side** before caching. Sample content therefore never reaches a visitor's browser, even with a modified client. |
| Frontend render | The public renderer also filters `sample` items. A testimonials section with 0 real items renders nothing. Live-data hiding rules apply (0 stats hidden, no instructors → hidden). |
| Tests | Unit: the schema accepts `sample`; the editor action clears it; the renderer filters it. Backend e2e: the public pages payload never contains `sample: true` items; the publish response lists them. Browser E2E: new Academy → preview shows the Sample badges → publish shows the warning → the public site shows none → confirming one item makes exactly that item public. Statistics: no authored values in the Theme 1 template (template spec test). |

### D.5 Theme presentation update vs Academy content migration (Decision 3, approved)

| | **Theme presentation update** (in scope) | **Academy content migration** (out of scope) |
|---|---|---|
| What changes | The code that *draws* Theme 1: renderers, chrome, CSS, motion, token mapping | The Academy's stored data: sections, copy, images, navigation |
| How it reaches existing Theme 1 academies | Automatically, by deploying the new frontend. Every Academy with `themeKey = modern-education` renders its **existing** content with the new design | It doesn't. No job, migration or generation run touches existing academies |
| Data written | **None** | — |
| Their authored content | Rendered as-is | Not rewritten |
| Their images | Rendered as-is, with the resolver passing through existing URLs. Legacy `data:` images still render | Not replaced |
| Their sections | Same sections, same order. New section types appear only if the Owner adds them | Not added or removed |
| Their colours | **Existing academies keep their saved legacy colours.** With no `palette`, Theme 1's mapping derives accessible roles from the saved `primaryColor`/`secondaryColor`/`accentColor` at render time. Nothing is written, and a "Generate palette from logo" suggestion appears in the Brand tab | — |
| Safety gate | Legacy-fixture verification (Phase 8): every v1 content shape renders correctly under the new renderers (e.g. hero without image, testimonials without items, stats with authored values) | — |
| Future | — | An explicit, previewed, reversible **"Refresh Starter Content"** may come later, using `template_version` provenance. **Not part of this plan.** |

One nuance: the presentation update *does* change what existing academies look like (for example, zero statistics become hidden, and empty testimonials sections render nothing). These are **render rules on existing data**, not data changes.

---

## E. Media and image plan

### E.1 What exists

The repositories contain **no education imagery**. The only rasters are Atlas's own teal 3D brand illustrations (`features/home/…`), which are unsuitable. Tenant uploads belong to their tenants and are never reused.

### E.2 Asset matrix, derived from the final design

The count comes from the §C inventory: every slot that needs a raster gets exactly one master, and everything that must re-colour with each Academy's brand is **code** (SVG/CSS), not a picture.

**A. Photographic assets: generated with Magnific (12)**

All share one art direction:
- natural light, warm-neutral grade, low saturation (so any brand colour reads as the accent);
- real, diverse, culturally appropriate adults for EN and MENA audiences (including modest attire);
- no text, logos, screens with readable UI, watermarks or recognisable brands;
- clean negative space where UI overlays;
- photographic realism (no illustration style).

| Asset key | Purpose | Section(s) | Type | Master ratio / size | Delivered widths | Desktop / mobile requirement | Visual direction |
|---|---|---|---|---|---|---|---|
| `home-hero` | First impression | Home › Hero | Photo | 4:5 · 2000×2500 | 480, 800, 1200, 1600 | D: 4:5 in a ~560px column · T: 16:10 crop · M: 4:3 crop. Focal point recorded (face/hands in all three crops) | An adult learner absorbed in study at a bright table, laptop plus notebook, warm window light, calm and optimistic, empty space top-right for the floating chip |
| `home-benefit` | Differentiation | Home › Why us | Photo | 4:3 · 2400×1800 | 480, 800, 1200, 1600 | D/T side-by-side at ~600px · M: full-width 4:3 | A mentor guiding a learner at a shared screen (screen content blurred), encouragement, genuine interaction |
| `home-cta` | Conversion band | Home › Final CTA | Photo | 3:4 · 1500×2000 | 400, 800, 1200 | D: right side of the band · T: below · M: hidden under 480px | A smiling learner holding a notebook, **deep charcoal studio background** that blends into the ink band (no cut-out needed) |
| `courses-launching` | Empty state | Home › Featured courses (0 courses) | Photo | 16:9 · 2400×1350 | 640, 1024, 1600 | Full-width panel at every size, focal point centred | Overhead flat lay: open notebook, pen, coffee, closed laptop, soft shadows ("getting ready") |
| `about-header` | Page identity | About › Page header | Photo | 21:9 · 2800×1200 | 800, 1280, 1920, 2560 | D: full-bleed band · M: 4:3 focal crop | A wide, bright workshop or classroom with a small group mid-discussion, depth of field |
| `about-story` | Story | About › Story split | Photo | 4:3 · 2400×1800 | 480, 800, 1200, 1600 | Same as `home-benefit` | A small team planning together at a whiteboard (whiteboard content abstract) |
| `gallery-1` | Life at the Academy | About › Gallery (bento, large tile) | Photo | 4:3 · 2400×1800 | 480, 800, 1200, 1600 | D: 2×2 bento tile · M: full-width | A group workshop, hands-on activity |
| `gallery-2` | 〃 | Gallery (wide tile) | Photo | 4:3 · 2400×1800 | 480, 800, 1200, 1600 | D: 2×1 · M: full-width | A learner on a video call (screen blurred), at home |
| `gallery-3` | 〃 | Gallery (square) | Photo | 1:1 · 1600×1600 | 400, 800, 1200 | D: 1×1 · M: half-width | A close-up of hands writing notes |
| `gallery-4` | 〃 | Gallery (square) | Photo | 1:1 · 1600×1600 | 400, 800, 1200 | 〃 | A learner with headphones on a tablet in a café |
| `gallery-5` | 〃 | Gallery (square) | Photo | 1:1 · 1600×1600 | 400, 800, 1200 | 〃 | A small celebration moment (high-five or shared success; no certificate text) |
| `auth-side` | Sign in/up shell | Auth pages | Photo | 3:4 · 1500×2000 | 400, 800, 1200 | D: side panel · T/M: hidden (the form comes first) | A calm study scene in the evening with a desk lamp, focused |

**B. Code-generated decorative assets: not Magnific (9)**

These must re-colour per Academy, so they're inline SVG/CSS driven by palette roles (§F.5). They're versioned with the theme code, not the asset pack.

| Asset key | Purpose | Section(s) | Type | Size behaviour |
|---|---|---|---|---|
| `brand-shape-hero` | Signature motif behind the hero image | Home › Hero | Decorative SVG (brand `primary` at ≤ 18% opacity + `accent` detail) | Scales with the image, mirrored in RTL |
| `brand-shape-soft` | Motif behind feature images | Why us, About story | Decorative SVG | 〃 |
| `brand-shape-page` | Inner page header / Coming Soon / 404 art | Courses/FAQs/Contact headers | Decorative SVG | Right-aligned (logical end), hidden under 380px |
| `highlight-stroke` | Emphasis under the highlighted heading phrase | Hero, section titles | SVG stroke (brand `accent`/`primary`) | Stretches to the phrase width |
| `steps-connector` | Path linking the steps | How it works | SVG line (`primary`) | Horizontal (D/T) / vertical (M) |
| `ink-band-glow` | Radial brand glow in the CTA band | Final CTA | CSS gradient (`primary`/`accent` on ink) | Fluid |
| `course-fallback-pattern` | A course card with no thumbnail | Course cards, Course Details | SVG pattern + course initial (brand roles) | 16:9, fluid |
| `category-tile` | Icon container per category | Explore by category | CSS (surface + brand tint) + lucide icon | Fluid |
| `initials-avatar` | Testimonial / instructor fallback | Testimonials, Instructors | CSS (brand-tinted) | 40–64px |

**Not needed:**
- **OG image:** derived at build time as a 1200×630 crop of `home-hero`; no extra generation.
- **Testimonial portraits:** initials instead, so no pictures of people who didn't give the quote.
- **Category illustrations:** lucide icons.

**Total generation request: 12 images.** If the design changes during Phase 4–6 UI/UX Pro Max reviews, the matrix is updated first and only then generated.

### E.3 Magnific workflow (Phase 3), with the stop rule

1. **Freeze the matrix.** Confirm E.2 against the approved Phase 4 design tokens and layouts (UI/UX Pro Max design review).
2. **Check availability.** List the Magnific MCP tools in the session.
   - Not present → **STOP generation** and report (what's missing, how to connect, per §0). Continue with work that doesn't need images; every slot has a designed no-image state in the meantime.
   - Present but no text-to-image capability → **STOP** and report the same way.
3. **Generate** each asset from a written prompt built from the matrix (subject, composition, ratio, grade, negative-space instructions, exclusions). Produce 3–4 candidates per key, at master resolution or upscaled with Magnific to master size.
4. **Review** each candidate against a checklist, then do a UI/UX Pro Max visual review *in context* (rendered in the fixture site at 1440/1024/390, EN/AR, with 4 very different brand palettes):
   - anatomy (hands, faces, eyes);
   - no text, logos or brands;
   - no uncanny artefacts;
   - composition matches the crop and focal requirements;
   - grade consistency across the set;
   - cultural appropriateness;
   - no real identifiable people;
   - works with any brand colour.

   Any failure → regenerate, never retouch past recognition.
5. **Prepare for production:**
   - strip metadata;
   - convert to sRGB;
   - record the focal point;
   - export AVIF (q≈50) + WebP (q≈75) at the matrix widths, plus a 24px blurred LQIP (base64 in the manifest, ≤ 300 B);
   - check weights: hero ≤ 180 KB at 1200w AVIF; others ≤ 120 KB.
6. **Store:**
   - derivatives in `public/theme-assets/modern-education/v1/<key>-<w>.{avif,webp}`;
   - `manifest.ts` holds key → dimensions, focal point, LQIP, alt text EN/AR, widths and provenance;
   - masters (PNG) are **not** committed to the app repo. They're archived in a private `atlas-theme-sources` location (a GitHub release asset or a private R2 bucket), with a sha256 recorded in the manifest.
7. **Provenance metadata** per asset: `generator: "magnific"`, tool name and model/version as reported by the MCP, prompt, seed or job id if exposed, generation date, reviewer, review outcome, and **license basis** (your Magnific plan's output terms, §L.4).
8. **Versioning:** `v1` folders are immutable and never deleted. A changed asset means `v2` plus a template reference bump. Tests fail if any template or manifest key is missing, or a released version folder disappears.

### E.4 Storage, reference, delivery (unchanged from v1)

- Stored as the reference `theme-asset:modern-education/<key>`, resolved to `<picture>` with AVIF/WebP `srcset`, explicit dimensions, LQIP, `object-position` from the focal point, and lazy loading (except the hero: `fetchpriority="high"`).
- Served same-origin by Caddy with `Cache-Control: immutable`, so the CSP needs no change.
- Tenant-free, and Academies replace assets by uploading their own.
- Backend image-value validation: `theme-asset:` / `https:` / legacy `data:image`.

### E.5 Base64 upload fix (unchanged)

Direct uploads go through the Academy's `MediaAsset` (R2) and store the URL. Legacy `data:` values still render.

---

## F. Theme architecture

### F.1 Shared contracts, theme-owned presentation

```
Shared (all themes)                         Per theme (ThemePack)
Section catalog (types + Zod, BE+FE)        tokens (bounded enums)
Base renderers for every type               renderers: Partial<Record<SectionType, Component>>
Primitives (SectionShell, Heading, Reveal,  chrome: Header, Footer, AuthShell
  ThemeImage, Carousel, Chip, Rating,       motion profile
  Price, CourseCard parts, EmptyPanel)      mapBrandPalette(palette) → CSS variables   ◄── new (§F.5)
Brand System engine (§F.4)                  template (BE) + asset pack
Data hooks, tenancy, i18n/RTL
```

- **Dispatch:** `themePack.renderers[type] ?? BASE_RENDERERS[type]`.
- **Themes 2–5:** no renderers, and a mapping identical to today's, so they stay pixel-identical.
- Packs are lazy-loaded chunks.

### F.2 Theme 1 ≠ Theme 2

Composition (template), visual language (renderers/chrome/CSS), **brand application (token mapping)** and assets are all per theme. Content contracts, primitives and the brand engine are shared. Adding Theme 2 touches no Theme 1 file.

### F.3 Theme switching

- The look (tokens, renderers, chrome, mapping) switches immediately, and content is preserved.
- **The brand palette is theme-independent, so it carries over** and the new theme maps it its own way.
- "Apply this theme's layout" is a future, explicit action (unchanged from v1).

### F.4 Brand System: logo → intelligent semantic palette (new)

#### F.4.1 Principles

1. Logo colours are **brand identity inputs (seeds)**, never UI tokens.
2. Every semantic role is **derived and validated**.
3. Accessibility is a **hard constraint**: the engine adjusts a colour rather than accept a failing pair, and it never weakens a threshold to keep a raw colour.
4. The engine is **deterministic and versioned** (`algorithmVersion`). The same logo always gives the same palette.
5. **Theme-independent output.** Themes consume roles through their own mapping (§F.5).
6. **The Owner stays in control**, and confirmed choices are authoritative (§F.4.6).

#### F.4.2 Pipeline

```
Logo file (PNG/JPEG/WebP/SVG ≤ 2 MB)
  │ 1. Decode & normalise: rasterise SVG, downscale to ≤ 128px long edge, premultiply alpha
  ▼
  │ 2. Mask: drop transparent pixels (α < 0.5); detect the background from the border ring
  │    (the dominant edge colour covering > 60% of the border) and drop it; drop anti-alias fringe
  ▼
  │ 3. Cluster in OKLab: weighted k-means++ (k ≤ 8), weight = pixel count × (1 + chroma boost);
  │    merge clusters with ΔE_ok < 0.04
  ▼
  │ 4. Classify each cluster by OKLCH: neutral (C < 0.03), dark (L < 0.25),
  │    light (L > 0.92), chromatic. Rank chromatic clusters by weight → dominant,
  │    secondary (hue distance ≥ 30° and ΔE ≥ 0.1), accent (highest chroma remaining).
  │    Flags: monochrome, lowChroma, noisyBackground, singleHue, neonSeed
  ▼
  │ 5. Candidate seeds: primary = dominant chromatic (or, if monochrome, the darkest
  │    usable brand colour → an "ink brand", with the Theme 1 default hue for accents),
  │    secondary / accent = next candidates, or derived by harmony (analogous ±30°,
  │    split-complement) when the logo has only one hue
  ▼
  │ 6. Role derivation (OKLCH, gamut-mapped to sRGB):
  │    cta / primary: keep hue, keep chroma where possible, move L until
  │         contrast(ctaForeground, cta) ≥ 4.5 (foreground = white or ink, whichever
  │         needs the smallest L shift); hover/pressed states = L ± 6 with the same guarantee
  │    link: primary hue, L chosen for ≥ 4.5 on background and on surface
  │    focus: primary if ≥ 3:1 against background and surface, else the nearest passing L
  │    accent: kept as close to the raw seed as possible; if it can't reach 3:1 against
  │         the background it's marked usage = decorativeOnly (shapes, glows, dots only;
  │         never text or a sole indicator)
  │    background / surface / surfaceMuted / border: neutral, tinted with the primary hue
  │         at C ≤ 0.012 (Theme 1 caps; other themes may choose their own)
  │    foreground: ink tinted with the primary hue (C ≤ 0.02), ≥ 7:1 on background
  │    foregroundMuted: ≥ 4.5:1 on background AND on surface
  │    success / warning / error: fixed hue families (145° / 75° / 25°), nudged ≤ 10°
  │         toward harmony, each ≥ 4.5 as text and ≥ 3:1 as an indicator; if brand hue ≈
  │         the error hue (±20°), error is separated by lightness and always paired with an icon
  ▼
  │ 7. Validate: the full pair matrix (§F.4.4); anything failing → adjust L (never the threshold)
  │    and record the adjustment ("Brand colour #E6FF00 preserved as accent; not used
  │    for text/backgrounds: 1.2:1 on white")
  ▼
  │ 8. Harmony score (reporting and ranking only): hue relationships, chroma balance,
  │    ΔE between roles (distinguishability ≥ 0.08); used to choose among alternatives
  ▼
Semantic palette + report  →  live preview  →  Owner confirms  →  persisted
```

**Regenerate** cycles deterministic alternatives, not random ones:
1. *Balanced* (default);
2. *Vivid* (maximum preserved chroma);
3. *Calm* (lower chroma);
4. *Secondary-led* (swap primary and secondary seeds).

Each alternative is validated by the same rules.

#### F.4.3 Where it runs (decision: client-side engine + server-side authority)

| Concern | Where | Why |
|---|---|---|
| Image decoding + analysis (steps 1–5) | **Browser, in a Web Worker** (`OffscreenCanvas`, SVG rasterised via `createImageBitmap` from a sanitised blob) | Instant results (~50–200ms) with no upload needed, so it works **inside the setup form before the Academy exists**. Hostile images are decoded by the browser's sandboxed decoder, not the API server. Keeps provisioning free of any synchronous image request |
| Role derivation + validation (steps 6–8) | **Shared pure-TypeScript engine**: run in the Worker for the live preview, and **re-run on the backend** at save | One algorithm. The frontend and backend copies are kept identical by a shared golden-vector suite (the same pattern as the mirrored theme/section catalogues) |
| Authority | **Backend** re-validates every palette on `PATCH …/website/configuration` (formats, contrast matrix, override rules, `algorithmVersion` known) | A tampered client can't persist an inaccessible palette |
| Logo storage | The existing Academy branding (`PATCH /academies/:id/branding`) through a `MediaAsset` upload (no base64) | The existing model |

**Setup flow (no fragile synchronous step during Academy creation):**
1. **In the provisioning form** (a new optional "Logo & colours" block beside the theme picker): the Owner picks a logo file, and the Worker analyses it at once.
   - A palette is proposed, and a **live Theme 1 mini-preview** (the existing `WebsiteThemePreviewCard` renderer with fixture content) re-renders immediately with the palette.
   - The Owner can regenerate, adjust or accept.
   - Nothing is uploaded yet; the file and palette stay in the page.
2. **Submit** creates the provisioning request exactly as today, with **no new request fields**.
3. **On the provisioning status page**, as soon as the `academy` step reports `academyId` (it runs before `theme`), the client:
   - uploads the logo as a `MediaAsset`;
   - saves it to Academy branding;
   - saves the confirmed palette (`status: 'confirmed'`, or `'proposed'` if the Owner didn't accept yet).

   Each is idempotent and retried with backoff. Failure shows an inline "Finish branding" card with retry.
4. **If the tab closes first:** nothing is lost that matters. The Academy uses the theme's default palette, and the Brand tab shows "Add your logo to generate your colours".
5. The same "Brand Studio" component serves the **Website › Brand tab** later: upload or replace the logo, analyse, preview (the full-size live preview of the Academy's real pages), regenerate, adjust, accept.

**States:**
- **Loading:** a skeleton palette with a shimmer in the preview. It's instant in practice, with a spinner after 300ms.
- **Failure** (undecodable image, a Worker timeout of 3s, OffscreenCanvas unsupported):
  - a calm inline message;
  - "Try another file" / "Pick colours manually";
  - the preview stays on the last good palette, or the theme default.
- **Retry:** re-runs the analysis on the same file.
- **Old browsers without OffscreenCanvas:** fall back to main-thread analysis on a downscaled canvas. If even that fails, manual pickers.

#### F.4.4 Accessibility contract (hard requirement)

| Pair | Minimum |
|---|---|
| `foreground` on `background`, `surface` | 7:1 (AAA for body) |
| `foregroundMuted` on `background`, `surface`, `surfaceMuted` | 4.5:1 |
| `ctaForeground` on `cta` (plus hover and pressed) | 4.5:1 |
| `primaryForeground` / `secondaryForeground` / `accentForeground` on their role | 4.5:1 |
| `link` on `background`, `surface` | 4.5:1, plus a non-colour cue (underline on hover and focus) |
| `focus` ring against adjacent colours | 3:1 |
| `cta` against `background` (the button boundary) | 3:1, otherwise a 1px border in `foreground` at ≥ 3:1 is added automatically |
| `border` (where it's the sole boundary of an input) against `background` | 3:1 |
| `success` / `warning` / `error` as text | 4.5:1; as an indicator 3:1; always with an icon |
| Theme 1 ink band: `ctaForeground` on `cta` placed on ink, and `foreground-on-ink` | 4.5:1 |

The engine may adjust lightness and chroma within a role. It **must not** lower any threshold. A seed that can't serve a role accessibly is recorded as `decorativeOnly`, with a human-readable reason in the report.

#### F.4.5 Owner controls

- **Proposed palette:** swatches by role group (Brand, Surfaces, Text, Feedback), each with its contrast badge (Pass / Adjusted / Decorative only). The live preview shows it at once.
- **Regenerate:** cycles the 4 deterministic alternatives.
- **Manual adjust:** the Owner edits the **seeds** (primary / secondary / accent) with a picker plus a hex input, and all dependent roles re-derive live with guarantees.
  - "Advanced" allows per-role overrides. The validation is live, and a failing text role can't be saved: the message says why and offers the nearest passing value.
- **Accept:** status becomes `confirmed`, with `confirmedAt` and `confirmedBy` set.
- **Reset to logo suggestion** and **Reset to theme default** are always available.
- **Bilingual UI** (EN/AR), RTL-correct, keyboard-operable, screen-reader labels with contrast numbers.

#### F.4.6 Source of truth

| Situation | Behaviour |
|---|---|
| No palette yet (legacy / skipped) | Render from the legacy `primaryColor`/`secondaryColor`/`accentColor` (or theme defaults), passed through the **same engine at render time** so Theme 1 is accessible even for old data. Nothing is written |
| `status: 'proposed'`, no overrides, logo changes | The palette may be re-proposed automatically from the new logo (the Owner never confirmed anything) |
| `status: 'confirmed'` **or** any overrides exist, logo changes | **Never overwritten.** The Brand tab shows "Your logo changed — preview a matching palette?" with an explicit review → accept |
| Owner edits seeds or overrides | They're authoritative. Regenerate only replaces non-overridden roles unless the Owner chooses "Reset" |
| Theme switch | The palette is unchanged; the new theme maps it |
| Algorithm upgrade (`bp-2`) | Stored palettes are unchanged. Re-running only on explicit Owner action |

Legacy fields `primaryColor` / `secondaryColor` / `accentColor` are written = the seeds on every save, so Themes 2–5 base renderers keep working unchanged.

### F.5 Brand Palette → Theme token mapping

- Each ThemePack exports `mapBrandPalette(palette): Record<'--website-*', string>`. The palette carries no theme knowledge; the mapping carries no image or extraction knowledge.
- **Theme 1 mapping:**
  - `--website-cta` ← `cta`
  - `--website-link` ← `link`
  - `--website-focus` ← `focus`
  - `--website-highlight` ← `accent` (decorative OK)
  - `--website-shape` ← `primary` @ 16% + `accent` detail
  - `--website-chip-bg` ← `primary` @ 10% over surface, with the chip text = `link`
  - `--website-ink` ← foreground-derived (fixed near-black with a 6% brand hue)
  - `--website-ink-glow` ← `primary` / `accent`
  - `--website-background` ← `background` (Theme 1 caps chroma at 0.012)
  - `--website-surface` ← `surface`
- **Base mapping** (Themes 2–5, today): identical to the current `WebsiteThemeScope` output from the legacy seeds, so they stay pixel-identical. When Theme 2 is redesigned, it gets its own mapping, for example an editorial theme using a bolder brand background band.
- Dashboard-origin components inside the scope (`--primary`, `--ring`) map to `cta` and `focus`, which fixes today's low-contrast-button issue for Theme 1.

### F.6 Reuse by Themes 2–5

The engine, the Brand Studio UI, the persisted palette, the validation and the tests are all theme-agnostic. A new theme supplies only its `mapBrandPalette` plus mapping tests (the §I identity matrix).

---

## G. Animation and interaction plan

**Implementation choice: CSS-first.**
- A shared `useReveal()` hook built on `IntersectionObserver` (run once, 15% threshold) toggles `data-revealed`.
- Transitions are CSS classes using Atlas motion tokens (`--duration-normal`, `--ease-entrance`).
- There's **no Framer Motion on the public runtime path**. It would add JS weight to every academy page for effects CSS does well.
- Embla (already a dependency) handles carousels.
- Everything is gated by `@media (prefers-reduced-motion: reduce)`, where reveals render already visible, count-ups show the final value, and carousels jump without sliding.
- Movement is vertical, opacity or scale only, so it reads identically in LTR and RTL.

| Area | Entrance | Scroll | Hover / focus | Reduced motion |
|---|---|---|---|---|
| Hero | Orchestrated: text rises 12px + fade with 60ms stagger; the image fades in 150ms after the text. The LCP headline renders at opacity 1 immediately, and only non-LCP elements animate. | — | CTA: 2% brightness shift + arrow 3px nudge; search focus ring | No entrance; static |
| Highlights, benefits, steps | — | Group rise, 50ms stagger (capped at 400ms total). The steps connector draws via `stroke-dashoffset`, once. | Icon tile subtle tint | Visible immediately |
| Category tiles / course cards | — | Rise on first view (grid rows, not every card individually) | Lift −4px + shadow; image scale 1.03 (transform only); title underline. Focus-visible gets the same treatment as hover. | No lift animation; focus ring kept |
| Course rail / testimonials | — | — | Embla drag/snap with arrow buttons and keyboard arrows. Dots are real buttons with `aria-label`. **No autoplay.** | Instant slide change |
| Statistics | — | Count-up ≤ 900ms (`requestAnimationFrame`) the first time in view | — | Final numbers shown |
| FAQ accordion | — | — | Height animates via Radix CSS variables; chevron rotates 180° | Instant open/close |
| Header | — | Transparent → solid at 24px scroll (opacity/background only, 200ms, passive listener + rAF) | Nav link underline grows from the start (logical property) | State changes without transition |
| Page transitions | None: full-page navigations stay instant, and content reveals handle arrival | | | |

**Performance guards:**
- Only `transform` and `opacity` are animated.
- There's no scroll-linked JS except the one rAF-throttled header check.
- Observers disconnect after reveal.
- **Budget:** Theme 1 adds ≤ 18 KB gzip JS to the public route (the pack chunk; embla already in the bundle) and ≤ 12 KB CSS. The Brand Studio Worker and engine load **only** in the dashboard and setup form, never on the public route.

**Addition — Brand Studio preview:** a palette change cross-fades the preview's colours over 180ms (CSS variable transition on colour properties only). Reduced motion gets an instant swap. The swatch contrast badges update without motion.

---

## H. Implementation phases (10, updated)

### H.0 UI/UX Pro Max across all phases

**Gate for every phase:** the skill is verified as loaded before the phase starts. If it isn't loaded, stop and report (§0). Apple design principles are used as reference only.

| Phase | UI/UX Pro Max is used for |
|---|---|
| 0 Baseline & harness | Auditing the current Theme 1 renders (hierarchy, spacing, typography, a11y findings); defining the review rubric and the visual-QA checklist used by every later phase; reviewing the E.2 matrix art direction |
| 1 ThemePack architecture | Primitive API design (SectionShell, Heading, Reveal, ThemeImage, Carousel): spacing scales, focus styles, motion tokens, responsive breakpoints; accessibility review of the primitives |
| 2 Contracts, categories, media, brand data | Editor UX for the new fields and section types (labels, grouping, help text, validation messages); Sample badge / confirm action design; Brand tab information architecture |
| 3 Asset pipeline + Magnific readiness | Art-direction prompts; pilot (`home-hero`) candidate selection; in-context review at 3 widths × EN/AR × 4 brand palettes; crop and focal decisions |
| 4 Visual system, chrome, **Brand Studio**, Magnific production run | Freezing the asset matrix against the approved layouts; review of all 12 generated assets in context; typography scale, spacing, colour-slot mapping (§F.5), header, footer, mobile navigation, auth shell; the Brand Studio UX (swatches, badges, preview, error/loading states); interaction and motion specs; responsive design review |
| 5 Home renderers | Section-by-section component design, layout, hierarchy, motion, empty/sample states; design review of every section at 390/1024/1440 |
| 6 Inner pages | Catalog UX (filters, search, mobile sheet), Course Details layout and sticky purchase, About/FAQs/Contact composition; responsive and interaction review |
| 7 Starter content & initialization | Copy hierarchy and tone review (EN/AR); setup-form "Logo & colours" flow review; publish-warning dialog UX |
| 8 Hardening & verification | Full visual QA and responsive QA (matrix), accessibility review, motion review, brand identity review across the brand matrix; final design-review sign-off |
| 9 Release | Production visual QA on real hosts (EN/AR, desktop/mobile); post-release UX review of real Academy branding results |

### Phase 0 — Baseline, harness, decisions, tool checks

- **Objective:** the regression reference and the tooling gates.
- **Work:**
  - a dev-only fixture route rendering any theme with fixture data and an **injectable brand palette**;
  - the Playwright screenshot matrix (5 themes × pages × EN/AR × 1440/1024/390);
  - Lighthouse and axe baselines;
  - verify **UI/UX Pro Max** is installed and **Magnific** is connected (report either gap, §0);
  - a UI/UX Pro Max audit of the current renders; the review rubric.
- **Acceptance:** baseline committed; tool status recorded; review rubric written.
- **Risk:** low.

### Phase 1 — ThemePack architecture, shared primitives, brand engine core

- **Objective:** the extension points, with no visual change.
- **Frontend:**
  - ThemePack registry and dispatch;
  - primitives;
  - `mapBrandPalette` hook (the base mapping reproduces today exactly);
  - **the brand engine core** (pure TS: OKLab/OKLCH conversions, gamut mapping, clustering, classification, role derivation, validator, alternatives), not yet wired into any UI;
  - golden vectors.
- **Backend:** a mirror of the engine's **derivation + validation** module (no image decoding), passing the same golden vectors.
- **Tests:**
  - pack fallback;
  - base mapping equals today's variables;
  - engine unit tests (§I brand suite: derivation and validation parts);
  - frontend/backend golden-vector parity;
  - **Themes 1–5 pixel diff = 0**.
- **UI/UX Pro Max:** primitive design review.
- **Risk:** engine complexity. **Mitigation:** a small, well-specified algorithm with heavy vector tests.

### Phase 2 — Content contracts, categories, media fix, brand persistence, sample model

- **Backend:**
  - section schema additions (incl. `sample`);
  - image-value validation;
  - the categories endpoint;
  - **the public pages payload strips sample items**;
  - `brand.palette` validation on configuration updates (engine validator; override rules);
  - the publish endpoint returns `sampleContent`;
  - optional provenance columns (additive migration, via the gated deploy if approved).
- **Frontend:**
  - types and Zod mirrors;
  - field and metadata registries;
  - i18n;
  - base renderers for the new types;
  - MediaAsset upload for images and the logo;
  - catalog URL state;
  - the Sample badge and confirm action in the editor.
- **Tests:**
  - legacy pages parse unchanged;
  - palette validation (accept, reject, messages);
  - sample stripping in the public payload;
  - categories isolation;
  - schema parity;
  - media upload stores URLs.
- **UI/UX Pro Max:** editor field, sample-badge and brand-tab IA review.

### Phase 3 — Theme asset pipeline + Magnific readiness

- **Objective:** everything needed to receive, prepare and serve the images, plus a verified Magnific connection.
- **Work:**
  - the resolver + `<ThemeImage>` + LQIP;
  - the manifest schema (including provenance fields) and its tests;
  - the Caddy immutable cache block;
  - the optimisation script (sharp-based, in a separate tooling folder, outside the runtime bundle);
  - **Magnific step E.3.2**: availability and capability check, plus the written prompt set from the draft matrix;
  - **one pilot generation** (`home-hero`) to validate the art direction and pipeline end to end.
- **Stop rule:** Magnific unavailable or unable to generate → the pilot doesn't run and I report per §0. The pipeline, resolver, tests and designed no-image states still ship, so no later phase is blocked.
- **Tests:** resolver; manifest completeness; weight budgets; CSP check (0 violations); the provenance schema is enforced.
- **UI/UX Pro Max:** art-direction definition; pilot review in context.

### Phase 4 — Theme 1 visual system, chrome, Brand Studio

- **Frontend:**
  - Theme 1 tokens and CSS;
  - **the Theme 1 `mapBrandPalette`**;
  - header, footer, mobile sheet, auth shell;
  - **Brand Studio**: the Worker analysis, the swatch UI, regenerate / adjust / accept / reset, and the live preview cross-fade;
  - wired into the **provisioning form** ("Logo & colours" + mini-preview), **the provisioning status page** (deferred persistence + retry card) and **the Website › Brand tab** (full preview).
- **Magnific production run (end of phase):** once the UI/UX Pro Max design review freezes the §E.2 matrix against the approved layouts, run **E.3 steps 3–8** for all 12 assets (generate → review → prepare → store → provenance). The same stop rule applies, and a gap is reported rather than substituted.
- **Tests:**
  - header and menu keyboard behaviour and focus trap;
  - RTL;
  - brand-matrix screenshots (12 palettes; §I);
  - Brand Studio component tests (states, overrides, validation messages);
  - Worker failure and timeout;
  - the deferred-persistence flow with retries.
- **UI/UX Pro Max:** visual system, chrome and Brand Studio UX; responsive and interaction review.

### Phase 5 — Theme 1 Home renderers

- **Objective:** sections C.1 #1–11 as Theme 1 renderers, including the empty, sample and live-data states and the brand slots.
- **Tests:**
  - each renderer with empty / typical / maximal fixtures;
  - live-data hiding rules (0 stats, fewer than 2 categories, no instructors);
  - sample-item exclusion on the public render;
  - carousel keyboard and aria;
  - count-up disabled under reduced motion;
  - the brand matrix on Home.
- **Visual check:** the Home matrix in EN/AR at 1440/1024/390, empty Academy vs rich Academy, under 4 brand palettes.
- **UI/UX Pro Max:** section-by-section design and review.

### Phase 6 — Theme 1 inner pages

- **Objective:** Courses (catalog renderer), Course Details (template redesign), About, FAQs, Contact, Coming Soon and 404.
- **Files:**
  - `CourseDetailsTemplate.tsx` split into composable parts a pack can arrange (existing data hooks unchanged);
  - Theme 1 renderers for `courseCatalog`, `contact`, `gallery`, `pageHeader`, `featureSplit` and `steps`.
- **Tests:**
  - catalog filters and URL state;
  - Course Details states (signed out / enrolled / free / paid) unchanged in behaviour;
  - contact form success and error;
  - gallery lightbox keyboard support;
  - the brand matrix on each page.
- **UI/UX Pro Max:** inner-page composition, interaction and responsive review.

### Phase 7 — Starter content & initialization

- **Backend:** `modern-education.template.ts` v2 (compositions, bilingual copy, asset refs, **sample testimonials**, **metric-only statistics**, CTA intents); the generation service handles assets, sample and provenance.
- **Frontend:**
  - the publish-warning dialog with the sample list;
  - the overview checklist;
  - editor preview samples for the live sections.
- **Tests (backend e2e and browser E2E):**
  - provision (Theme 1, complete) → composition correct → idempotent → Owner edits preserved;
  - logo chosen in the form → palette previewed → Academy created → logo + palette persisted from the status page → the website renders with the palette;
  - skip logo → theme default palette;
  - the sample chain end to end (§D.4).
- **UI/UX Pro Max:** copy and flow review.

### Phase 8 — Hardening & verification

- **Accessibility:** axe on every page state (0 serious/critical), keyboard walkthrough, landmark and heading audit, contrast, alt coverage.
- **Performance:** Lighthouse CI budgets (§I.1).
- **Responsive:** 360/390/768/1024/1280/1440/1920, in both EN and AR.
- **Asset QA:** all 12 Magnific assets verified in context, weights within budget, provenance complete.
- The **full brand-system suite** (§I).
- The **legacy-fixture verification for Decision 3**: every v1 content shape plus legacy colours under the new presentation, with no data written.
- Themes 2–5 pixel diff 0.
- Final UI/UX Pro Max design sign-off.

### Phase 9 — Release & production verification

- **Release order:** backend contracts/validation → frontend packs/renderers/Brand Studio → backend template v2. That way, no Academy is ever generated with a section type its frontend can't render. The optional provenance migration goes through the gated deploy.
- **Production checks:** the new Launch-verify journey renders a known Theme 1 Academy's public pages. It asserts:
  - no CSP violations;
  - no sample content or zero stats in public payloads;
  - theme assets immutable-cached;
  - the Academy's palette applied through Theme 1 tokens (CSS variables equal the persisted roles);
  - EN/AR desktop/mobile screenshots.
- **Existing Theme 1 academies** receive the presentation update only (§D.5), verified on a sample of real hosts.
- UI/UX Pro Max production visual QA.

---

## I. Testing strategy

### I.1 General layers

| Layer | What |
|---|---|
| Unit (FE) | Pack registry and fallback; `useReveal` + reduced motion; image resolver; live-data hiding rules; sample exclusion; count-up; carousel accessibility props |
| Unit (BE) | Schema acceptance of every legacy page shape; new types and fields; image validation; template v2 validates; generation config building (assets, sample, provenance) |
| Integration / e2e (BE, real Postgres + Redis) | Categories endpoint (published-only, public fields, 404, cross-Academy); generation idempotency and Owner-edit preservation; generation runs in the requester's RLS context; the public `pages` payload excludes sample items and never includes another Academy's data |
| Frontend/backend contract | Parity tests: frontend and backend Zod accept and reject the same fixture set; brand-engine golden vectors |
| E2E (browser, Playwright) | Provision → preview → publish → public site (EN/AR); catalog search/filter deep links; Course Details enrolment states; contact form; FAQ; mobile menu; sign in/up shells |
| Academy isolation | Two Academies with different themes, brands and courses: every public page and endpoint shows only its own data; theme assets identical and tenant-free |
| Visual regression | Screenshot matrix (themes × pages × locales × widths × empty/rich); Themes 2–5 pixel diff 0 |
| Accessibility | axe (0 serious/critical), keyboard-only walkthroughs, focus visibility, reduced motion, 200% zoom, RTL |
| Performance | Lighthouse CI on mobile: LCP ≤ 2.5s, CLS ≤ 0.05, INP ≤ 200ms, TBT ≤ 200ms; bundle budgets; image weight per page (Home ≤ 900 KB on first mobile load) |
| Theme initialization | New Academy × each of the 5 themes (Theme 1 v2; others unchanged) × both setup modes, with and without a logo |
| Regression (existing) | Current website, e2e and frontend suites stay green; legacy Theme 1 content and colour fixtures render (§D.5) |

### I.2 Brand-system suite (new)

| Case | Test | Level |
|---|---|---|
| Logo upload | The Owner picks PNG/JPEG/WebP/SVG ≤ 2 MB → analysis runs → preview updates; the file is rejected by type or size with a clear message | Component + Playwright |
| Colour extraction | Synthetic logos with known colours → the clusters contain them (ΔE_ok < 0.03) | Unit (Worker engine) |
| Candidate colour generation | Dominant / secondary / accent ranking and harmony-derived fillers for single-hue logos | Unit |
| Semantic palette generation | All 19 roles present, gamut-valid, deterministic (same input → same output), versioned | Unit + golden vectors (FE + BE) |
| Contrast validation | Every §F.4.4 pair meets its threshold for 500 randomised seeds (property-based) | Unit (FE + BE) |
| Inaccessible brand colour fallback | A neon yellow seed → `usage.accent = decorativeOnly`; the CTA is derived and passes; the report explains why | Unit |
| Extremely dark logo | Near-black mark → an "ink brand" primary; the accent comes from the theme or harmony; no black CTA on the ink band collision (band contrast rule) | Unit + screenshot |
| Extremely light logo | A pastel/white mark on transparent → primary deepened to pass; the pastel kept decorative | Unit + screenshot |
| Monochrome logo | Black/white/grey only → the `monochrome` flag; the theme-default accent hue; the Owner is prompted to pick a brand colour (optional) | Unit + component |
| Multi-colour logo | 5-colour mark → the correct top 3 by weight; distinguishable roles (ΔE ≥ 0.08) | Unit |
| Transparent logo | Alpha masked; semi-transparent fringe ignored | Unit |
| Noisy / background colours | A JPEG logo on a coloured or noisy rectangle → the border-ring background removed; JPEG noise clustered away | Unit |
| Manual colour override | The Owner changes the primary seed → roles re-derive live → saved; a failing per-role override is blocked with the nearest passing suggestion; the backend rejects a crafted failing override | Component + backend e2e |
| Regeneration | Cycles 4 deterministic alternatives; overridden roles are kept unless reset | Unit + component |
| Palette persistence | Confirmed palette saved; reload shows the same palette; legacy fields = seeds; the logo later changes → no overwrite, only a suggestion | Backend e2e + Playwright |
| Preview update | A palette change updates the CSS variables in the mini-preview and the full preview within one frame; reduced motion gives an instant swap | Playwright |
| RTL / EN | Brand Studio and the previews in EN and AR; swatch order and labels mirrored correctly; contrast reports localised | Playwright |
| Academy isolation | Academy A's palette never appears in B's config, pages or public payload; the palette endpoints enforce the Academy scope (403 cross-Academy); the logo MediaAsset stays in A's R2 prefix | Backend e2e |
| Two Academies, different palettes | Blue-logo A and orange-logo B published → each public site's CSS variables equal its own roles | Browser E2E |
| Same Theme 1, radically different brands | **Identity matrix:** 12 palettes (blue, orange, purple, neon yellow, pastel pink, near-black, monochrome, red ≈ error hue, teal, brown, multi-colour, no logo). Screenshots at 3 widths. Invariant checks: layout boxes identical to the reference palette (DOM geometry diff = 0), typography identical, background/surface chroma ≤ caps, brand appears only in defined slots (computed-style audit) | Playwright + automated audit + UI/UX Pro Max review |
| Malformed / malicious images | Truncated PNG, zero-byte file, 20000×20000 "decompression bomb", polyglot file, SVG with `<script>`/external refs/`foreignObject`, animated GIF/WebP, CMYK JPEG, wrong MIME extension, EXIF orientation. Expect: clean failure or safe result; the Worker is terminated on timeout; the main thread never blocks; no network request is initiated by the SVG (rasterised from a sanitised blob with no external resources); the backend never decodes logo pixels for analysis, and MediaAsset upload validation still applies | Unit + Playwright |
| Base mapping regression | Themes 2–5 variables identical to today for the legacy palettes | Unit + pixel diff |
| Theme 1 legacy colours | Old academies with no palette → accessible roles derived at render time; nothing written | Unit + e2e |

---

## J. Acceptance criteria — "Theme 1 is complete"

1. **Completeness:** a newly provisioned Theme 1 Academy (complete mode) has Home with 11 sections plus Courses, Course Details, About, FAQs and Contact, all populated, with no placeholder copy and no empty containers. The preview is full immediately after provisioning.
2. **Honest public site:**
   - no fabricated testimonials, instructors or numbers are ever public;
   - no statistic shows 0;
   - live sections with no data are hidden or show a designed state;
   - the sample-content warning appears before publish.
3. **Images:** every image slot has a designed asset; assets are self-hosted, versioned and provenance-recorded; designed no-image states exist; responsive `srcset`; zero CLS from images.
4. **Visual quality:** the UI/UX Pro Max design-review rubric passes (hierarchy, rhythm, type scale, CTA hierarchy, card quality, footer and navigation polish). It's clearly distinct from Themes 2–5 and intentional at 390, 1024 and 1440px in EN and AR.
5. **Motion:** hero entrance, reveals, card hover, carousels, count-up and accordion all work; `prefers-reduced-motion` disables every animation; only transform/opacity are animated; no autoplay.
6. **Responsive:** no horizontal overflow at 360–1920px; the mobile layouts match the plan (rails, stacked hero, sticky Course Details bar).
7. **Accessibility:** axe finds 0 serious/critical; complete keyboard operability; visible focus; AA contrast; correct landmarks and heading order; EN/AR alt text.
8. **Performance (mobile, fixture Academy):**
   - LCP ≤ 2.5s, CLS ≤ 0.05, INP ≤ 200ms;
   - Theme 1 JS ≤ 18 KB gzip over today on the public route;
   - no new third-party origins;
   - the CSP stays enforced with 0 violations.
9. **Editing:** every seeded element can be edited, reordered, hidden, deleted or replaced (including images) through the existing Page Editor in both languages. The new section types are available in "Add section".
10. **Multi-tenancy:**
    - public endpoints and renders show only the resolved Academy's data;
    - generation runs only in the requester's RLS context;
    - theme assets are tenant-free;
    - the isolation tests pass.
11. **Regression safety:** Themes 2–5 pixel-identical; every existing suite green; backend changes backward compatible (legacy pages parse unchanged).
12. **Architecture:** Theme 2 can be added without editing Theme 1 files, proved by a test pack.
13. **Automatic palette:** uploading an Academy logo produces a semantic brand palette automatically (≤ 500ms for typical logos on a mid-range laptop).
14. **Semantic application:** the palette is applied to Theme 1 only through `mapBrandPalette` semantic tokens. No component reads raw logo colours.
15. **No blind colours:** extracted colours are seeds only. Every role is derived and validated.
16. **Accessibility:** every §F.4.4 pair passes for every persisted palette (enforced on the backend). Brand-matrix pages pass axe with 0 serious/critical.
17. **Intelligent adaptation:** poor logo colours (neon, pastel, near-black, monochrome, noisy background) produce a usable, accessible palette, with the raw colour preserved as decorative where appropriate and the reason reported.
18. **Immediate preview:** after choosing a logo, the Theme 1 preview updates live in the setup form and in the Brand tab.
19. **Owner control:** accept, regenerate (4 alternatives), manual seed edits and per-role advanced overrides with live validation all work, plus reset to logo or theme default.
20. **Authoritative overrides:** a confirmed or overridden palette is never changed by a logo change, theme switch or algorithm upgrade without explicit Owner action.
21. **Theme identity:** across the 12-palette identity matrix, Theme 1's layout, typography, spacing and neutral canvas are invariant (automated geometry and style audit), and the brand appears only in defined slots.
22. **Reusable:** the engine, palette and Brand Studio are theme-agnostic. A test theme pack consumes the same palette through its own mapping.
23. **Isolation:** no Academy's logo, palette, assets or branding appear in another Academy's configuration, pages or public payloads (tests pass).
24. **Sample rule:** no sample testimonial ever reaches a public payload; the Owner is warned at publish; stats and instructors are always real data.
25. **Decision 3:** existing Theme 1 academies render with the new presentation and **zero data writes**; the legacy-fixture suite passes.
26. **Assets:** all 12 photographic assets are generated via Magnific, reviewed, optimised, versioned, with complete provenance. **Or**, if Magnific is unavailable, the gap has been reported and no substitute imagery was produced.

---

## K. Risks and architectural concerns

| Risk | Why it matters | Mitigation |
|---|---|---|
| Duplicated components per theme | Five copies of a course card drift apart | Themes compose **shared primitives**; a theme renderer is layout and style, not data logic |
| Hard-coded content in renderers | Copy stuck in code can't be edited or translated | Renderers contain no copy besides UI strings (i18n); all content is section data or live data |
| Theme ↔ section-type coupling | A theme-specific type breaks after a theme switch | Every type joins the shared catalog **with a base renderer** |
| Database coupling / schema limits | Deep theme-specific JSON makes migrations painful | Additive optional fields only; `themeVersion` / `template_version`; each new type has at most one repeatable list (the editor's limit) |
| Media coupling | Tenant uploads reused across Academies; disappearing assets | Theme assets are tenant-free, versioned and immutable; a manifest test guards against deletion; tenant media stays in its own R2 prefix |
| Theme-switch surprises | The Owner expects the new theme's layout | Look switches immediately; composition is a future, explicit, previewed, reversible action |
| No page-level drafts | Edits to a published site are live | Provisioning never publishes; a page draft model is a flagged future improvement |
| All pages in one public payload | Pages grow with rich content | Content is references, not bytes; the base64 upload fix; per-page fetch if payloads exceed 150 KB |
| Performance creep from motion | Every theme adds effects | CSS-first motion primitives, bundle budgets in CI, the LCP-safe hero rule |
| Live-data sections look broken on young Academies | Every theme has this problem | Shared hiding rules and designed empty panels in the base primitives |
| Existing Theme 1 sites change look on deploy | Customers see a redesign | Approved (Decision 3); legacy-fixture verification; zero data writes (§D.5) |
| Legal: fake reviews | Consumer-protection risk | Sample model with server-side stripping (§D.4) |

| Frontend/backend engine drift | Preview shows one palette, the backend validates or derives another | One spec, and a shared golden-vector suite in both repos, run in CI |
| Bad palettes from unusual logos | Real logos are messy | Deterministic rules, flags, the Owner review step, the 12-palette identity matrix plus property-based contrast tests; the Owner always has manual control |
| Brand overpowering theme identity | "A different website per logo" | Theme 1 mapping caps (neutral canvas, brand only in slots) and the automated identity audit |
| Performance of analysis | Large logos freezing the UI | Worker + downscale to 128px + 3s timeout; the main-thread fallback runs only on tiny images |
| Hostile images | Decoder exploits, SVG script, bombs | Browser sandboxed decode in a Worker; SVG sanitised and rasterised with no external resources; size and dimension caps before decode; the backend never decodes pixels for analysis |
| Logo lost if the setup tab closes | The Owner expects their logo saved | The Academy works with theme defaults; the Brand tab prompts; persistence is idempotent and retried |
| Colour-blind distinguishability | Roles that differ only in hue | ΔE_ok ≥ 0.08 between roles, and status colours always paired with icons |
| Magnific unavailable or unsuitable | Phase 3 blocked | The hard stop rule; designed no-image states keep other phases moving |
| Magnific output quality | AI artefacts (hands, text) | Candidate sets, the review checklist, in-context review, regenerate-not-retouch |
| Magnific output licensing | Redistributing generated images in a SaaS template | Record the license basis in provenance; you confirm the plan's commercial terms (§L.4) |
| Asset/design mismatch | Images generated before the layouts are final | Generate only after the Phase 4 design review freezes the matrix |
| UI/UX Pro Max unavailable | Required by your workflow | The phase gate stops design/QA work and reports; backend-only work continues |
| Legacy colours on existing Theme 1 sites look different | The render-time derivation adjusts inaccessible legacy CTAs | Intended (accessibility). No data written; the Owner can preview and confirm a palette in the Brand tab |

---

## L. Final recommendation

1. **What changes:**
   - Theme 1 presentation, chrome, compositions, starter content, imagery (via Magnific), motion;
   - the honest-data rules;
   - **a brand system that turns a logo into an accessible, theme-agnostic semantic palette**;
   - the upload fix.
2. **What stays:**
   - the data model and tenancy;
   - sections as typed data;
   - the template registry and idempotent generation;
   - bilingual routing;
   - one renderer;
   - the public APIs;
   - the provisioning request contract;
   - Themes 2–5 unchanged.
3. **What gets refactored:**
   - the ThemePack registry and dispatch;
   - `WebsiteThemeScope` → brand-palette mapping;
   - the Course Details composition;
   - media upload;
   - the colour utilities absorbed into the engine.
4. **What gets introduced:**
   - 4 shared section types and field extensions;
   - the categories endpoint;
   - the theme asset pack;
   - motion primitives;
   - the sample model with server-side stripping;
   - **the Brand engine + Brand Studio + `brand.palette` (no schema migration)**;
   - optional provenance columns.
5. **Why it supports Themes 2–5:**
   - composition, presentation, **brand application** and content are independent axes;
   - the brand palette is theme-agnostic and every theme maps it its own way;
   - adding a theme touches nothing in Theme 1.
6. **How Theme 1 becomes complete:**
   - rich compositions on every page;
   - real imagery;
   - a designed state for every data condition;
   - a brand-aware, accessible colour system that makes every Academy look like itself inside a recognisable Theme 1;
   - verified by screenshot, identity, accessibility, performance and isolation gates.

### L.4 Decisions

**Approved (recorded):**

| # | Decision | Approved rule |
|---|---|---|
| 1 | Theme image assets | Generated with **Magnific MCP** per §E.3, with the hard stop rule (no substitute service, no self-generated images) |
| 2 | Sample social proof | §D.4, end to end, with server-side stripping |
| 3 | Existing Theme 1 academies | Presentation update only; no content migration (§D.5). Refresh Starter Content is out of scope |

**Still needed from you:**

| # | Item | Why | Blocks |
|---|---|---|---|
| A | **Connect Magnific** to your Claude account (custom connector at https://claude.ai/customize/connectors), enable it for Claude Code, and **start a new session** | It isn't connected to this session | Image generation only (the Phase 3 pilot and the Phase 4 production run) |
| B | **Install UI/UX Pro Max** and start a new session | It isn't installed; your workflow requires it in every phase | The design/QA work of every phase (the phase gate) |
| C | **Confirm Magnific's output terms** on your plan allow commercial use and redistribution of generated images inside Atlas's product (every Theme 1 Academy serves them) | Legal basis recorded in provenance | Shipping the assets (Phase 3 → release) |
| D | **Approve the optional provenance columns** (`template_key`, `template_version`, additive migration) | Enables a future Refresh Starter Content; cheap now | Nothing (it can be skipped; I recommend including it) |

Phases 0–2 can start once you approve this plan: Phase 0's tool checks will simply report A/B if they're still open.
