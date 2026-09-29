# Theme 1 ("Modern Education") — Academy Website Redesign Plan

Status: **v2.1, approved for implementation (29 Sep 2026). Phases 0–4 complete and approved (§M–§Q). Phase 5 complete (§R), awaiting the Owner's approval; Phases 6–9 not started.**
Scope:
- Turn Theme 1 into a complete, launch-ready academy website that every Academy receives automatically.
- Build the architecture so Themes 2–5 can later get their own identity and page composition.
- Derive each Academy's website colours intelligently from its logo.

---

## Owner requirements added 29 Sep 2026 (v2.1)

These were added during Phase 4. They don't change the phase order (Phase 0 → 9) or merge any phases.

| Area | Requirement |
|---|---|
| §E.6 (new), §E.2, §E.3, §H | **Production image generation is deferred.** It runs only after the complete page composition is implemented and reviewed; the implemented website determines the final image requirements, never the other way round. |
| §C.0 (new), §C.2–§C.7 | **Every major public page gets a deliberate, premium hero/banner.** `pageHeader` alone isn't enough, and About in particular gets a large premium hero. |
| §H.1 (new), Phases 4–9 | **Phases are sequential and gated.** Each phase stops, reports and waits for explicit approval. The Phase 5 → 6 gate is spelled out. |
| §J | New acceptance criterion 27 (page heroes); criterion 26 follows the deferred image timing. |

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
| **Magnific MCP** | **Connected** (re-verified in Phase 0, §M.1). *Was "not connected" when v2 was written.* | Text-to-image models are listed, including photorealistic ones, plus upscaling. Read-only calls only; **nothing was generated.** | Asset **generation** (the Phase 3 pilot and the Phase 4 production run, §E.3) stops if it becomes unavailable, and I report this. **No other image service is ever substituted, and I never generate images myself.** Every other phase continues. **Also a Phase 3 gate:** the commercial-use / redistribution terms are verified and recorded before any production generation (§L.4 C). |
| **UI/UX Pro Max skill** | **Installed and loaded** (project-scoped at `.claude/skills/ui-ux-pro-max/`, re-verified in Phase 0). *Was "not installed" when v2 was written.* | Loaded through the skill tool; its search script runs. | Before each phase, I verify the skill is loaded. If it isn't, **I don't start** the phase's design/QA work and report instead. Pure backend work in the same phase (for example Phase 2 contracts) may proceed. |

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

### C.0 Page heroes on every major public page (Owner requirement, 29 Sep 2026)

Every major public page opens with a **deliberate, polished hero/banner** that reads as a real premium page hero and belongs to Theme 1.

- **Not enough:** a page title followed immediately by the next section. The presence of a `pageHeader` section isn't automatically sufficient.
- **Weak compositions get redesigned.** Don't keep a composition just because its section type already exists. If a section type can't carry the hero the page needs, the hero is redesigned. Any contract change this needs is surfaced before it's implemented.
- **Every hero has:**
  - a clear visual hierarchy with a large page title;
  - supporting copy where appropriate;
  - intentional spacing;
  - a deliberate visual treatment (photograph, brand composition or both);
  - a considered transition into the page's first section;
  - designed desktop, tablet and mobile compositions;
  - EN/AR with RTL mirroring.
- The exact composition varies by page.
- Image slots inside heroes follow §E.6: neutral placeholders until the final image stage.

| Page | Hero requirement | Phase |
|---|---|---|
| Home | The Home hero (§C.1 #1) | 5 |
| Courses | A designed catalog hero (title, supporting copy, search); not a bare title above the grid | 6 |
| Course Details | A proper course-detail hero consistent with the Theme 1 design system (category, title, summary, meta, rating when reviews exist, the course's own media, the purchase action) | 6 |
| About | **Especially important.** A large, premium hero/banner, not "About Us" followed by the next section. It needs a strong hierarchy, a large title, supporting copy, intentional spacing, a strong visual treatment and a clear transition into the Story section, with designed desktop/tablet/mobile compositions and EN/AR RTL. If the `about-header` concept isn't strong enough, it is redesigned. | 6 |
| FAQs | A designed hero with the question filter | 6 |
| Contact | A designed hero that leads into the contact methods and form | 6 |
| Coming Soon | An intentional Theme 1 hero/banner, not a generic system page. **Known constraint:** today this page renders before any website configuration is available (only the Academy's name and logo), so it can't know the theme or palette. Phase 6 surfaces the options, which need a backend change, before implementing. | 6 |
| 404 | An intentional Theme 1 hero/banner inside the Theme 1 chrome, not a generic system page | 6 |

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

- A designed catalog hero (§C.0) with search. The draft used `pageHeader` with no photo and `brand-shape-page`; Phase 6 confirms or redesigns it.
- `courseCatalog`: T1 renderer with category chips, sticky toolbar, mobile filter sheet, URL state, skeletons and a no-results state.
- `cta` → Contact.

### C.3 Course Details

Template redesign on the existing data:
- a proper course-detail hero (§C.0) with meta and rating (only when reviews exist);
- sticky purchase card on desktop, which becomes a sticky bottom bar on mobile;
- outcomes, requirements, curriculum accordion with preview, instructors, reviews and related courses.

Cards without thumbnails use the code-generated `course-fallback-pattern` in the Academy's brand colours.

### C.4 About

1. **A large, premium About hero (§C.0).** The draft was `pageHeader` with `about-header`; it is redesigned if that concept isn't strong enough. The hero must lead clearly into the Story section.
2. `featureSplit` with `about-story`.
3. `features` values.
4. `statistics` (live rule).
5. `instructors` (live rule).
6. `gallery` bento with `gallery-1…5`.
7. `cta`.

### C.5 FAQs

A designed FAQs hero (§C.0) with the question filter + `faq` (8 bilingual questions) + `cta` → Contact.

### C.6 Contact

A designed Contact hero (§C.0) + `contact` (method cards from Academy data, existing form, success state) + `faq` teaser.

### C.7 Other surfaces

- The auth shell uses `auth-side`.
- Coming Soon and 404 get intentional Theme 1 heroes/banners (§C.0), not generic system pages. The draft used `brand-shape-page` with no photo.
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

**This matrix is a planning reference, not the final generation request (§E.6).** It holds 12 images today. The final matrix (slots, ratios, crops, focal points, safe areas, count) is re-derived from the implemented website at the final image stage, and only then generated. Slots that the implementation adds or drops are added or dropped there.

### E.3 Magnific workflow (Phase 3), with the stop rule

*Timing: steps 1 and 3–8 run only at the final image stage (§E.6). Phase 3 ran step 2 and the `home-hero` pilot.*

1. **Freeze the matrix.** Re-derive it from the implemented, reviewed website (§E.6 steps 7–9), not from planned layouts.
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

### E.6 Production image timing (Owner requirement, 29 Sep 2026)

**Architectural and workflow requirement: the implemented website determines the final image requirements. Production imagery never determines the website layout.**

Planning the asset matrix during the design phases is fine (§E.2 is that plan, and §P.7 records the planned compositions). **Magnific production generation doesn't happen after the visual-design freeze or Phase 4.** It is deferred until the website's complete page composition has been implemented and reviewed.

**Workflow (in order):**
1. Complete the relevant website implementation phases (5 Home, 6 inner pages; 7 composition in the template).
2. Complete every Home and inner-page composition.
3. Complete responsive behaviour.
4. Complete EN/AR and RTL.
5. Complete the actual spacing, sizing, containers, section heights and image slots.
6. Review the complete website in context.
7. Audit every real image slot in the implemented UI.
8. Update and re-freeze the asset matrix from the actual implementation.
9. For every image, determine the final aspect ratio, crop, focal point, safe area and responsive behaviour.
10. Only then generate the production images with Magnific.
11. Review every generated image inside the actual implemented website.
12. Regenerate anything that doesn't work in context.
13. Optimise, version, archive (private master archive, §P.7) and verify the final approved assets.

**The final image audit (steps 7–9) covers, for every slot:**
- mobile, tablet, desktop and large desktop;
- EN, AR and RTL;
- image position and whether RTL moves it (the photograph itself is never mirrored);
- crop and focal point;
- text-safe and overlay-safe areas;
- visibility at each breakpoint;
- stacking and repositioning behaviour.

**Where it runs:** the **final image stage** is the first workstream of **Phase 8**, after Phases 5–7 are approved. It has its own checkpoint: the re-frozen matrix (the slot audit plus steps 8–9) is reported and approved **before** any generation. Every image then passes the §P.7 release gate.

**Until the final image stage:**
- zero new Magnific images and no production imagery from any other service;
- every image slot shows a neutral placeholder so the layout can be judged;
- the production matrix isn't finalised.

The released `home-hero` pilot (§P.6) stays archived. It isn't final production imagery if the implemented hero changes its slot, ratio, crop or composition; in that case the final stage regenerates it as a new version.

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
| 4 Visual system, chrome, **Brand Studio** | Planning the asset matrix (a reference, §E.6); typography scale, spacing, colour-slot mapping (§F.5), header, footer, mobile navigation, auth shell; the Brand Studio UX (swatches, badges, preview, error/loading states); interaction and motion specs; responsive design review |
| 5 Home renderers | Home hero (§C.0) and section-by-section component design, layout, hierarchy, motion, empty/sample states; design review of every section and of Home as a whole page at 390/768/1024/1440/1920 |
| 6 Inner pages | Every page hero (§C.0, About especially); catalog UX (filters, search, mobile sheet), Course Details layout and sticky purchase, About/FAQs/Contact composition, Coming Soon and 404; responsive and interaction review |
| 7 Starter content & initialization | Copy hierarchy and tone review (EN/AR); setup-form "Logo & colours" flow review; publish-warning dialog UX |
| 8 Hardening & verification | Final image stage (§E.6): the slot audit, the re-frozen matrix, in-context review of every generated image; full visual QA and responsive QA (matrix), accessibility review, motion review, brand identity review across the brand matrix; final design-review sign-off |
| 9 Release | Production visual QA on real hosts (EN/AR, desktop/mobile); post-release UX review of real Academy branding results |

### H.1 Phase gates (Owner requirement, 29 Sep 2026)

- Phases run **sequentially and are gated**. No phase is skipped, merged or started early.
- A phase is complete only when its work is **implemented and verified**, not when its files exist.
- At the end of each phase:
  1. **STOP**;
  2. report the phase results (recorded in this plan);
  3. **wait for the Owner's explicit approval** before starting the next phase.
- A phase's closing step (verify → record → commit) is part of the phase and is never dropped.
- Work that belongs to a later phase isn't started early, even as groundwork.

### Phase 0 — Baseline, harness, decisions, tool checks

**Status: done (29 Sep 2026) — results, measurements, audit and rubric in §M.**

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

**Status: done (29 Sep 2026) — results and engineering corrections in §N.**

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

**Status: done and approved (29 Sep 2026) — results in §Q.**

- **Frontend:**
  - Theme 1 tokens and CSS;
  - **the Theme 1 `mapBrandPalette`**;
  - header, footer, mobile sheet, auth shell;
  - **Brand Studio**: the Worker analysis, the swatch UI, regenerate / adjust / accept / reset, and the live preview cross-fade;
  - wired into the **provisioning form** ("Logo & colours" + mini-preview), **the provisioning status page** (deferred persistence + retry card) and **the Website › Brand tab** (full preview).
- **Magnific production run: deferred (§E.6).** Production images aren't generated in Phase 4. Phase 4 keeps the planning matrix with its planned compositions and adds the private master archive tool (§P.7). Generation happens at the final image stage (Phase 8).
- **Tests:**
  - header and menu keyboard behaviour and focus trap;
  - RTL;
  - brand-matrix screenshots (12 palettes; §I);
  - Brand Studio component tests (states, overrides, validation messages);
  - Worker failure and timeout;
  - the deferred-persistence flow with retries.
- **UI/UX Pro Max:** visual system, chrome and Brand Studio UX; responsive and interaction review.

### Phase 5 — Theme 1 Home renderers

**Status: done (29 Sep 2026), awaiting the Owner's approval — results in §R.**

- **Objective:** sections C.1 #1–11 as Theme 1 renderers, including the empty, sample and live-data states and the brand slots. The Home hero meets §C.0.
- **Images:** no production images. Every image slot shows a neutral placeholder (§E.6).
- **Scope:** Home only. No inner pages and no Phase 6 groundwork.
- **Tests:**
  - each renderer with empty / typical / maximal fixtures;
  - live-data hiding rules (0 stats, fewer than 2 categories, no instructors);
  - sample-item exclusion on the public render;
  - carousel keyboard and aria;
  - count-up disabled under reduced motion;
  - the brand matrix on Home.
- **Visual check:** the Home matrix in EN/AR at 1440/1024/390, empty Academy vs rich Academy, under 4 brand palettes.
- **UI/UX Pro Max:** section-by-section design and review.
- **Completion (Phase 5 → Phase 6 gate):** Phase 5 isn't complete just because the Home renderer files exist. It is complete only when all of the following are implemented **and verified**:
  - all Home sections;
  - responsive behaviour;
  - EN/AR;
  - RTL;
  - interactions and motion;
  - live-data behaviour and empty states;
  - accessibility;
  - tests;
  - the UI/UX Pro Max review;
  - visual verification.

  Then **STOP**, report the Phase 5 results and **wait for explicit approval**. Phase 6 doesn't start before that.

### Phase 6 — Theme 1 inner pages

- **Objective:** Courses (catalog renderer), Course Details (template redesign), About, FAQs, Contact, Coming Soon and 404, **each with its page hero per §C.0** (About especially).
- **Images:** no production images. Every image slot shows a neutral placeholder (§E.6).
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
- **Gate:** STOP, report and wait for explicit approval before Phase 7.

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
- **Images:** the template references theme-asset keys; they still show placeholders until the final image stage (§E.6).
- **Gate:** STOP, report and wait for explicit approval before Phase 8.

### Phase 8 — Hardening & verification

- **Final image stage (first workstream, §E.6):**
  1. review the complete website in context;
  2. audit every real image slot;
  3. re-freeze the matrix;
  4. **report the re-frozen matrix and wait for approval before any generation**;
  5. generate with Magnific;
  6. review every candidate in context, regenerating failures (the §P.7 release gate);
  7. optimise, version, archive and verify.
- **Accessibility:** axe on every page state (0 serious/critical), keyboard walkthrough, landmark and heading audit, contrast, alt coverage.
- **Performance:** Lighthouse CI budgets (§I.1).
- **Responsive:** 360/390/768/1024/1280/1440/1920, in both EN and AR.
- **Asset QA:** every asset in the re-frozen matrix verified in context, weights within budget, provenance complete, master archived.
- The **full brand-system suite** (§I).
- The **legacy-fixture verification for Decision 3**: every v1 content shape plus legacy colours under the new presentation, with no data written.
- Themes 2–5 pixel diff 0.
- Final UI/UX Pro Max design sign-off.
- **Gate:** STOP, report and wait for explicit approval before Phase 9.

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
26. **Assets:** every photographic asset in the matrix re-frozen from the implemented website (§E.6) is generated via Magnific **after** the full composition was implemented and reviewed, then reviewed in context, optimised, versioned and archived, with complete provenance. **Or**, if Magnific is unavailable, the gap has been reported and no substitute imagery was produced.
27. **Page heroes:** Home, Courses, Course Details, About, FAQs, Contact, Coming Soon and 404 each open with a deliberate Theme 1 hero/banner (§C.0), designed at mobile/tablet/desktop/large desktop in EN and AR. About has a large premium hero that leads into its Story section.

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

**Follow-up items (status as of 29 Sep 2026):**

| # | Item | Status | Blocks |
|---|---|---|---|
| — | **The v2 plan itself** | **Approved** as the implementation baseline. Engineering corrections are allowed; any material deviation from an approved product decision is surfaced before it's implemented | — |
| A | Connect Magnific | **Done** — connected and verified in Phase 0 (§M.1) | — |
| B | Install UI/UX Pro Max | **Done** — installed and loaded (§M.1) | — |
| C | **Magnific commercial terms**: confirm the plan's output terms allow commercial use and redistribution of generated images inside Atlas Academy websites | **Open — a Phase 3 gate.** Verified and recorded (in provenance) **before** any production generation. No images are generated before then | The Phase 3 pilot / Phase 4 production run |
| D | Optional provenance columns (`template_key`, `template_version`) | **Approved**, only if the architecture confirms they're useful when Phase 2 reaches them; additive, backward compatible, non-destructive, and no existing Academy data is rewritten | Nothing |

---

## M. Phase 0 results (recorded 29 Sep 2026)

Phase 0 is done. Nothing in the application, the database, existing Academy data or Themes 1–5 changed: the harness renders today's code through today's public runtime and records it.

### M.1 Tool verification

| Tool | Result |
|---|---|
| UI/UX Pro Max | Loaded through the skill tool (project-scoped, `.claude/skills/ui-ux-pro-max/`); `search.py` runs (Python 3.11). Used for this phase's audit, rubric and art-direction review (M.5–M.7). |
| Magnific MCP | Connected. Plan tier Premium+ with credits available; in this session generation consumes credits (unlimited mode doesn't apply here). Text-to-image is available, including photorealistic models (Seedream 5 Pro, Recraft V4.1, Google Nano Banana Pro), plus upscaling and image-editing tools. **Only read-only calls were made; no image was generated.** |
| Magnific commercial terms | **Not verifiable through the MCP** (it reports the plan tier, not licence terms). Remains the Phase 3 gate (§L.4 C). |

### M.2 What Phase 0 added

**Frontend (`atlas`), all dev/test-only:**

| Path | Purpose |
|---|---|
| `e2e/theme-baseline/fixtures/generated/*.json` | The website each theme's template generates for a new Academy (complete mode), exported by the backend's real generator. |
| `e2e/theme-baseline/fixtures/live-data.mjs` | Live Academy data for two states — `new` (just provisioned: no courses, zero stats) and `rich` (6 courses, 3 categories, 3 instructors, reviews, curriculum) — and the injectable brand palettes (`default` = what a new Academy stores; `orange`, `purple`, `neon-yellow`, `near-black` from the §I.2 identity matrix). |
| `e2e/theme-baseline/server/fixture-server.mjs` | Serves the fixture build and a fixture public API from one origin (like Caddy), gzip, with the **production CSP parsed from `Caddyfile`**. Flags any API call it has no fixture for. |
| `e2e/theme-baseline/{matrix.ts, support/, playwright.config.ts}` | The baseline matrix and harness (own config; no backend or database needed). Google Fonts served from a committed cache (`fixtures/fonts/`, OFL) for determinism. |
| `e2e/theme-baseline/screenshots.spec.ts` | Screenshot matrix (M.3). |
| `e2e/theme-baseline/axe.spec.ts` | axe baseline as JSON snapshots (M.4.1). |
| `e2e/theme-baseline/palette-injection.spec.ts` | Proves an injected palette reaches the renderer's CSS variables for all 5 themes, and that an unknown fixture resolves like an unknown host. |
| `e2e/theme-baseline/lighthouse/run-lighthouse.mjs` + `baselines/lighthouse.json` | Lighthouse baseline (M.4.2). |
| `.env.theme-fixtures`, `vite.config.ts` (fixture mode writes to `dist-theme-fixtures/`), `package.json` scripts, `.gitignore` | Build/run wiring. Production builds are unchanged. |
| Dev dependencies | `@axe-core/playwright`, `lighthouse` (approved; dev-only). |

**Backend (`atlas-backend`):** `scripts/export-website-template-fixtures.ts` + `npm run fixtures:website-templates` — runs the real `WebsiteGenerationService` against in-memory repositories (no database), deterministic output.

**Engineering correction (not a product change): the "dev-only fixture route".** Instead of adding a new route to the app, the harness uses the public runtime's existing development-only entry point (`?__atlas_academy_preview=<slug>`, honoured only when the build mode isn't production/staging). The fixture slug `fx--<theme>--<state>[--<palette>]` selects theme, data state and injected palette. This renders through the unmodified production path (`PublicWebsiteRouter` → … → `WebsiteRenderer` → `WebsiteThemeScope`), needs **zero application code**, and can't ship to production. Phase 1+ injects the full semantic palette through the same slug.

**How to run:**
```
pnpm theme-baseline:build
THEME_BASELINE_CHROMIUM=<chromium> pnpm test:theme-baseline            # compare
THEME_BASELINE_CHROMIUM=<chromium> pnpm test:theme-baseline --update-snapshots
THEME_BASELINE_CHROMIUM=<chromium> pnpm theme-baseline:lighthouse
(cd ../atlas-backend && npm run fixtures:website-templates -- ../atlas/e2e/theme-baseline/fixtures/generated)
```

### M.3 Screenshot baseline

- **327 full-page PNGs** (31 MB), `e2e/theme-baseline/__screenshots__/`:
  - 5 themes × `new` (Home, About, Courses, FAQs, Contact, Sign in, Sign up) and `rich` (Home, Courses, Course Details) × EN/AR × 1440/1024/390 = 300;
  - shared, theme-independent surfaces (404, Coming Soon) × EN/AR × 3 widths = 12;
  - Theme 1 Home under 4 brand palettes × 3 widths (EN) = 12;
  - first visit with the consent banner × 3 widths = 3.
- **Deterministic:** a second full run matched every snapshot (343/343 including palette checks).
- Every captured page had **no unmocked API call, no CSP violation, no off-origin request and no page error**.

### M.4 Baseline measurements

#### M.4.1 axe (axe-core 4.13, WCAG 2.0/2.1/2.2 A+AA + best practices)

216 cases (5 themes × 10 page-states × EN/AR × 1440/390, plus shared and brand cases). **212 of 216 have at least one serious violation; none are critical; none are clean.**

| Rule | Impact | Cases | Where / cause |
|---|---|---|---|
| `aria-prohibited-attr` | serious | 208 | Every themed page: the "Powered by Atlas" mark is a `<span aria-label="Atlas">` (`AtlasPlatformAttribution` → `AtlasLogo`). Shared component. |
| `page-has-heading-one` | moderate | 104 | About, Courses, FAQs, Contact in every theme, and the 404: no `h1` (page titles render as `h2`). |
| `color-contrast` | serious | 24 | Default blue: CTA band supporting text 4.49:1 (modern-education, premium-academy, corporate-learning Home, EN). Orange brand: CTA buttons and eyebrow 2.85:1. Purple brand: CTA band heading dark-on-purple 2.32:1. Near-black brand: CTA band text. Coming Soon: "Powered by Atlas" 3.2:1. |
| `landmark-one-main`, `region` | moderate | 8 each | Coming Soon (no `main` landmark). |

#### M.4.2 Lighthouse 13.5 (mobile, simulated throttling, median of 3, first visit, Chromium 141)

| Page | Theme 1 perf | LCP | CLS | TBT | Other themes (perf / LCP / CLS range) |
|---|---|---|---|---|---|
| Home, new Academy | 70 | 5.30 s | 0.016 | 58 ms | 69–73 / 4.58–5.35 s / 0.009–0.073 |
| Home, rich | 72 | 4.69 s | 0.016 | 28 ms | 69–72 / 4.56–5.37 s / 0.009–0.025 |
| Courses, rich | 72 | 4.69 s | 0.011 | 101 ms | 71–72 / 4.53–4.69 s / 0.009–0.012 |
| Course Details, rich | **49** | 5.41 s | **0.464** | 62 ms | 50–57 / 4.96–5.44 s / **0.235–0.481** |

- Accessibility 92–96, best practices 100, SEO 100 on every page.
- **Every public page ships ~560 KB of gzipped JS** (≈660 KB total transfer, 18–22 requests); FCP ≈ 4.2–4.4 s. The SPA paints nothing until the application bundle runs, which is why LCP ≈ FCP + ~0.3–1 s on every theme.
- Google Fonts were fetched live (through this environment's egress proxy). Lighthouse numbers are machine-dependent; compare only against a re-recording on the same machine.

**Against the targets (§I.1/§J.8):** LCP ≤ 2.5 s — **fails everywhere today**; CLS ≤ 0.05 — passes except Course Details (and corporate-learning Home at 0.073); TBT ≤ 200 ms — passes.

### M.5 UI/UX Pro Max audit of the current renders

Method: the skill's priority table (accessibility → touch → performance → style → layout → typography/colour → animation → forms → navigation), its UX guideline database (queries: empty states, placeholder content, heading hierarchy, touch targets, line length, sticky navigation, focus states, reduced motion, colour-only meaning, contrast; landing pattern "Hero + Testimonials + CTA"), reviewed against the M.3 screenshots and M.4 measurements. A "hero CTA" landing query had no database match after a retry, so that point uses the skill's built-in priority rules (labelled fallback). The skill's generic design-system output (fonts/colours) was **not** adopted: §B's approved direction governs.

Severity: **Blocker** = fails an accessibility or honesty rule; **Major** = clearly hurts comprehension/conversion; **Minor** = polish.

| # | Finding (Theme 1 unless noted) | Evidence | Severity | Addressed by |
|---|---|---|---|---|
| 1 | Brand colours are used raw as UI colours: orange CTAs/eyebrow 2.85:1; neon-yellow makes CTA labels, eyebrow, stat numbers and the CTA band unreadable; purple CTA band heading 2.32:1 | `brand/` snapshots + axe | Blocker | Brand engine + Theme 1 mapping (Phases 1, 4), confirms §A.5 |
| 2 | CTA band: heading uses the dark foreground on the brand fill while the body text is light; supporting text 4.49:1 even on the default blue | Home, all widths | Blocker | Phase 4/5 (ink band, §C.1 #11) |
| 3 | No `h1` on About/Courses/FAQs/Contact (all themes) | axe 104 cases | Blocker (a11y) | Phase 6 (`pageHeader` renders the page `h1`) |
| 4 | Public site shows fabricated-looking zeros: statistics "0 · 0 · 0" (AR mobile: Arabic-Indic zeros read as dots) | `new/home` | Blocker (honesty) | Phase 5 live-data rules (§C.1 #8) |
| 5 | Testimonials heading with nothing under it — in both new and rich Academies; Bold Creative shows two consecutive empty headed sections | `*/home` | Blocker (honesty/empty container) | Phases 5, 7 (§D.4) |
| 6 | Hero image slot is an empty tinted box at every width; on 390 it's a 4:3 empty block before the fold | `*/home--*--390` | Major | Phase 3/4 assets + §E designed no-image state |
| 7 | Empty states speak dashboard language ("Once content is added it will appear in this view") with no next step, on a public page | Featured courses, Instructors | Major | Phase 5 (designed empty panels, §C.1 #4, #7) |
| 8 | Course cards with no thumbnail collapse to a 32 px tinted strip with an icon (no aspect ratio); instructor fallback is a generic icon, not initials | `rich/home`, `rich/courses` | Major | `course-fallback-pattern`, `initials-avatar` (§E.2 B) |
| 9 | Course Details on mobile: the purchase card ("Sign in to enroll") sits after the reviews, near the page bottom; no sticky action | `rich/course-details--*--390` | Major | Phase 6 (§C.3 sticky bar) |
| 10 | Course Details layout shift CLS 0.24–0.48 (all themes) | Lighthouse | Major | Phase 6 + Phase 8 budget |
| 11 | LCP ≈ 4.6–5.4 s on mobile for every page; ~560 KB gz JS on the public route (see M.8 item 1) | Lighthouse | Major | Phase 8 (budget); see M.8 |
| 12 | Inner pages of a new Academy are one short section each (About, FAQs with 2 questions, Contact), leaving most of the viewport empty | `new/about`, `faqs`, `contact` | Major | Phases 6, 7 (§C.4–C.6) |
| 13 | Catalog has no category chips although the Academy has categories | `rich/courses` | Minor | Phase 6 (§C.2) |
| 14 | "Why {Academy}" is a half-width text block with an empty right column at 1440/1024; vertical rhythm is uneven (large, varying gaps) | Home 1440 | Minor | Phase 5 (`featureSplit`, 96/80/64 rhythm) |
| 15 | Mobile header truncates the Academy name ("Horizon Acade…") at 390 | 390 snapshots | Minor | Phase 4 (chrome) |
| 16 | The public mobile bottom bar offers "My Learning" and "Profile" to signed-out visitors | 390 snapshots | Minor | Phase 4 (chrome review) |
| 17 | Themes read as colour/case variations of the same page (e.g. Bold Creative vs Modern Education) | cross-theme snapshots | Minor for Phase 0 | Architecture (§F), later themes |
| 18 | Consent banner covers ~35 % of the first mobile viewport and uses the Atlas colour, not the Academy's | `shared/first-visit--en--390` | Minor | Out of Theme 1 scope — noted only |
| 19 | "Powered by Atlas" mark fails `aria-prohibited-attr` on every page, and 3.2:1 contrast on Coming Soon | axe | Minor impact, serious rule | Shared component — see M.8 item 2 |

What already works and should be kept: RTL mirroring of header, nav, footer and forms is correct; the catalog's search/filter/sort toolbar and the review summary are well structured; forms have visible labels; best-practices and SEO audits score 100.

### M.6 Review rubric (used by every later phase)

A phase passes design review when it has **0 open Blockers and 0 open Majors**; Minors are logged with an owner phase. Each review covers 1440/1024/390 × EN/AR, the `new` and `rich` states, and — from Phase 4 — the 4 brand palettes (Phase 8: all 12, §I.2).

| # | Area (skill priority) | Pass criteria | Blocker if |
|---|---|---|---|
| R1 | Accessibility (1) | axe 0 serious/critical on the phase's pages; every §F.4.4 pair passes; one `h1`, no skipped levels; visible focus on every control; keyboard-complete; alt text EN/AR; status never by colour alone | any of these fail |
| R2 | Touch & interaction (2) | WCAG 2.5.8 target size (≥ 24 px, primary mobile actions ≥ 44 px); hover and focus parity; no hover-only affordance | primary action below minimum |
| R3 | Performance (3) | measured against `baselines/lighthouse.json` on the same machine; no regression on untouched themes; Theme 1 budgets §G/§J.8; images reserve space (CLS from images = 0) | regression > 5 perf points or any CLS added |
| R4 | Theme identity & style (4) | §B invariants hold (layout, type scale, rhythm, radius/elevation, neutral canvas); brand only in the defined slots (§F.5) | brand colour on page background or body text |
| R5 | Layout & responsive (5) | composed at 1440/1024/390 (not just stacked); no horizontal overflow 360–1920; ≤ 65ch body lines | horizontal overflow |
| R6 | Typography & colour (6) | §B scale (display 64/56/40, titles 40/32/28, lead 18/17); only semantic tokens, no raw colours in components | failing text contrast |
| R7 | Motion (7) | §G only: transform/opacity, one-time reveals, no autoplay; `prefers-reduced-motion` gives the static final state; LCP headline never faded | motion without reduced-motion handling |
| R8 | Content honesty & states | no zero stats, no empty headed sections, no public sample content (§D.4); every live section has a designed empty state with a next step | any fabricated or empty public content |
| R9 | Navigation & conversion (9) | every section ends with a next step; primary CTA ≤ one tap on mobile; header/mobile sheet complete and predictable | primary CTA unreachable on mobile |
| R10 | RTL & bilingual | mirrored with logical properties; Arabic typography (line height, no clipped glyphs); no mixed-direction punctuation errors; EN/AR copy parity | broken RTL layout |
| R11 | Imagery (from Phase 3) | §E.3 step 4 checklist; focal point holds at every crop; works with every palette; no text/logos/identifiable brands | any checklist failure |
| R12 | Regression | Themes 2–5 snapshots unchanged; Theme 1 snapshot changes are intended and reviewed | unintended diff |

### M.7 Asset art-direction review (§E.2)

The matrix still matches the design: every raster slot in §C has one master, and every brand-coloured element is code (§E.2 B). The current renders confirm the need for each photographic slot (empty hero, half-empty "Why us", flat CTA band, empty-courses panel, one-section About, no auth imagery). **No change to the approved matrix**; these are refinements to carry into the Phase 3 prompts and the Phase 4 matrix freeze:

1. **RTL composition (important).** Photos are never mirrored (hands, writing, text direction), but the layout is: in AR the hero image sits on the left and the floating course-count chip moves with the logical end. `home-hero`'s "empty space top-right" must therefore become **clean negative space across the whole top band** (or the chip is anchored to the side away from the subject in both directions). Record the focal point so both LTR and RTL crops keep the subject away from the chip.
2. **Mobile crops.** `home-hero` goes 4:5 → 4:3 on phones (≈ 40 % of the height is lost): the subject's face and hands must sit in the central horizontal band. `about-header` 21:9 → 4:3 keeps only the centre third: the group must be centred.
3. **`home-cta` background.** The ink band is near-black with a 6 % brand hue (§F.5), so the photo's backdrop should be a **neutral** charcoal (no colour cast) with a soft falloff at the edge that meets the band, so it blends under every brand hue.
4. **Brand neutrality.** The brand matrix includes neon yellow, orange and purple: avoid strongly coloured props or clothing near the focal areas (plants, mugs, jackets), keep wardrobe neutral, and keep the low-saturation grade across all 12.
5. **No readable marks.** `courses-launching` (laptop lid, cup) and the screen-based shots must carry no logos or legible UI.
6. **Cultural range (EN + MENA).** Across the set: mixed genders and ages, modest attire represented, no alcohol, gestures that read well in both markets. `gallery-5` ("high-five") should also have a conservative alternative candidate (e.g. shared celebration at a laptop).
7. **Weight budget.** Today's Home is ≈ 660 KB total with no images; the §I.1 Home budget (≤ 900 KB first mobile load) leaves ≈ 240 KB for images at current JS weight, so the hero must stay within its 180 KB AVIF budget and below-the-fold images must lazy-load.

### M.8 Deviations, blockers and open items

1. **Performance target vs the current bundle (material, needs your decision before Phase 8).** Every public page loads ~560 KB gz of JS today, including dashboard code, and first paint is ≈ 4.4 s on throttled mobile. The plan's budget only limits what Theme 1 *adds* (≤ 18 KB), but its LCP ≤ 2.5 s target (§I.1/§J.8) is not reachable by Theme 1 work alone. Options for later: split the public runtime into its own entry/chunks (outside the plan's current scope), or restate the LCP target relative to this baseline. No change made.
2. **Shared "Powered by Atlas" accessibility fix.** The `aria-prohibited-attr` violation (every page, every theme) is in a shared component. The fix (e.g. `role="img"` on the labelled element) changes DOM, not pixels, but it is outside Theme 1 files. Recommended as a small, separate change; not made.
3. **Commercial terms for Magnific** remain the Phase 3 gate (§L.4 C).
4. **Provenance columns** (§L.4 D): approved; evaluated in Phase 2. Phase 0 needed no schema change.
5. **Fixture fidelity note.** `GET /auth/options` is answered `{ google: false }` (the backend's answer when Google sign-in is off for the Academy); auth-page snapshots therefore show the email/password form only.
6. **Repository size.** The screenshot baseline adds 31 MB; every deliberate Theme 1 re-record adds up to ~7 MB more to history.

---

## N. Phase 1 results (recorded 29 Sep 2026)

No visible change, as planned: the Phase 0 baseline re-ran **559/559 identical** (327 screenshots with zero pixel difference, 216 axe snapshots, 16 palette checks) on all five themes.

### N.1 What was built

| Area | Where | Notes |
|---|---|---|
| ThemePack registry and dispatch | FE `src/features/website/theme-packs/` | `pack.renderers[type] ?? BASE_RENDERERS[type]` in `SectionRenderer`; one module per redesigned theme (`packs/`); Themes 2–5 use the base pack; Theme 1's pack exists and redesigns nothing yet. |
| `mapBrandPalette` hook | `WebsiteThemeScope` → `pack.mapBrandPalette` | The base mapping is today's variables moved verbatim; a snapshot test recorded **before** the refactor (15 cases, 5 themes × 3 brands) proves byte-identical output. |
| Brand engine core | FE `src/features/website/brand-engine/` | OKLab/OKLCH, gamut mapping, WCAG contrast; logo analysis (mask, border-ring background, fringe, weighted k-means, classification, seeds, flags); role derivation (19 roles), the §F.4.4 validator, 4 deterministic alternatives, harmony score; `buildBrandPalette` produces the §D.2 shape. Not wired to any UI. |
| Backend mirror | BE `src/website/brand-engine/` | Derivation + validation only (no pixel analysis, §F.4.3). |
| Golden vectors | `__golden__/bp-1.golden.json` in both repos | 54 vectors: the §I.2 12-brand identity matrix × 4 alternatives, override cases, a different neutral cap. **Both repos reproduce all 54 exactly.** |
| Shared primitives | FE `src/features/website/primitives/` | `SectionShell`, `Heading` (+ highlight phrase), `Reveal`/`useReveal`, `Chip`, `EmptyPanel`. Unused until Theme 1 renderers (Phase 4+). |

### N.2 Tests and measurements

- **Brand engine (FE):** 98 tests — colour-space reference values; the §I.2 cases (neon, extremely dark, extremely light, monochrome, multi-colour, transparent, anti-alias fringe, solid and noisy backgrounds, manual overrides, regeneration, hostile/oversized buffers); **500 random seed sets × all four alternatives: every §F.4.4 pair passes and every built palette validates**; golden vectors.
- **Backend mirror:** 59 specs — the same golden file, the same 500-seed property run, and authority cases (crafted failing override, tampered role with a lying report, injection strings, unknown algorithm version).
- **Theme packs:** 7 tests, including a test pack that redesigns one section while every other type falls back (§J.12's "Theme 2 without touching Theme 1").
- **Primitives:** 11 tests (landmark naming, heading semantics, highlight in EN/AR, reveal under reduced motion / no IntersectionObserver / above the fold, chip toggle semantics, empty panel).
- **Speed:** a palette derives in ≈ 1–9 ms; a 128 px logo analyses in ≈ 75 ms in the test runner (budget: ≤ 500 ms end to end, §J.13).
- **Bundle:** the engine is in **no** public-route chunk; the main chunk grew by 952 bytes (pack registry and base-renderer adapters).
- **Suites:** frontend 1,309 unit tests pass (lint clean; the 34 pre-existing type errors and one pre-existing Vitest worker timeout are unchanged); backend 3,883 unit tests pass (2 suites can't start in this container because they look for the frontend at `../atlas-front` — identical on the untouched base).

### N.3 UI/UX Pro Max review of the primitives

Queries: reduced motion, compact label overflow, focus visibility, touch targets and spacing, empty states, reveal/stagger motion (a React-stack query returned no match; the UX-domain rules were used). Applied:
- `Reveal` never hides content that is already visible, and gives the final state under `prefers-reduced-motion` or without IntersectionObserver; content stays in the DOM for crawlers and assistive tech; 12 px rise, transform/opacity only, Atlas motion tokens.
- `Chip` labels never wrap; interactive chips are `<button aria-pressed>` with a visible focus ring and a ≥ 32 px target (WCAG 2.5.8 needs ≥ 24 px); callers keep ≥ 8 px gaps.
- `EmptyPanel` always has a visitor-language heading and an action slot (fixes the pattern behind §M.5 #7 once adopted).
- `Heading` separates semantic level from visual size (fixes the pattern behind §M.5 #3 once adopted), uses §B's type scale and balanced wrapping.
- `SectionShell` is a labelled landmark whose tones come only from theme variables.

### N.4 Engineering corrections (within approved decisions — surfaced, not silent)

1. **CTA boundary enforced during derivation.** §F.4.2 says the CTA label is white or ink, "whichever needs the smallest shift"; taken alone, that keeps a pastel or neon CTA with dark text, which contradicts §I.2 ("pastel → primary deepened to pass"; neon "preserved as accent… not used for text/backgrounds"). The engine therefore also requires the §F.4.4 `cta` vs `background` 3:1 pair while choosing the lightness. `ctaNeedsBorder` remains for Owner overrides that miss it.
2. **`primary`/`secondary`/`accent` overrides are seed overrides.** §D.2's `overrides: Partial<seeds & roles>` has three names that are both; per §F.4.5 (seeds edited by the Owner, other roles under "Advanced"), those three always re-derive their dependents. Seed overrides are also stored in `seeds`.
3. **Neon isn't "light".** §F.4.2 step 4's `L > 0.92 → light` would classify neon yellow (L ≈ 0.93) as a pale neutral and call the logo monochrome; `light` now also needs chroma < 0.1.
4. **Colours are integer HSL triplets**, matching the existing `HSL_TRIPLET_REGEX` in both repos; every contrast check runs on the rounded value that will be stored.
5. **Hover/pressed states are derived, not stored** (`deriveInteractionStates`), so the §D.2 shape is unchanged; the validator checks them. The chosen alternative is recorded in `report.variant`.
6. **Header/footer/auth-shell pack overrides moved to Phase 4.** The footer carries the platform attribution that no theme may remove; that extension point is designed with Theme 1's chrome so the guarantee is part of it.
7. **Primitives scope.** `ThemeImage` arrives with the asset resolver (Phase 3, as planned); carousel, rating, price and course-card parts are extracted from the working sections when Phases 5–6 first need them, rather than guessed now.
8. **Packs resolve synchronously.** The brand mapping is needed for the first paint; heavy renderer code will be split with `React.lazy` inside a pack.
9. **Theme-specific contrast pairs** (Theme 1's ink band, §F.4.4 last row) are tested with Theme 1's mapping in Phase 4; the engine checks the theme-independent matrix.


## O. Phase 2 results (recorded 29 Sep 2026)

Contracts, categories, media and brand data are in both repos. Every existing Academy is unaffected: legacy section shapes parse to exactly themselves, and the Phase 0 baseline re-ran **559/559 identical** (zero pixel difference on all five themes, axe unchanged).

### O.1 What was built

| Area | Where | Notes |
|---|---|---|
| Section contracts (§D.2) | BE `section-config.schemas.ts`, FE `website-section.schemas.ts`, `website-section.types.ts` | New types `pageHeader`, `courseCategories`, `steps`, `featureSplit`; extensions `hero.highlight/highlights/showSearch`, `features.layout`, `faq.maxItems/cta`, `cta.secondaryCta/image/imageAlt`, testimonial `rating`/`sample`. All additive and optional. |
| Image values (§E.4) | `image-value.util(s).ts` in both repos | Allowed: empty, `theme-asset:<theme>/<key>`, an Atlas MediaAsset path (`/api/v1/public/media/…`), absolute http(s), legacy `data:image/png|jpeg|webp;base64`. Everything else (`javascript:`, `data:text/html`, SVG data, `blob:`, other relative paths, `..`) is refused in every image field. |
| Schema parity | `__parity__/section-contracts-theme1.cases.json`, byte-identical in both repos | 49 accept/reject cases; each repo's suite asserts the same outcome against its own schemas. |
| Public categories | BE `GET public/websites/:id/categories`; FE `usePublicCourseCategories` | Only categories with a published public course, with counts, RLS-scoped. |
| Sample social proof (§D.4) | BE strip + `collectSampleContent`; FE renderer filter, editor badge/action, publish warning | Public pages payload is stripped before caching; publish returns `sampleContent`; the base testimonials renderer also filters on the public route and labels samples in previews; the section tree and item header show **Sample**; only "This is a real testimonial" clears the flag (text edits never do); the publish dialog warns ("Publish anyway") using the saved pages. |
| Brand palette persistence (§F.4.3/§F.4.6) | BE `brand/brand-palette-update.ts` | Inputs only; roles re-derived and validated server-side; legacy colours = seeds (both directions); server-stamped confirmation; `palette: null` removes it; the public read omits `confirmedBy`/`confirmedAt`/`extraction`. FE type `WebsiteBrandConfig.palette` (opaque in `@types`). No UI yet (Brand Studio is a later phase). |
| Provenance | BE migration `20261024000000_website_template_provenance` | Nullable `template_key`/`template_version` on `website_configurations`; stamped once on the first generation that creates pages; never rewritten; no backfill. **Production needs the gated `apply_migrations` deploy.** |
| Base renderers | FE `sections/{PageHeader,CourseCategories,Steps,FeatureSplit}Section.tsx`, `theme-packs/base-renderers.tsx` | Every theme can draw the new types. `courseCategories` is hidden publicly with < 2 categories (the preview explains why) and each tile opens the filtered catalog. Base support for `faq.maxItems/cta`, `cta.secondaryCta`, testimonial `rating` renders only when set. |
| Editor | FE field + metadata registries, EN/AR i18n | Fields for every new property and type; the four types appear in "Add section". |
| Media fix (§E.4) | FE `WebsiteImageField`, `AcademyBrandingForm` | Direct uploads go through `MediaAsset` and store the returned URL (with an uploading state and an inline error that keeps the previous value). The Academy logo is uploaded the same way. |
| Catalog URL state | FE `utils/catalog-url.utils.ts`, `CourseCatalogSection` | `q`, `category`, `level`, `pricing`, `sort`, `page`; public route only; `replaceState` (no history spam); other parameters kept; unknown values ignored; a shared page number is requested directly; a removable category chip. |

### O.2 Tests and measurements

- **Frontend:** 1,379 unit tests pass (new: parity 49, base sections 9, URL state 4, catalog/sample utils 4, image upload 2, editor sample 2). Typecheck: the same 34 pre-existing errors; lint and Prettier clean.
- **Backend unit:** 151 suites, 4,136 tests pass (including the two suites that read `../atlas-front`, run here against a local link to the frontend checkout).
- **Backend e2e:** website, public website, RLS, provisioning, media, communications — 30 suites, 317 tests, **green on two consecutive runs** (Postgres 16, Redis, s3rver in place of MinIO). Includes categories isolation, the public payload never containing `sample: true`, publish listing samples, palette accept/reject/strip, and the new contracts.
- **Migration:** `prisma migrate diff` against a shadow database shows no drift; the fixture exporter output is unchanged.
- **Theme baseline:** 559/559 (327 screenshots, 216 axe, 16 palette checks).

### O.3 UI/UX Pro Max review (editor fields, sample badge, publish warning, Brand tab IA)

Queries: helper text and inline errors, compact label overflow, confirmation dialogs, target size (WCAG 2.2), progressive disclosure (the last returned no specific match; general rules used). Applied:
- The "This is a real testimonial" action had a < 24 px target; it is now a ghost button with a ≥ 24 px minimum.
- The section-tree hint was hover-only (`title`); it is now screen-reader text inside the badge. Badges never wrap.
- Upload and category-filter feedback is inline and next to the control (`role="alert"` for upload errors); a failed upload never changes the value.
- The publish warning names the pages, explains the consequence (samples are hidden, not published) and uses a named action ("Publish anyway"), not "OK".
- Brand tab IA (for the Brand Studio phase): keep logo → proposed palette → preview → adjust → accept as one vertical flow; seeds editable up front, other roles under "Advanced"; contrast failures shown beside the offending role with the suggested value.

### O.4 Engineering corrections and scope notes (surfaced, not silent)

1. **MediaAsset URLs are relative.** Atlas stores `/api/v1/public/media/<key>` on purpose (one value works on every host). The first Phase 2 image validator would have refused these — breaking "Choose from library" and any page already holding one. Both validators now accept that exact path shape (no `..`, no query string); covered by the parity cases.
2. **Email logos.** Uploading the logo as a MediaAsset makes `academy.logoUrl` relative, which means nothing inside an email. `CommunicationBrandingService` now resolves a relative logo against the Academy's host (else the platform URL); absolute and legacy values pass through. Certificates already did this. Small change outside the website module, required so the logo fix doesn't break emails.
3. **Favicon stays as it was.** `.ico` isn't a MediaAsset type, so the favicon keeps its current upload; only the logo moved (as §F.4.3 specifies).
4. **Base renderers stay minimal.** Hero `highlight/highlights/showSearch`, `features.layout`, `cta.image` and `pageHeader.search` are stored and validated but drawn only by Theme 1's renderers (Phase 5). "An empty testimonials section renders nothing" is also a Theme 1 renderer behaviour, so Themes 2–5 stay pixel-identical.
5. **Pre-publish warning is computed client-side** from the saved pages (the frontend mirror of `collectSampleContent`), because the server's list arrives only after publishing; the publish response still carries the authoritative list.
6. **Templates don't mark samples yet.** Seeding `sample: true` testimonials is part of Theme 1's starter content (Phase 3); the whole chain is in place for it.

### O.5 Still open

- Deploy the provenance migration through the gated `apply_migrations` run.
- Magnific commercial-use and redistribution terms must be verified and recorded before Phase 3 production generation.
- The LCP 2.5 s target versus the current ~560 KB main bundle needs a decision before Phase 8.
- The shared "Powered by Atlas" ARIA fix (§M) is still pending.

## P. Phase 3 results (recorded 29 Sep 2026)

The asset pipeline is built, tested and served the production way, and the pilot (`home-hero`) ran end to end: generated with Magnific, reviewed, prepared, released as `modern-education/v1` and reviewed in context (P.6). The other 11 assets are the Phase 4 production run. Every section referencing a not-yet-released asset draws its no-image layout. The Phase 0 baseline re-ran **559/559 identical**.

### P.1 What was built

| Area | Where | Notes |
|---|---|---|
| Manifest + contract | FE `src/features/website/theme-assets/` (`theme-asset.types.ts`, `theme-asset.schema.ts`, `manifests/modern-education.manifest.ts`) | The 12 §E.2 A assets: ratio, master size, widths, focal point, EN/AR alt text, direction (subject and composition), byte budget, `status`. Zod enforces well-formed entries, and that a `released` entry has `version`, LQIP (≤ 300 B) and full provenance (generator, tool, model, exact prompt, seed/job id, date, reviewer, outcome, **license basis**, master sha256). All 12 were `pending` at build time; `home-hero` is now released (P.6). |
| Prompt set (§E.3.2) | `buildThemeAssetPrompt` + the manifest | Each prompt = the entry's direction + framing ratio + the theme's shared art direction (natural light, warm-neutral low-saturation grade, diverse adults incl. modest attire, negative space for UI) + exclusions (no text, logos, readable screens, watermarks, illustration style, real people, anatomy defects). The exact prompt sent is recorded in provenance on release. |
| Resolver + `<ThemeImage>` | `resolve-theme-asset.ts`, `ThemeImage.tsx` | `theme-asset:<theme>/<key>` → `<picture>` with AVIF/WebP `srcset` + `sizes`, intrinsic width/height (no layout shift), LQIP as a blurred background, focal point as `object-position`, lazy loading except the priority hero (`fetchpriority="high"`, eager). Pending/unknown → the section's fallback. Any other value renders the exact `<img>` sections always rendered (asserted byte-for-byte). |
| Sections | Hero (split and full-bleed), About, Gallery, Testimonials avatar, Page header, Feature split | Draw images through `<ThemeImage>`; with-image layouts switch on `hasRenderableImage`, so a pending asset never leaves an empty column or white text on no picture. Themes 2–5 can draw Theme 1's references too. |
| Version immutability | `released-versions.ts` | Released folders are listed; the test fails if one disappears, if a released entry points at an unlisted folder, or if an unlisted folder is served. |
| Delivery | `Caddyfile` `(theme_assets)`, imported by both site blocks; fixture server mirrors it | `/theme-assets/*` served same-origin with the security headers; `Cache-Control: public, max-age=31536000, immutable` **only when the file exists**; a missing file is an uncached 404 (never the SPA's `index.html`). CSP unchanged. |
| Preparation tool | `tools/theme-assets/` (own `package.json`/lock, `npm ci`; not in the app install or bundle) | `prepare.mjs` (sharp 0.35.5): reads sizes from the manifest; checks master size and ratio; auto-orients, converts to sRGB, strips metadata; writes AVIF q50 / WebP q75 at the manifest widths; LQIP ≤ 300 B; fails over budget; prints the master sha256 and the manifest fields; refuses to write into a released folder or overwrite a file. Kept out of the root pnpm install because sharp's install script would hit the Docker build's build-script policy. |

### P.2 Tests and measurements

- **New tests:** manifest contract per theme; exact §E.2 key set with one priority image; prompt contents; released-without-provenance and bad-ratio/width refusals; released files exist for every width × format and the ≤ 1200 w AVIF is within budget (runs per released entry); folder immutability; every `theme-asset:` reference in the exported templates names a manifest key; resolver output (srcsets, fallback, size, focal, LQIP, priority) and null cases; `<ThemeImage>` plain/released/pending rendering; the Caddyfile structure test extended (both site blocks import `(theme_assets)`, immutable only via `@found file`, no SPA fallback).
- **Caddy:** `caddy validate` (v2.10.2) passes on the real file (minus the Cloudflare DNS module, which stock Caddy lacks). Served locally: an existing asset → 200 + immutable + `image/avif` + `nosniff`; a missing one → 404 with no cache header; SPA routes unchanged.
- **Tool, end to end** (synthetic 2000×2500 master with EXIF): all 8 derivatives written; EXIF gone; sRGB; 1200 w AVIF 47.9 KB (budget 180 KB); LQIP 88 B; wrong ratio and overwrite refused.
- **CSP, real browser:** a released-style `<picture>` + LQIP served by the fixture server under the production CSP → **0 violations**; the browser chose the AVIF; immutable header present; missing file 404. (Staged locally, not committed.)
- **Suites:** frontend 1,394 unit tests pass (1,396 after the pilot release); the production build succeeds; typecheck at the 34 pre-existing errors; lint and Prettier clean. Backend unchanged this phase (its image validator already accepts `theme-asset:` references).
- **Baseline:** 559/559 (screenshots, axe, palette checks).

### P.3 Magnific readiness (§E.3.2) and the terms gate

- **Available:** the Magnific MCP is connected with text-to-image models (e.g. Seedream 5 Pro, Recraft V4.1, Nano Banana Pro); the account is on the **Premium+** plan with credits. Its "unlimited" mode does not apply in this session, so generations would consume credits.
- **Terms:** magnific.com is blocked by this environment's network policy, so the primary Terms of Use and usage-rights pages could not be read. Search summaries of Magnific's own docs say paid plans include a commercial license for AI output (tied to an active paid subscription at generation time), prohibit redistributing Magnific content as downloadable/editable files, and — for templates sold to others — require Magnific resources to be secondary elements, while another page says AI-generated content has no main/secondary restriction. Atlas ships the images as optimised rasters inside a SaaS theme used by many Academies, which is exactly the case these summaries disagree on.
- **First decision:** per the approved rule ("commercial use and redistribution rights must be verified and recorded before Phase 3 production generation"), generation was held and the question put to the Owner.
- **Owner decision (29 Sep 2026):** the Owner explicitly approved using Atlas's paid Magnific subscription to generate Theme 1's production assets and lifted the licensing gate. That approval, with the paid plan active at generation, is recorded as each asset's `licenseBasis`.

### P.4 UI/UX Pro Max review

- Art direction: a product-type query returned "claymorphism, playful colours" for education apps; not adopted — the approved v2 direction (photographic, calm, brand-neutral grade) stands, and changing it would be a product decision.
- Applied: descriptive alt text for content images (the theme's EN/AR alt is used when the section has none); responsive `srcset`/`sizes` instead of one large file; explicit dimensions to reserve space (Tailwind's `height: auto` keeps the section's aspect classes in control); only the LCP image loads eagerly.
- The in-context pilot review (3 widths × EN/AR × 4 palettes) waits for the pilot.

### P.5 Still open

- ~~Phase 4: freeze the matrix against the approved layouts, then generate the other 11 assets.~~ Superseded by §E.6: the other assets are generated at the final image stage, from the implemented website.
- Masters are not in the repo (§E.3 step 6): the pilot master is kept in the Owner's Magnific account (the generation record) and identified by its sha256 in the manifest. The private archive was chosen in Phase 4: see §P.7.
- Carried over: the gated provenance migration deploy, the LCP/bundle decision before Phase 8, the "Powered by Atlas" ARIA fix.

### P.6 Pilot: `home-hero` (29 Sep 2026)

- **Generation:** one call, 4 candidates, Google Nano Banana Pro at 4K, 4:5 (the plan's master ratio; this model supports it exactly), 150 credits each (600 total). The prompt is `buildThemeAssetPrompt` verbatim; a test asserts the recorded prompt equals it. Masters: 3712×4608 PNG, sRGB, no metadata.
- **Checklist review (§E.3 step 4):**

| Candidate | Result | Why |
|---|---|---|
| 1 | Rejected | A brand logo on the laptop lid |
| 2 | **Selected** | Natural hands (five fingers each, correct pen grip), natural face and eyes, unbranded laptop with the screen facing away, illegible notebook marks only, warm-neutral grade, modest attire, calm optimistic mood, clean negative space top-right |
| 3 | Passed, not chosen | Clean, but a flatter mood than the brief's "calm and optimistic" |
| 4 | Rejected | A brand logo on the laptop lid |

- **Preparation:** master cropped to 2000×2500 (≈ 0.7 %), sRGB, metadata stripped. AVIF: 480w 9.3 KB, 800w 18.2 KB, **1200w 31.9 KB** (budget 180 KB), 1600w 47.9 KB. WebP: 13.8 / 26.8 / 46.8 / 70.6 KB. LQIP 152 B. At 1200w the AVIF shows no banding or blockiness on skin or fabric.
- **Position:** the manifest's `focal` is applied as `object-position`. y = 76 % keeps both the face (y ≈ 0.39–0.60) and the writing hands (y ≈ 0.80–0.87) inside the 16:10 and 4:3 crops. The alt text now describes the chosen image (EN/AR).
- **In context:** Modern Education Home rendered with the hero set to `theme-asset:modern-education/home-hero` (temporary fixture change, reverted) at 1440 / 1024 / 390 px × EN / AR × the default palette plus orange, purple, neon yellow and near-black (30 renders). Result: **0 CSP violations**; the browser chose the 800w AVIF on desktop/tablet and the 480w on mobile; eager + `fetchpriority="high"`; locale-correct alt; the face and hands stay in frame in the current 4:3 hero box; the image isn't mirrored in RTL (correct); the neutral grade sits well with every palette.
- **Seen, not caused by the image (Phase 4 items):** white text on the neon-yellow CTA fails contrast (today's base colour mapping; Theme 1's brand-engine mapping replaces it); the cookie banner covers the lower half of the hero image at 390 px; the current hero box is 4:3 at every width, while §E.2 plans 4:5 on desktop, so the top-right negative space is only used once Theme 1's hero renderer lands.

### P.7 Phase 4 additions: frozen compositions, master archive, release gate (29 Sep 2026)

Added at the Owner's request during Phase 4. **Status after the Owner's 29 Sep 2026 decision (§E.6): the compositions below are a planning reference only.** The final matrix is re-derived from the implemented website at the final image stage. The archive tool and the release gate still apply.

**Frozen compositions.** Every manifest entry now has a `composition` (schema-required and tested): target slot, crop per breakpoint (desktop ≥ 1024, tablet 768–1023, mobile < 768), safe area, overlay exclusion zone and RTL behaviour. The pending entries' `direction`, and so their prompts, now spell out the safe area. `home-hero`'s image, direction and recorded prompt are unchanged; only its composition metadata was added. Rules that apply to every asset:

- Text never sits on a photo. Headings, chips and CTAs go beside, above or below the image. The one overlay is the Home hero's course-count chip, which floats over the photo's top corner at the logical end.
- Photos are never mirrored in RTL. The layout mirrors; the image doesn't. People must never face out of the frame on either side.
- Each master's aspect ratio is its desktop crop. Other breakpoints crop with `object-fit: cover` around the manifest `focal`, so subjects stay inside the stated safe area.

| Asset | Slot | Master | Desktop / tablet / mobile | Safe area; exclusion zone |
|---|---|---|---|---|
| home-hero (released) | Home hero, 55/45 image column | 4:5 | 4:5 ~560px / 16:10 full / 4:3 full | Face and hands y 0.39–0.87 inside the central 80%; top 22% band clear for the chip (top-right EN, top-left AR) |
| home-benefit | Home featureSplit, image at logical start | 4:3 | 4:3 ~600px / 4:3 ~45vw / 4:3 full | Both faces and the screen inside the central 76% × 80%; no overlay |
| home-cta | Home ink CTA band, logical end, bottom-aligned | 3:4 | 3:4 ~320px / 3:4 ~280px / hidden < 480px | Head and notebook inside the central 60% width, top 75%; outer 15% and bottom edge plain near-black so it blends into the band on either side |
| courses-launching | Featured-courses empty state, above the text | 16:9 | 16:9 at every size | Arrangement inside the central 70% × 76% |
| about-header | About band under the title | 21:9 | 21:9 full / 16:9 full / 4:3 full | Group inside the central third (the 4:3 phone crop keeps only that), middle 70% of the height |
| about-story | About featureSplit, logical start | 4:3 | 4:3 at every size | Team inside the central 76% × 80% |
| gallery-1 | Bento 2×2 tile | 4:3 | 1:1 / 1:1 / 4:3 | Action inside the central 75% width |
| gallery-2 | Bento 2×1 tile | 4:3 | 2:1 / 2:1 / 4:3 | Face and hands in the middle 66% of the height |
| gallery-3, -4, -5 | Bento 1×1 tiles | 1:1 | 1:1 at every size (about half width on mobile) | Subject inside the central 80% |
| auth-side | Auth side panel, logical end | 3:4 | 3:4 up to 580px / hidden / hidden | Learner and lamp inside the central 70% × 80%; dark, plain corners |

**Private master archive.** `tools/theme-assets/archive-master.mjs` has two commands:

- `npm run archive-master` stores each released master with a `provenance.json` in a private S3-compatible bucket at `<theme>/<version>/<key>/`. The provenance records the prompt, model, seed, Magnific generation ID, generation date, version, licence basis, alt text, focal point, sha256, size and reviewer.
  - The provenance is read from the manifest, which is the single source.
  - A master whose sha256 isn't the recorded one is refused.
  - Nothing is ever overwritten: the tool checks HEAD first, then writes with `If-None-Match: *`. An object that is already there must match byte for byte.
  - Every write is read back and its checksum compared.
  - The tool refuses to use the app's public media bucket.
- `npm run verify-archive` checks that every released entry is archived with the recorded checksum.

Verified against a local S3 server:

- A wrong master was refused.
- Archiving worked, and a second run was idempotent.
- A conflicting provenance was refused (no overwrite).
- Verify reported missing objects before archiving and ok afterwards.
- Using the media bucket was refused.

**Still needed (Owner):** a private R2 bucket `atlas-theme-sources`, with no r2.dev or custom domain, plus an API token scoped to that bucket only (Object Read & Write), stored outside the repo. Until it exists, archival is not complete. The masters then live only in the Magnific account and this session's scratchpad (ephemeral), so the bucket should exist before this session ends. After that, `home-hero` and every new release are archived, and `verify-archive` runs before each release commit.

**Release gate (all 11 assets, same as home-hero).** Each candidate is checked for:

- no logos or branding;
- no readable or fake text, UI-like text or watermarks;
- natural hands, faces and eyes;
- culturally suitable people, clothing and setting;
- composition, focal point and the frozen safe area and exclusion zone;
- LTR and RTL placement;
- desktop, tablet and mobile crops (rendered in context);
- full-resolution quality;
- AVIF/WebP budgets;
- EN/AR alt text describing the chosen image;
- 0 CSP violations;
- the exact prompt, provenance and checksum recorded;
- an immutable versioned path, archived.

A failed candidate is rejected and regenerated. It is never released just because generation succeeded.

**Tooling change.** `prepare.mjs` used to refuse the whole `modern-education/v1` folder once `home-hero` was released. It now refuses only an entry already released at that version, and still never overwrites a file. New keys can join `v1`, and released files stay immutable.

## Q. Phase 4 results (recorded 29 Sep 2026)

Commits:
- `48b29c5` — visual system, brand mapping, chrome;
- `59489ba` — Brand Studio;
- `2c0da3e` — planning compositions and private master archive;
- the Phase 4 completion commit — these results and the v2.1 plan requirements.

### Q.1 What was built

- **Theme 1 visual system (P4.1).** `src/features/website/modern-education/`:
  - `modern-education.css`: type scale, rhythm, radius, elevation, motion, header and nav-link styles. Everything is scoped to `[data-theme-pack='modern-education']`, and no colours are declared in CSS.
  - `mapModernEducationBrandPalette` (§F.5):
    - the stored palette, else one derived from the legacy seeds (an unusable seed falls back to the theme default);
    - the canvas capped at chroma 0.012;
    - a hairline divider plus a separate 3:1 input border;
    - the ink band (near-black carrying the brand hue) and its CTA;
    - the chip composite, icon tile, shape and highlight slots;
    - `--primary`/`--ring` mapped to cta/focus, and the base variable names mapped to safe roles.
- **Chrome (P4.2).**
  - A new `ThemePack.chrome` slot (Header, Footer, AuthFrame).
  - **Header:** sticky, transparent → solid on scroll, `aria-current`, a mobile sheet from the logical end, and Sign in shown next to the CTA slot.
  - **Footer:** link groups, live categories, the Academy's contact details, `<details>` groups on mobile, and the platform attribution row rendered through a prop that no theme can drop.
  - **Auth frame:** the `auth-side` panel on desktop (ink band + glow until the image is released).
  - `MobileBottomNav` account tabs.
  - The Themes 2–5 chrome is unchanged.
- **Brand Studio (P4.3).** `src/features/website/brand-studio/`:
  - **Logo intake:** type sniffed from the file's bytes, dimensions read from the header before decoding, size limits, SVG rebuilt from a whitelist, a sha256 fingerprint.
  - **Analysis:** runs in a Worker with a 3s timeout and a main-thread fallback; SVGs are rasterised on the main thread.
  - **Draft state:** regenerate, seed edits, per-role overrides, "apply suggestion" repeated until every pair passes, accept, and reset to logo or theme default.
  - **Live preview:** cross-fades in 180ms (instant under reduced motion).
  - **Wired into:**
    - the provisioning form (`SetupBrandStudio`);
    - the provisioning status page and onboarding (`FinishBrandingCard`, deferred persistence retried at 1s/2s/4s);
    - Website › Brand (full preview, dark-logo field).
- **Asset planning (P4.4).**
  - Every manifest entry got a planning `composition` (schema-required).
  - `tools/theme-assets/archive-master.mjs` stores masters privately: never overwrites, verifies each write by reading it back, and refuses the public media bucket.
  - Production generation was **deferred** by the Owner (§E.6), so these compositions are a planning reference only (§P.7).

### Q.2 Verification (P4.5, run on the Phase 4 tree = `2c0da3e` + plan edits)

| Check | Result |
|---|---|
| Frontend unit suite | **152 files, 1474 tests passed** |
| Typecheck | 33 errors, all pre-existing (unchanged since Phase 0; none in Phase 4 files) |
| Lint | clean (`eslint --quiet ./src`, exit 0) |
| Theme baseline (fixture build, production CSP) | **559/559 passed**: screenshots for 5 themes × pages × EN/AR × 1440/1024/390, the 4-palette brand matrix, axe and palette injection |
| Themes 2–5 pixel identity | No Themes 2–5 screenshot has changed since the Phase 0 baseline (`7382baf`); the run matched every one. The Phase 4 re-record (`48b29c5`) touched only Theme 1 snapshots and the Theme 1 first-visit (consent-banner) snapshots. |
| Palette injection guard | passed (hostile palette values can't escape the theme scope) |
| Phase 4 tests named in §H | header keyboard, focus trap, Escape and RTL (`modern-education-header.test.tsx`); brand mapping over the 12-brand matrix (`modern-education.brand-mapping.test.ts`); Brand Studio states, overrides and validation (`brand-studio.test.tsx`, `use-brand-studio.test.tsx`); Worker failure and timeout (`logo-analysis.test.ts`); hostile logo files (`logo-file.test.ts`); deferred persistence with retries (`deferred-branding.test.tsx`) — all pass |
| Browser checks during Phase 4 | Worker analysis in Chromium (17ms, correct seeds); a hostile SVG made zero requests; archive tool round-trip against a local S3 server (§P.7) |

**Accessibility (axe, Theme 1, recorded state).** Serious findings remain; none are critical.
- `aria-prohibited-attr`, 48 page states: the footer attribution row. This is the carried-over "Powered by Atlas" ARIA fix.
- `color-contrast`, 12 page states, all on **Home**: the **base** CTA band's title/description (white on the brand fill). Phase 5's Theme 1 ink band replaces it.

Before Phase 4, Theme 1 brand pages had 4–5 contrast nodes each; they now have 1. §J.7's zero target is met in Phase 8, not Phase 4.

### Q.3 UI/UX Pro Max review (Phase 4)

- Visual system, colour slots and chrome reviewed against the §M.6 rubric: the canvas stays neutral for every brand, and the brand appears only in its slots (CTA, link, focus, chip, icon tile, ink glow).
- Header: 44px targets, a visible focus ring on every control, and the sheet opens from the logical end.
- Brand Studio: contrast badges carry text rather than colour alone; error and slow states are designed; reduced motion is respected.
- Found and fixed during review:
  - Sign in was hidden when a CTA was configured;
  - "apply suggestion" fixed only the first failing pair;
  - the hairline border was too heavy;
  - hex legacy colours threw in the mapping.

### Q.4 Process deviation during Phase 4 (surfaced, corrected)

- After the Owner resequenced image production (29 Sep 2026), I dropped this closing step (P4.5) and started Phase 5 and Phase 6 work without the phase gates:
  - Home renderers;
  - page heroes, FAQ, contact, gallery;
  - a refactor of the shared catalog.
- None of it was committed. On the Owner's instruction it was **removed completely**: the working tree was restored to `2c0da3e`, and the 11 new files and 3 modified files were discarded.
- The Owner's requirements were then written into this plan (v2.1: §C.0, §E.6, §H.1, Phases 4–9, §J.26–27).
- Phase 4 was then closed properly (this section). **No Magnific image was generated at any point after the Phase 3 pilot.**

### Q.5 Still open (carried forward)

- The footer attribution-row ARIA fix ("Powered by Atlas"), still due as a small Phase 5 item.
- The base CTA band's contrast on Theme 1 Home: resolved by the Phase 5 ink band.
- The Brand tab's "logo changed elsewhere" suggestion (§F.4.6): not built in Phase 4; still to be scheduled.
- **The private master archive bucket:** the Owner must create it (§P.7). Until then, archival isn't complete and the `home-hero` master exists only in the Magnific account.
- The gated provenance migration deploy; the LCP/bundle decision before Phase 8.
- The cookie banner covers part of the mobile hero: out of scope, noted.
- **The 12-palette brand screenshots.** §H Phase 4 lists "brand-matrix screenshots (12 palettes)". Phase 4 has 4 palettes as screenshots plus the full 12-brand matrix as automated mapping tests (roles, contrast, invariant canvas). The 12-palette screenshot matrix is scheduled with the Home renderers (Phase 5 "brand matrix on Home") and the full brand suite (Phase 8).

## R. Phase 5 results (recorded 29 Sep 2026)

Scope: Home only (§H Phase 5). No inner-page composition, page hero or Phase 6 groundwork. No production images: every unreleased slot shows the neutral placeholder (§E.6). No Magnific call.

### R.1 What was built

**Theme 1 Home renderers.** `src/features/website/modern-education/`, registered in `modern-education.pack.ts`:

| §C.1 | Type | Renderer | Behaviour |
|---|---|---|---|
| 1 | `hero` | `T1Hero` | Home hero (§C.0): eyebrow chip, display h1 with the highlight marker, lead, primary + secondary action, catalog search (opens `/courses?q=`, locale- and preview-aware), ≤ 4 highlight chips, photograph on the brand shape, live course-count chip (only when > 0). Orchestrated entrance; the h1 is never animated. Without an image it becomes a centred text hero (the v1 Home). |
| 2 | `features` (`strip`) | `T1Features` | Soft band, icon tiles, sr-only heading. The same renderer draws `cards` (used by the v1 Home's "What you get"). |
| 3 | `courseCategories` | `T1CourseCategories` | Live tiles → filtered catalog, "Browse all". Hidden publicly with < 2; the preview explains. |
| 4 | `featuredCourses` | `T1FeaturedCourses` + `T1CourseCard` | Image-led cards (thumbnail or brand-tinted `course-fallback-pattern`), "View all". Empty state: "Courses launching soon" with the `courses-launching` slot and a Contact link. |
| 5 | `featureSplit` | `T1FeatureSplit` | Image at the logical start/end on `brand-shape-soft`, numbered benefits, link CTA. |
| 6 | `steps` | `T1Steps` | Ordered list with a per-step connector (vertical on phones, horizontal from 768px); no connector for 5–6 steps. |
| 7 | `instructors` | `T1Instructors` | Derived from the catalog with course counts and initials avatars. Hidden publicly when there are none; the preview explains. |
| 8 | `statistics` | `T1Statistics` | Live metrics only when > 0, hidden with < 2. Count-up ≤ 900ms once; final value at once under reduced motion; screen readers get the final number. |
| 9 | `testimonials` | `T1Testimonials` | Large-quote carousel: arrows, dots, keyboard arrows (RTL-aware), no autoplay, instant under reduced motion. Sample items never public (second guard after the API); "Sample" badge in previews. |
| 10 | `faq` (`maxItems`) | `T1Faq` | Teaser split (heading + "See all questions" / first N questions). Without `maxItems` it's the plain list; the FAQs-page hero and filter are Phase 6. |
| 11 | `cta` | `T1Cta` | The ink band with the brand glow. Photo at the logical end, standing on the band's lower edge; hidden under 480px. Replaces the base CTA band, which failed contrast on Theme 1. |
| — | `about` | `T1About` | The v1 text block existing Theme 1 Homes carry (Decision 3). |

**Shared parts** (`t1-parts.tsx`):
- section frame and header;
- highlight heading;
- media frame with the neutral placeholder (named `key · ratio` outside production builds);
- actions and links (inert in previews);
- brand shapes;
- initials avatar (the contrast-checked chip pair).

**Theme 1 CSS** (all scoped): type, rhythm, same-tone gap collapse, cards and hover lift, rails, connector, ink band, entrance, full reduced-motion coverage.

**Cross-cutting changes:**
- **i18n:** `website:theme1.*` in EN and AR, with Arabic plural forms.
- **Chrome:** a theme footer now gets the mobile bottom-bar clearance *after* the footer, so the last band meets the footer. Base-footer themes are unchanged.
- **Carried-over accessibility fix:** `AtlasLogo` no longer puts `aria-label` on a generic span. The attribution mark is decorative, because the name is written beside it. This is pixel-neutral and removes the `aria-prohibited-attr` serious finding from every page of every theme.

**Scope note: renderers are per section type.** A Theme 1 renderer draws its type wherever the type appears, not just on Home. So the FAQs page's `faq` list and the v1 About page's `about` block now use the Theme 1 look. Their page heroes and composition remain Phase 6.

**Verification fixture (not provisioning).** `e2e/theme-baseline/fixtures/theme1-home.mjs` is the §C.1 composition with EN/AR copy.
- It's selected by the slug segment `--c1`.
- The fixture palettes gained the rest of the §I.2 identity matrix.
- Provisioning still creates the v1 Home until Phase 7 moves this composition into the backend template. Both Homes are covered by the baseline.

### R.2 Home image slots as implemented (reference for the final image stage, §E.6 — not a frozen matrix)

| Slot | Desktop ≥ 1024 | Tablet 768–1023 | Phone < 768 | Overlay / safe area | RTL |
|---|---|---|---|---|---|
| `home-hero` (released pilot; not final per §E.6) | 4:5, ≈ 560px column beside the text (right in EN) | 16:10, ≤ 672px, centred under the text | 4:3, full width under the text | Course-count chip over the top logical-end corner (≈ 25% of the width, top 20%); brand shape behind from 640px | Moves to the left; the photo isn't mirrored |
| `home-benefit` | 4:3, half-width column (≈ 560px) | 4:3, ≤ 672px, above the text | 4:3, full width, above the text | None; brand block offset behind toward the page edge (≥ 640px) | Column moves; photo not mirrored |
| `courses-launching` (empty state only) | Left half of a split card; height follows the text (≥ 18rem), so the crop is ≈ 16:10–2:1 | Same (split from 768px) | 16:9, full card width, above the text | None | Half moves to the right |
| `home-cta` | 3:4, 320px, at the logical end, standing on the band's bottom edge (top corners rounded) | 3:4, 256px, same placement | 480–767px: 3:4, 240px, centred under the text, on the bottom edge; < 480px: hidden | Band background around it; photo edges meet the ink band | Moves to the left; photo not mirrored |

No new photographic slots were needed. The planned `home-cta` "below the text on tablet" became side by side from 768px, because it fits and keeps the band shorter.

### R.3 Verification

| Check | Result |
|---|---|
| Unit tests | **153 files, 1505 tests passed** (quiet-machine run; an earlier run concurrent with Playwright had 4 load timeouts in unrelated files, which pass alone) |
| New Phase 5 tests (`theme1-home-sections.test.tsx`, 30 cases) | every renderer's empty, typical and maximal state; hiding rules; sample exclusion; carousel ARIA, buttons, dots, keyboard LTR/RTL, no autoplay, reduced motion; count-up final value in Arabic-Indic digits; placeholders; hero search (EN and `/ar`); h1 not animated |
| Pack test | Theme 1 registers exactly the 12 Home types; Themes 2–5 still register none |
| Typecheck | 33 errors, all pre-existing (none new) |
| Lint | clean |
| Theme baseline | **614/614 passed** against the committed snapshots (screenshots, axe, palette injection, production CSP) |
| Themes 2–5 | **no screenshot changed** (with reduced motion now on for every capture). Their axe snapshots changed only by removing `aria-prohibited-attr` (160 removals; 72 page states now have zero violations). |
| Theme 1 re-recorded | v1 pages and first-visit (new renderers); new: §C.1 Home new/rich × EN/AR × 1440/1024/390; brand matrix = 11 palettes + default on the §C.1 rich Home × 1440/1024/390 |
| Accessibility (axe) | **§C.1 Home: 0 violations** in all 8 states; **brand matrix: 0** in all 22. v1 Theme 1 pages: only the pre-existing *moderate* `page-has-heading-one` on the inner pages (About/Courses/FAQs/Contact have no h1 yet — Phase 6 heroes). |
| Overflow and runtime | No horizontal page overflow at 390/768/1024/1440/1920 in EN and AR; no page errors; 0 CSP violations; no off-origin requests |

Found and fixed during verification:
- **Page overflow at 390px:** visually hidden labels inside a scrolling rail escaped it. Cards and rails are now containing blocks.
- **Course-card media collapse:** the flex column shrank the 16:9 media.
- **Axe contrast:** initials-avatar contrast.
- **Axe scrolling:** a scrollable rail with no focusable content (now keyboard-scrollable and labelled).
- **Duplicate names:** the carousel region repeated the section's name (now `roledescription="carousel"` with its own label).

### R.4 UI/UX Pro Max review (Home)

- **Hierarchy follows §B:** promise → proof → discovery → offer → reasons → process → people → proof → reassurance → action. Every section ends with a next step.
- **Brand appears only in its slots:**
  - CTA fill;
  - highlight marker;
  - chips, icon tiles, links and focus;
  - brand shapes;
  - ink glow.

  Across the 12-palette matrix, layout, type and the neutral canvas are invariant. Neon yellow and pastel pink get engine-adjusted CTAs, and the decorative marker keeps the raw hue.
- **Review changes:**
  - The highlight changed from a solid underline (cut through descenders, heavy on blue brands) to a translucent marker.
  - Stray accent dots on the hero shape were removed.
  - Same-tone sections share one gap: the 192px double gaps are gone.
  - Numbers moved to a soft panel on the canvas, so bands alternate.
  - Numbers stay three-up on phones (no orphan).
  - Category and instructor grids size to their count.
- **UI/UX Pro Max rule checks:**
  - no autoplay;
  - visible focus on every control;
  - 44px targets;
  - no page-level horizontal scroll (rails scroll inside the page);
  - reduced motion honoured everywhere.

### R.5 Open items and decisions for the Owner

- **JS budget (§G, carried "LCP/bundle decision before Phase 8").** Phase 5 adds **≈ 17.8 KB gzip** to the public main chunk: ≈ 10 KB Theme 1 renderers + **≈ 7.6 KB Embla**. §G assumed Embla was "already in the bundle"; it wasn't on the public route.

  CSS grew ≈ 2.4 KB gzip (§G budget 12 KB).

  With Phase 4's chrome, Theme 1 is likely over the 18 KB JS budget. Options for the pre-Phase-8 decision:
  - a CSS scroll-snap carousel instead of Embla (≈ −7.6 KB);
  - loading the Theme 1 renderers as a pack chunk (spares Themes 2–5, not Theme 1).

  Not changed without your decision.
- **Reduced motion in the baseline.** Captures now use reduced motion so reveals don't hide content in full-page screenshots; motion is verified by unit tests.
- **Still open from §Q.5:**
  - the private master archive bucket;
  - the Brand tab's "logo changed elsewhere" suggestion;
  - the provenance migration deploy;
  - the cookie banner over the mobile hero (out of scope).
