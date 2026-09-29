# Theme 1 ("Modern Education") — Academy Website Redesign Plan

Status: **proposal for approval. Nothing here is implemented.**
Scope: turn Theme 1 into a complete, launch-ready academy website that every Academy receives automatically. Build the architecture so Themes 2–5 can later get their own identity and page composition.

---

## Before you read

- **Screenshots.** The screenshots mentioned in the brief did not reach this session, so the audit below comes from the code. Phase 0 captures a rendered baseline of all five themes (EN/AR, three widths) before anything changes.
- **Design skills.** The "UI/UX Pro Max" and "Apple Design" skills are not installed in this environment. The design direction below applies the same principles directly: hierarchy, spacing rhythm, type scale, restraint in motion, accessibility and polish. If you install those skills, I'll run the design phases through them.
- **Three decisions need you.** They're marked **DECISION** and collected in §L.4, each with a recommended default:
  - where the images come from (a genuine gap);
  - whether fabricated-looking social proof may appear publicly;
  - how existing Theme 1 academies receive the upgrade.

---

## A. Current state audit

### A.1 The flow, end to end (as implemented)

| Step | Where | What actually happens |
|---|---|---|
| Client Owner creates an Academy | FE `features/provisioning/components/AcademySetupForm.tsx` | The form collects basics, subdomain, `selectedThemeKey` (one of 5) and `websiteSetupMode` (`complete` is pre-selected, or `empty`). This is the **only** Academy-creation path. `AcademiesService.create` is reached only through provisioning. |
| Provisioning | BE `provisioning/services/provisioning-orchestrator.service.ts` → `executeThemeStep` | 1. `WebsiteConfigurationService.updateConfiguration({ themeKey })`. 2. `WebsiteGenerationService.generate(tx, academyId, themeKey, mode)` runs in the requester's tenant+user context (RLS `is_academy_member`). |
| Generation | BE `website/services/website-generation.service.ts` | Reads the theme's **template** (`website/templates/<theme>.template.ts`) and creates the core `WebsitePage` rows with typed sections. In `complete` mode it fills bilingual `starterContent`, interpolating `{{academyName}}`. It resolves CTA targets to real page ids, generates navigation, footer "Quick Links", copyright and a header Sign-Up CTA. It is idempotent: existing pages are never touched. |
| Stored data | BE Prisma `WebsiteConfiguration` (themeKey, themeVersion, configVersion, brand, seo, navigation, header, footer, status) and `WebsitePage` (sections JSON, version) | Academy-scoped, FORCE-RLS tables. **Themes are not stored**: only a key. |
| Publishing | BE `website.controller.ts` `POST …/website/publish` | Flips `WebsiteConfiguration.status`. Provisioning does **not** publish. There is **no page-level draft copy**: once published, every saved page edit is live, cached per `configVersion`. |
| Public rendering | FE `features/public-website/PublicWebsiteRouter.tsx` → `usePublicWebsiteData` → `PublicWebsitePage` → `features/website/renderer/WebsiteRenderer.tsx` | The hostname resolves to `academyId`. `GET public/websites/:id` plus `…/pages` fetch **all** published pages in one payload. `WebsiteRenderer` → `WebsiteChrome` (header/footer/mobile bottom nav) → `SectionRenderer` (a single `switch` over 12 section types) or `CourseDetailsTemplate`. |
| Theming | FE `features/website/themes/*.theme.ts` + `website-theme.registry.ts` → `WebsiteThemeScope.tsx` | A theme is a **token set**: hero/header/footer variant enums, card variant, radius, shadow, spacing, container width, heading weight/tracking/case, and default HSL colours. `WebsiteThemeScope` turns tokens + Academy brand colours into scoped `--website-*` CSS variables. |
| Editing | FE `features/website/pages/*`, `components/SectionConfigForm.tsx`, `sections/section-fields.registry.ts`, `section-metadata.registry.ts` | A descriptor-driven generic form per section type, with one repeatable group per section. Bilingual `LocalizedText` controls. Zod validation mirrors the backend `section-config.schemas.ts`. |
| Media | BE `MediaAsset` (per-Academy, R2 key `academies/{academyId}/…`, public URL). FE `WebsiteImageField.tsx` | Section images are plain strings. **A direct upload is stored as a base64 `data:` URL inside the page's section JSON.** Only "choose from library" stores a real R2 URL. |
| Theme switching | FE `components/WebsiteThemeTab.tsx` | Saves `themeKey` only. Pages and sections are unchanged. The look changes and the composition does not. |

### A.2 Why a new Theme 1 site looks empty (root causes, not symptoms)

1. **No imagery anywhere.** No template seeds an image, and the repo contains none suitable (§E). The split hero therefore renders a large, brand-tinted empty 4:3 box (`HeroSection.tsx`, split branch). That is the "big empty container" in the screenshots.
2. **Live-data sections have no data on day one.**
   - `featuredCourses` shows an EmptyState icon.
   - `instructors` shows another EmptyState.
   - `statistics` publicly shows **"0 Courses · 0 Students · 0 Instructors"**, which is worse than empty.
3. **Sections seeded with a title and nothing else.** `testimonials` is generated with only a title and `items: []`, so it renders a heading over an empty grid.
4. **Shallow inner pages.** About, Courses, FAQs and Contact are **one section each**, and identical for all five themes (`shared-support-pages.template.ts`). About is two paragraphs, and FAQ has two questions.
5. **The renderers are minimal and interchangeable.** Every section is "centered H2 + auto-fit card grid" with the same padding. There's:
   - no section rhythm (alternating surfaces, full-bleed bands);
   - no image treatment;
   - no card depth beyond one shadow token;
   - no hover, reveal or motion at all (no website section imports any animation code).

   Only the hero has structural variants.
6. **A theme can't express identity beyond tokens.** Five themes = five token sets over the **same components**, which is why they read as colour variations. The Home compositions differ slightly, but the section *designs* are shared.

### A.3 What is solid and should be kept

- **Tenancy and data flow.**
  - The Academy-scoped config and pages, FORCE RLS, and generation inside the requester's RLS context.
  - The public endpoints resolve `academyId` to its organization server-side and never trust the client.
  - Public reads are published-only and cached per `configVersion`.
- **Section = typed data, never markup.** The no-HTML/no-eval security posture, and the Zod parity between frontend and backend.
- **The template registry idea** (backend, one file per theme) and **idempotent generation** at provisioning, including CTA intent resolution and navigation/footer generation.
- **Bilingual `LocalizedText`** end to end, `/ar` routing, `dir="auto"` handling, and RTL-safe document direction.
- **Live-data section concept** (courses, instructors, statistics resolved at render). It's honest and never snapshots fabricated numbers.
- **One renderer on every surface** (public site, editor preview, theme gallery).
- **The public course APIs.** Course cards and Course Details already expose rating, review count, duration, preview flag, level, language, outcomes, requirements, curriculum and related courses.
- **Existing dependencies:**
  - `framer-motion`, with Atlas motion tokens/presets in `design-system/motion`;
  - `embla-carousel-react`;
  - Radix Accordion;
  - `lucide-react`;
  - Tailwind.

### A.4 What needs redesign or introduction

- **Section presentation.** Theme 1 needs its own renderers. The shared base stays for Themes 2–5 until they're redesigned.
- **Hero, header, footer, course card, testimonial, instructor, statistics, FAQ and CTA designs** (all of them for Theme 1).
- **Missing section types:**
  - inner-page header;
  - course categories;
  - steps / how it works;
  - image + benefits split.
- **Templates:** Theme 1 needs its **own** inner-page compositions and image references. Today's support pages are shared across themes.
- **Empty-data behaviour for live sections:** auto-hide or a designed "launching soon" state, never zeros.
- **Media:** a theme asset pack with responsive `srcset`; a fix for base64-in-JSON uploads.
- **Motion:** a small, CSS-first reveal system that respects reduced-motion.

---

## B. Target experience

**Personality: "a confident, welcoming modern school".** Bright, warm and optimistic; clearly an education brand; editorial rather than SaaS-generic. It should feel like a place people *enroll in*, not a dashboard.

- **Visual direction**
  - **Canvas:** a white base, with a soft neutral surface for alternating bands and **one deep "ink" band** (near-black, tinted by the brand hue at 6%) for the final CTA. That gives the page rhythm and a clear ending.
  - **Brand colour as signal, not wash:**
    - primary CTAs;
    - a brand-coloured highlight stroke under one key phrase in headings;
    - active states and chips.

    Large brand washes are never used; the codebase already learned this.
  - **Signature motif:** a soft, rounded brand-tinted shape behind hero and feature imagery (inline SVG, brand-coloured through CSS variables, so it re-brands automatically). Layered image compositions use one main photo plus a small floating "proof" chip. The chip is either live data (e.g. "24 courses") or authored copy, never an invented metric.
  - **Cards:** 20px radius, 1px hairline border, and elevation that appears on hover. Image-led course cards with category chip, level, duration, rating (only when reviews exist), instructor avatar and price.
  - **Typography:** the existing `font-display` / `font-sans` (RTL-safe, no new web fonts).
    - Tight tracking on display text.
    - Display type scale 64/56/40 (desktop/tablet/mobile) for the Home hero.
    - 40/32/28 for section titles.
    - 18/17 body lead.
    - Line length capped at ~65ch.
- **UX direction.** Every screen answers "what is this, why should I care, what do I do next".
  - The hero includes **course search** that deep-links into the catalog.
  - Every section ends in a next step (view all courses, read FAQs, contact, sign up).
  - Navigation stays sticky and compact.
  - On mobile, the primary CTA is always one tap away (the existing bottom nav, restyled).
- **Information hierarchy on Home:** promise → proof → discovery → offer → reasons → process → people → proof → reassurance → action.
- **Content density.** Each section earns its space: one idea per section, 3–6 items, no walls of text. Vertical rhythm is 96/80/64px (desktop/tablet/mobile) with deliberate tighter "band" sections.
- **Motion direction.** Quiet and confident:
  - one orchestrated hero entrance;
  - content rises gently into view once;
  - hover responses that make cards feel physical.

  Nothing loops, nothing moves on its own, and there are no parallax gimmicks.
- **Responsive.** Designed separately at 1440/1024/390px:
  - desktop: split and grid compositions;
  - tablet: two-column adaptations with repositioned imagery;
  - mobile: single-column narrative with swipeable rails for courses and testimonials, full-width CTAs, and an image-first hero crop.

---

## C. Theme 1 page and section inventory

Legend for *Source*:
- **authored** = seeded bilingual copy the Academy edits;
- **live** = resolved from real Academy data at render time;
- **asset** = a theme image the Academy can replace.

*Reuse*:
- **shared contract** = a section type any theme may use;
- **T1 renderer** = Theme 1's own visual design of it.

### C.1 Home (the narrative)

| # | Section (type) | Purpose | Content, layout and imagery | Interaction and motion | Responsive | Source / Reuse |
|---|---|---|---|---|---|---|
| 1 | **Hero** (`hero`, extended) | Promise and first action | Eyebrow; headline with one highlighted phrase; sub-copy; primary CTA "Explore courses" and secondary "How it works" (anchor); an **inline course search** that opens `/courses?q=`; a row of 3 highlight chips ("Expert-led", "Learn at your pace", "Arabic & English"). Right side: a layered image composition (main photo, brand shape, one floating chip showing the live course count, shown only when > 0). | Orchestrated entrance: headline, then sub-copy, CTAs and search, then the image (fade + 12px rise, 60ms stagger). Hover on CTAs. No motion on the LCP image itself. | **D:** 55/45 split. **T:** stacked, image on top at a 16:10 crop. **M:** headline first, search full-width, image below the CTAs at 4:3; chips scroll horizontally. | authored + asset + live chip / shared contract + T1 renderer |
| 2 | **Highlights band** (`features`, `layout: strip`) | Instant value proposition | 4 icon + title + one-line items in a horizontal band on the soft surface. | Staggered rise on first view. | 4-up (D), 2×2 (T/M). | authored / shared + T1 |
| 3 | **Explore by category** (`courseCategories`, **new**) | Discovery | Live categories with course counts, as icon tiles in brand-tinted containers, linking to `/courses?category=`. **Auto-hidden when there are fewer than 2 categories with published courses.** The editor shows a hint. | Tile lift on hover/focus. | 4-up / 3-up / horizontal rail. | live / shared + T1 |
| 4 | **Featured courses** (`featuredCourses`, extended) | Offer | Heading row with a "View all courses" link. Image-led course cards. **Empty state:** a designed "Courses launching soon" panel with image and "Create your account" CTA (never an EmptyState icon). | Card: image zoom 1.03, lift, CTA arrow nudge. Rail uses embla (drag, keyboard arrows, snap). | 3-col grid (D), 2-col (T), swipe rail with peek (M). | live / shared + T1 |
| 5 | **Why {{academyName}}** (`featureSplit`, **new**) | Differentiation | Split: image composition on one side; title, lead and 3 numbered benefits on the other. | Image reveal (clip from 8% inset), items stagger. | Side-by-side (D/T), image-first stack (M). | authored + asset / shared + T1 |
| 6 | **How it works** (`steps`, **new**) | Remove friction | 3 steps: "Choose your course → Learn at your pace → Reach your goal", with a connecting line. Anchor target for the hero's secondary CTA. | Steps reveal in order; the line draws once (CSS). | Horizontal (D/T), vertical timeline (M). | authored / shared + T1 |
| 7 | **Instructors** (`instructors`) | People | Live instructor cards (avatar, name, course count). **Auto-hidden when there are none** publicly. The editor preview shows labelled sample cards. | Hover lift. | 4 / 2 / swipe rail. | live / shared + T1 |
| 8 | **Numbers** (`statistics`) | Proof | Live metrics as large numerals. **Any metric at 0 is hidden, and the section hides when fewer than 2 metrics remain.** | Count-up once in view (≤ 900ms; no count with reduced motion). | 3/4-up, 2×2 on mobile. | live / shared + T1 |
| 9 | **Testimonials** (`testimonials`, extended) | Social proof | Large-quote carousel with optional rating stars and author (initials avatar unless an avatar is set). Library entries plus inline items. **Seeded items are marked `sample` (see §D.4).** | Carousel with arrows and dots; no autoplay. Crossfade + 8px slide. | 1 large quote (D) with a 2-card peek (T), swipe rail (M). | authored(sample) + library / shared + T1 |
| 10 | **FAQ teaser** (`faq`, extended: `maxItems`, `cta`) | Reassurance | Split: heading + "Still have questions? Contact us" on one side; the first 4 FAQs as an accordion on the other; a link to the FAQs page. | Radix accordion height animation (CSS), rotating chevron. | Split (D), stacked (T/M). | authored / shared + T1 |
| 11 | **Final CTA band** (`cta`, extended: `secondaryCta`, `image`) | Conversion | The ink band: headline, sub-copy, primary "Create free account" (sign up) and secondary "Browse courses", plus an image cut-out with brand glow. | Band fades in; CTA hover. | Image right (D), below (T), hidden on narrow mobile. | authored + asset / shared + T1 |
| — | **Header** (chrome, T1) | Navigation | Logo, nav, language switch, Sign in (ghost), Sign up (primary). Transparent over the hero, becoming solid with a hairline and blur after 24px of scroll. Active-page indicator. | Scroll-state transition 200ms. The mobile sheet slides from the top with staggered links. | Full nav (D); condensed nav + "More" (T); logo + menu + CTA (M). | config / T1 chrome |
| — | **Footer** (chrome, T1) | Closure and wayfinding | 4 columns: brand + description + social; Quick links; Courses (live top categories or the Courses page); Contact (Academy email/phone/address). Bottom row: copyright, language switch, "Powered by Atlas" (only if already present today). | Link underline on hover. | 4 → 2 → 1 columns with accordion groups on mobile. | config + live / T1 chrome |

Why this order: the promise, proof and discovery land in the first two screens. The offer sits mid-page for scanners. People and proof come after the offer, when trust matters. Reassurance and a single decisive action close the page.

### C.2 Courses (`/courses`)

1. **Page header** (`pageHeader`, **new**): eyebrow, title "Our courses", lead line, compact breadcrumb, and a search field synced with the catalog. Soft surface band, with a small brand shape and no photo, to keep the catalog above the fold.
2. **Catalog** (`courseCatalog`, T1 renderer):
   - a category chip row (live);
   - a sticky toolbar with search, level, pricing and sort (desktop);
   - a "Filters" bottom sheet with an applied-filter count (mobile);
   - T1 course cards;
   - skeletons for loading;
   - a designed no-results state with "Clear filters";
   - numbered pagination with page-size and URL state (`?q=&category=&level=&page=`).

   Motion: results cross-fade on filter change. Cards don't re-stagger on every keystroke.
3. **CTA band** (`cta`): "Not sure where to start? Talk to us" → Contact.

### C.3 Course Details (template, not sections: `CourseDetailsTemplate`)

Existing data only (no new backend):
- **Hero band:** breadcrumb (Courses › Category); title; short description; meta chips (level, language, duration, lessons); rating with review count (only when reviews > 0); instructor avatars.
- **Sticky purchase card:** thumbnail or preview play button, price, a state-aware CTA (existing logic), and "What's included".
- **Body:**
  - "What you'll learn" (outcomes, two-column checklist);
  - requirements;
  - curriculum accordion (sections/lessons, preview badges, which open the existing `CoursePreviewDialog`);
  - instructor card(s);
  - reviews (existing `CourseReviews`);
  - related courses rail (existing `RelatedCourses`).
- **Mobile:** the purchase card becomes a sticky bottom bar (price + CTA) placed above the existing bottom nav, with no overlap.
- **Loading:** skeleton mirroring the layout. **Errors:** the existing ErrorState, restyled.

### C.4 About (`/about`)

1. `pageHeader` with a wide image (asset).
2. `featureSplit`, "Our story": image + mission copy + 3 principles.
3. `features` grid, "What we believe": 4 values with icons.
4. `statistics` (live, auto-hidden rule).
5. `instructors` (live, auto-hidden).
6. `gallery`, "Life at {{academyName}}": 5 assets in a bento layout (T1 renderer). Lightbox on click, keyboard-navigable.
7. `cta` band.

### C.5 FAQs (`/faqs`)

1. `pageHeader`, with the search field acting as an FAQ filter (client-side, on the page's own items).
2. `faq`, full list of **8 seeded bilingual questions** about enrolling, access, devices, payment methods (generic), certificates (worded conditionally: "if your course includes one"), refunds (pointing to the Academy's policy), language and support.
3. `cta`: "Still have a question?" → Contact.

### C.6 Contact (`/contact`)

1. `pageHeader`.
2. `contact` (T1 renderer):
   - contact method cards (email/phone/address from the Academy record, each hidden when absent) beside the existing contact form, which posts to `POST public/websites/:id/contact`;
   - a success state with check animation;
   - inline validation.
3. `faq` teaser (4 items + link).

### C.7 Other public surfaces (restyle only, no new content)

- Sign In / Sign Up / Forgot / Reset / Verify: `PublicWebsiteAuthShell`. Theme 1 gets a split layout with an asset image and a brand shape.
- Coming Soon (`AcademyComingSoon`), 404, and hostname-status pages: T1 chrome treatment.
- The learner area (`/my/*`) is **out of scope**. It's product UI, not the marketing theme.

### C.8 Explicitly not added

- No blog or events page: blog content isn't public today (documented in `website-section.types.ts`).
- No pricing page: course pricing lives on courses.
- No map embed: there's no maps integration, and it would add a third-party origin that the CSP blocks.
- No logo cloud: there's no honest source of partner logos for a new Academy.

---

## D. Data and content model

### D.1 Flow

```
Theme template v2 (BE, per theme: page compositions + bilingual starter copy
                   + theme-asset references + sample flags + CTA intents)
      │  executeThemeStep → WebsiteGenerationService.generate (unchanged entry point)
      ▼
Academy-owned WebsitePage rows (sections JSON)  ← editable in the existing Page Editor
      │  publish (existing)
      ▼
Public runtime: WebsiteRenderer → ThemePack renderer for each section
      ▲                         ▲
Academy brand (logo, colours)   Live data (courses, categories, instructors, stats, reviews)
```

Starter content is **copied** into the Academy's pages at provisioning. From then on it's the Academy's own data, fully editable and deletable. That's already how generation works, and it stays.

### D.2 Required changes

**Section contracts** (shared catalog; backend `section-config.schemas.ts`, `section-reference-validator.service.ts`, frontend types/Zod/fields/metadata/i18n):

| Change | Shape (summary) | Backward compatibility |
|---|---|---|
| **New `pageHeader`** | `eyebrow?`, `title`, `description?`, `image?`, `imageAlt?`, `showSearch?` | new type |
| **New `courseCategories`** | `title`, `description?`, `maxItems`, `showCounts` (live data) | new type |
| **New `steps`** | `title`, `description?`, `items[{id,title,description,icon}]` (max 6) | new type |
| **New `featureSplit`** | `eyebrow?`, `title`, `body?`, `image?`, `imageAlt?`, `imagePosition: start/end`, `items[{id,title,description}]` | new type |
| `hero` + | `highlight?` (a phrase inside the title to emphasise), `highlights?[{id,label,icon}]`, `showSearch?` | optional fields |
| `features` + | `layout?: 'grid'/'strip'` | optional |
| `faq` + | `maxItems?`, `cta?` | optional |
| `cta` + | `secondaryCta?`, `image?`, `imageAlt?` | optional |
| `testimonials` items + | `rating?` (1–5), `sample?` | optional |

All additions are optional, or they're new types. **Every existing page parses unchanged, so no data migration is needed.** New types get a **base renderer** too, so every theme can render every type (§F).

**Public API:** `GET public/websites/:academyId/categories` returns categories that have ≥ 1 published public course, with counts.
- It's a read-only public endpoint in the existing `PublicWebsiteService`.
- It uses the same `resolveOrganizationId` + `runInTenantContext` pattern.
- It returns only public fields (`id`, `name`, `slug`, `courseCount`).
- The catalog adds `?category=` and `?q=` URL-state support on the frontend. The backend already filters by `categoryId`; search support is verified in Phase 2.

**Template v2:** `WebsiteTemplateDefinition` gains:
- an optional `version`;
- per-section `assets` (theme-asset references);
- per-item `sample` flags.

Theme 1 gets its own About/Courses/FAQs/Contact compositions. The other four keep `buildSharedSupportPages()` unchanged.

**Provenance (optional, small migration):** nullable `website_configurations.template_key` and `template_version`, written at generation.
- It lets a future "refresh starter content" feature act only on sites generated from an older template.
- It's additive and needs no backfill (null = legacy).
- **I recommend including it**, because it's cheap now and hard to reconstruct later.

**Editor:**
- descriptor entries for the new fields and types;
- the new `image` field kind accepts theme assets (see §E);
- a publish-readiness check lists sections still containing sample content (§D.4).

### D.3 Branding

Theme 1 renders the Academy's:
- name (header, footer, interpolated copy);
- logo / dark logo (header over the ink band uses the dark logo when present, otherwise the logo on a light pill);
- brand colours. The primary drives CTAs, highlights, brand shapes and chips; the secondary and accent drive supporting chips and illustration details. Readable text-on-brand colour is computed with the existing `color.utils.ts`, falling back to ink text when contrast is below 4.5:1.

Courses, categories, instructors, reviews and stats are always this Academy's live data. No template contains another Academy's name, courses or people. The only interpolated facts are `{{academyName}}` and `{{academyDescription}}`, as today.

### D.4 Honest demo content — **DECISION 2**

The brief asks for social proof that feels alive. It also has to stay truthful for a real business: fabricated testimonials and inflated numbers are a legal risk (consumer-protection rules on fake reviews) and a trust risk.

**Recommended rule:**
- **Marketing copy** (hero, highlights, benefits, steps, FAQs, CTAs, about): seeded as real, publishable starter copy about the Academy, written so it's true for any Academy.
- **Claims about people or numbers:**
  - Testimonials are seeded as **sample** items. They're rendered in the editor, preview and theme gallery with a subtle "Sample" badge, and **excluded from the public render** until the Owner edits or confirms them.
  - Instructors and statistics are live only. The editor preview shows labelled samples when there's no data; the public site hides the section.
- **Publish-readiness check:** before publishing, the Owner sees "2 sections still contain sample content: Testimonials, …". It's a warning, not a block.

**Result:** the Owner's first look at the site (the preview) is complete and alive, and the public site never shows invented people or numbers.

---

## E. Media and image plan

### E.1 What exists

| Asset | Content | Usable for an academy site? |
|---|---|---|
| `features/home/components/cinematic-hero/assets/hero-poster.webp` (1600×900) | Atlas teal abstract, shattered shards | **No.** Atlas marketing identity, fixed teal, not education. |
| `…/cinematic-hero/assets/structure-calm.webp` (640×640) | Atlas abstract | **No.** Same reason. |
| `features/home/assets/launch-ready.webp` (725×900) | 3D teal schoolhouse | **No.** Fixed Atlas teal clashes with every Academy's own brand, and it's Atlas identity. |
| `features/home/assets/platform-convergence.webp` | 3D teal cubes network | **No.** |
| `features/home/assets/secure-shield.webp` | 3D teal shield | **No.** |
| Backend `deploy/onboarding-browser/logo.png` | Test fixture | **No.** |
| Seed data (`prisma/seed.ts`) | No thumbnails or images | — |

**Conclusion (a genuine gap):** the repositories contain **no education imagery**: no learners, classrooms, instructors or study scenes. The "images already available" may be production uploads in individual academies' media libraries. Those belong to those tenants and must never be reused across academies (§17 of the brief).

### E.2 Required asset set for Theme 1 (~18 images)

| Key | Used by | Subject | Ratio / master size |
|---|---|---|---|
| `hero-learner` | Home hero | Adult learner studying on a laptop, warm natural light, space for a brand shape | 4:5, 1600×2000 |
| `hero-learner-alt` | Theme gallery / alternate | Small-group study | 4:5 |
| `benefit-mentor` | Home featureSplit | Instructor guiding a learner | 4:3, 1600×1200 |
| `benefit-flexible` | spare / About | Learning on a phone or tablet | 4:3 |
| `cta-cutout` | Home CTA band | Smiling learner, clean background | 3:4, 1200×1600 |
| `courses-launching` | Featured courses empty state | Notebook + laptop flat lay | 16:9, 1600×900 |
| `about-header` | About pageHeader | Workshop / classroom wide shot | 21:9, 2400×1030 |
| `about-story` | About featureSplit | Team collaborating | 4:3 |
| `gallery-1…5` | About gallery (bento) | Varied learning scenes | 1:1 and 4:3 mixes |
| `auth-side` | Sign in/up shell | Calm study scene | 3:4 |
| `course-placeholder-1…3` | Course cards without thumbnails | Abstract, brand-neutral texture | 16:9 |

Course-card fallbacks can instead be **generated brand patterns** (an inline SVG in the Academy's brand colour), which suits a card with no thumbnail better. **Recommended.**

### E.3 Sourcing — **DECISION 1**

1. **Licensed stock photography, self-hosted, with a license manifest (recommended).**
   - Curated from a source whose license explicitly allows commercial redistribution inside a software template (to be confirmed by you or legal: the Unsplash/Pexels terms allow commercial use but have clauses about compiling images into a competing service).
   - Downloaded once and never hot-linked (no external URLs).
   - A `manifest.json` records source, license, author and alt text (EN/AR).
2. **AI-generated imagery, generated once, reviewed and committed.** No licensing question, but quality control is needed on hands, faces and text artefacts, and a consistent art direction.
3. **Illustration-only Theme 1.** Brand-tinted SVG compositions and no photography. Always on-brand, zero licensing, smallest bytes. But it reads less like a "real school" than your quality references.

The design works with any of the three, and every image slot has a designed no-image state. My recommendation is 1, with 3 as the built-in fallback.

### E.4 How assets are stored, referenced and kept safe

- **Theme asset pack** in the frontend repo: `public/theme-assets/modern-education/v1/<key>-<width>.{avif,webp}`, at widths 480/800/1200/1600/2400 as needed, plus `manifest.ts` (keys, dimensions, focal point, alt text EN/AR, license).
- **Reference format stored in section JSON:** `theme-asset:modern-education/hero-learner`, not a URL. It's the same reasoning `MediaAsset` uses for `storageKey` vs `url`: files can move or re-encode without a data migration.
- **Resolver:** `resolveWebsiteImage(value)` returns `{ src, srcSet, sizes, width, height, focal }` for theme assets. It passes `https:` URLs through (R2 media and legacy values) and keeps rendering legacy `data:` URLs.
- **Rendered with:** `<picture>` (AVIF → WebP); explicit width/height (zero CLS); `loading="lazy"` / `decoding="async"` except the hero image (`fetchpriority="high"`, eager).
- **Served same-origin** on every academy host by the existing Caddy SPA file server, so the enforced CSP (`img-src 'self'`) needs **no change**. Add `Cache-Control: public, max-age=31536000, immutable` for `/theme-assets/*` (versioned path).
- **Academy safety:**
  - Theme assets contain no tenant data and are identical for everyone. They're not in any Academy's media library or R2 prefix, so no cross-tenant path exists.
  - An Academy "replaces" an image by uploading its own (its own R2 prefix). The reference changes and the theme asset is untouched.
  - **Never deleted:** a versioned folder is kept forever. A test fails if any template references a key missing from the manifest, or if a released version folder disappears.
- **Validation:** the backend accepts `image` values matching `^theme-asset:[a-z0-9-]+/[a-z0-9-]+$`, or `https://…`, or (legacy) `data:image/…`. It rejects `javascript:` and other schemes (today it's an unconstrained `z.string()`). The frontend mirrors this.

### E.5 Fix a real performance defect found in the audit

A direct upload in `WebsiteImageField` stores a **base64 data URL inside the page JSON**. Every visitor then downloads every page's images inline, uncacheable and at full size, on every page load, because the public API returns all pages at once.

- **Fix:** route direct uploads through the existing media upload (`MediaAsset`, the Academy's own R2 prefix) and store the returned URL.
- Existing data URLs keep rendering. An optional one-off, per-Academy-consented migration can move them later.

---

## F. Theme architecture

### F.1 The model: shared contracts, theme-owned presentation

```
Shared (all themes)                         Per theme (a "ThemePack")
─────────────────────────────               ────────────────────────────────────
Section catalog: types + Zod schemas   ─┐   tokens            (today's WebsiteThemeDefinition, extended)
(backend + frontend, one source)        │   renderers         Partial<Record<SectionType, Component>>
Base renderers for every section type   │   chrome            Header, Footer, AuthShell (optional overrides)
Primitives: SectionShell, Heading,      ├─► motion profile    which reveal presets, and their intensity
  Reveal, ThemeImage, Carousel, Chip,   │   template (BE)     page compositions + starter copy + assets
  Rating, Price, CourseCard parts,      │   asset pack        public/theme-assets/<theme>/vN
  Accordion, EmptyPanel                 │
Data hooks (usePublicCourses, …)        │
Tenancy, link resolution, i18n/RTL  ────┘
```

- **Dispatch:** `SectionRenderer` becomes `const Renderer = themePack.renderers[type] ?? BASE_RENDERERS[type]`, with a single lookup and no theme `if`s scattered around.
- **Themes 2–5** initially register **no renderers**, so they render exactly as today, pixel for pixel. That's enforced by the Phase 0 baseline screenshots.
- **Tokens** extend with a few bounded enums Theme 1 needs:
  - `typeScale` (`standard | expressive`);
  - `surfaceRhythm` (`flat | alternating | banded`);
  - `motion` (`none | subtle | expressive`).

  They stay bounded enums, never raw CSS, so the injection-safety guarantee holds.
- **Scoped CSS:** each pack may ship one stylesheet namespaced under `.website-theme-scope[data-theme="modern-education"]`, loaded lazily with the pack. Base styles stay global-free.
- **Code splitting:** each pack is a dynamic import. A visitor downloads only their Academy's theme, and the editor's theme gallery loads packs on demand.

### F.2 Why this gives "Theme 1 ≠ Theme 2" without duplication

- **Different composition:** each theme's backend template chooses its own pages and sections (already true for Home; Theme 1 now also owns its inner pages).
- **Different visual language:** each theme owns its renderers and chrome for any section, while sharing primitives. For example, Theme 2 may render `featuredCourses` as an editorial list with large numerals and Theme 1 as image cards, from the same data.
- **Theme-specific section types are allowed** when a theme needs a content shape no other theme has. They join the shared catalog (with a base renderer), so content never becomes unrenderable after a theme switch.
- **Adding Theme 2 later:**
  1. a `themes/premium-academy/` pack folder (tokens, renderers, chrome, CSS);
  2. an updated `premium-academy.template.ts`;
  3. an asset pack.

  Zero edits to Theme 1 or to shared code, unless Theme 2 adds a new shared section type, and that's purely additive.

### F.3 Theme switching (safe by construction)

Switching changes tokens, renderers and chrome immediately, while the content (the shared contracts) is preserved. Because every section type has a base renderer, nothing ever fails to render.

Getting another theme's **composition** (not just its look) is a separate, explicit action, designed now and built with Theme 2: "Apply this theme's starter layout".
- It reuses `WebsiteGenerationService` in a "replace" mode.
- It previews first and stores the previous sections as a restorable copy.
- It's never automatic, so an Owner's edits are never overwritten.

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
| Hero | Orchestrated: text rises 12px + fade with 60ms stagger; the image fades in 150ms after the text. The LCP text renders at opacity 1 immediately, and only non-LCP elements animate (protects LCP). | — | CTA: 2% brightness shift + arrow 3px nudge; search focus ring. | No entrance; static. |
| Highlights, benefits, steps | — | Group rise, 50ms stagger (capped at 400ms total). The steps connector line draws via `stroke-dashoffset`, once. | Icon tile subtle tint. | Visible immediately. |
| Category tiles / course cards | — | Rise on first view (grid rows only, not every card individually). | Lift −4px + shadow; image scale 1.03 (transform only, GPU); title underline. Focus-visible gets the same treatment as hover. | No lift animation; focus ring kept. |
| Course rail / testimonials | — | — | Embla drag/snap with arrow buttons and keyboard arrows. Dots are real buttons with `aria-label`. **No autoplay.** | Instant slide change. |
| Statistics | — | Count-up ≤ 900ms (`requestAnimationFrame`) the first time in view. | — | Final numbers shown. |
| FAQ accordion | — | — | Height animates via Radix CSS variables; chevron rotates 180°. | Instant open/close. |
| Header | — | Transparent → solid at 24px scroll (opacity/background only, 200ms, passive listener + rAF). | Nav link underline grows from start (logical property). | State changes without transition. |
| Page transitions | None (full-page navigations stay instant; content reveals handle arrival). | | | |

**Performance guards:**
- Only `transform` and `opacity` are animated.
- There's no scroll-linked JS except the one rAF-throttled header check.
- Observers disconnect after reveal.
- **Budget:** Theme 1 adds ≤ 18 KB gzip JS to the public route (the pack chunk, excluding embla already in the bundle) and ≤ 12 KB CSS.

---

## H. Implementation phases

Each phase is independently shippable, and Themes 2–5 stay pixel-identical throughout.

### Phase 0 — Baseline, harness, decisions (no product change)

- **Objective:** freeze today's rendering as the regression reference, and get the three decisions.
- **Work:**
  - A dev-only fixture route (excluded from production builds) renders `WebsiteRenderer` for any theme with fixture data: empty academy, rich academy, legacy configs.
  - Playwright screenshots of all 5 themes × Home/About/Courses/FAQs/Contact/Course Details × EN/AR × 1440/1024/390.
  - Record current Lighthouse and axe scores.
- **Acceptance:** the baseline is committed, and the decisions are recorded in §L.4.
- **Risk:** low.

### Phase 1 — ThemePack architecture and shared primitives

- **Objective:** the extension point, with no visual change.
- **Files:**
  - FE `features/website/themes/` restructured into `themes/<key>/index.ts` packs, and the registry returns packs;
  - `sections/SectionRenderer.tsx` (dispatch via pack → base);
  - new `features/website/primitives/` (SectionShell, SectionHeading, Reveal + `useReveal`, ThemeImage + resolver, Carousel wrapper, Chip, Rating, Price, EmptyPanel);
  - `WebsiteThemeScope.tsx` gains `data-theme` and the extended tokens;
  - lazy pack loading.
- **Backend:** none.
- **Tests:**
  - pack registry/fallback unit tests;
  - reduced-motion unit tests for `useReveal`;
  - **Phase 0 screenshots unchanged for all 5 themes** (the pixel diff must be 0).
- **Risk:** accidental base-renderer changes. **Mitigation:** pixel diff.

### Phase 2 — Content contracts, public categories, media fix

- **Objective:** everything Theme 1 needs from data, all additive.
- **Backend:**
  - `section-config.schemas.ts`: new types and fields, plus image-value validation;
  - `section-reference-validator.service.ts` (category/course references);
  - `public-website.controller/service`: `GET …/categories`;
  - optional migration: `template_key`, `template_version`.
- **Frontend:**
  - types (`website-section.types.ts`) and Zod (`schemas/website-section.schemas.ts`);
  - `section-fields.registry.ts`, `section-metadata.registry.ts`, i18n EN/AR;
  - base renderers for the 4 new types;
  - `WebsiteImageField` direct upload goes through MediaAsset;
  - catalog URL state (`q`, `category`).
- **Tests:**
  - backend unit (schemas: every legacy page fixture still parses; the new fields validate; bad image schemes are rejected);
  - e2e for the categories endpoint (published-only, public fields only, unknown academy → 404, cross-academy isolation);
  - frontend/backend schema parity test;
  - editor form tests;
  - the media upload stores a URL, never a data URL.
- **Release note:** backward compatible. It ships before the frontend uses the new types.
- **Risk:** schema drift between frontend and backend. **Mitigation:** the parity test.

### Phase 3 — Theme asset pipeline

- **Objective:** the images, optimised and served immutably.
- **Work:**
  - `public/theme-assets/modern-education/v1/*` (AVIF + WebP, multiple widths);
  - `manifest.ts` (dimensions, focal point, alt EN/AR, license);
  - resolver + `<ThemeImage>`;
  - a Caddyfile cache header block for `/theme-assets/*`;
  - a build-time check that every manifest file exists and every template key resolves.
- **Tests:** resolver unit tests (theme-asset / https / legacy data); the manifest completeness test; CSP check in the browser (no violations).
- **Depends on:** DECISION 1.
- **Risk:** repo size. **Mitigation:** ≤ 6 MB total, via AVIF plus sensible widths.

### Phase 4 — Theme 1 visual system and chrome

- **Objective:** tokens, type scale, surfaces, header, footer, mobile navigation and auth shell.
- **Files:** `themes/modern-education/{index.ts, tokens.ts, theme.css, chrome/Header.tsx, chrome/Footer.tsx, chrome/AuthShell.tsx}`; small hooks in `WebsiteChrome` so a pack can supply chrome.
- **Tests:**
  - header scroll state;
  - keyboard navigation of the menu and sheet;
  - focus trap in the mobile sheet;
  - RTL mirroring;
  - contrast checks of the brand-on-text fallback across a palette sweep (20 brand colours).
- **Visual check:** the screenshot matrix for Theme 1, with Themes 2–5 unchanged.

### Phase 5 — Theme 1 Home renderers

- **Objective:** sections C.1 #1–11 as T1 renderers, including the empty and sample states.
- **Tests:**
  - each renderer with empty / typical / maximal fixtures;
  - live-data hiding rules (0 stats, fewer than 2 categories, no instructors);
  - sample-item exclusion on the public render;
  - carousel keyboard and aria;
  - count-up disabled under reduced motion.
- **Visual check:** Home matrix in EN/AR at 1440/1024/390, empty academy vs rich academy.

### Phase 6 — Theme 1 inner pages

- **Objective:** Courses (catalog renderer), Course Details (template redesign), About, FAQs, Contact, Coming Soon and 404.
- **Files:**
  - `CourseDetailsTemplate.tsx` split into composable parts that a pack can arrange (existing data hooks unchanged);
  - T1 renderers for `courseCatalog`, `contact`, `gallery`, `pageHeader`, `featureSplit`, `steps`.
- **Tests:**
  - catalog filters and URL state;
  - Course Details states (signed out / enrolled / free / paid) unchanged in behaviour;
  - contact form success and error;
  - gallery lightbox keyboard support.

### Phase 7 — Starter content and initialization

- **Objective:** a new Theme 1 Academy gets the complete site automatically.
- **Backend:**
  - `modern-education.template.ts` v2 with all pages, bilingual copy (EN + AR, professionally phrased), asset refs, `sample` flags and CTA intents (anchor, courses, contact, signUp);
  - the generation service handles `assets`, `sample` and provenance;
  - the other themes' templates are unchanged.
- **Frontend:** the publish-readiness check (sample-content warning); editor preview sample cards for live sections.
- **Tests:**
  - backend unit: the template validates against the real schemas (the existing registry spec extended);
  - e2e: provision → pages created with the expected composition → idempotent re-run → the Owner edits survive;
  - generation inside the requester's RLS context only;
  - **cross-academy isolation:** A's generation never reads or writes B; public `pages`/`categories` for A never include B.
- **E2E (browser):** create an Academy with Theme 1 (complete) → open the preview → full site → publish → public site with no sample testimonials, no zero stats, and correct behaviour with no courses.

### Phase 8 — Hardening and verification

- **Accessibility:** axe on every page state (0 serious/critical), keyboard walkthrough, screen-reader landmarks and headings audit, contrast, `alt` coverage.
- **Performance:** Lighthouse CI on the fixture academy on mobile. Budgets: LCP ≤ 2.5s, CLS ≤ 0.05, INP ≤ 200ms, TBT ≤ 200ms. Bundle-size budget check.
- **Responsive:** the full matrix at 360/390/768/1024/1280/1440/1920, with EN/AR each.
- **Regression:** Themes 2–5 at pixel diff 0. Existing Theme 1 academies' legacy content renders well under the new renderers (fixtures built from the current template v1 output, including a hero without image and testimonials without items).
- **Docs:** a Theme 1 section in `Reports/ARCHITECTURE.md` and a "How to add a theme" guide.

### Phase 9 — Release and production verification

1. **Order:** backend contracts (Phase 2) → frontend renderers/packs → backend template v2.
   - That way, no Academy is ever generated with a section type its frontend can't render.
   - No migration is needed unless provenance is approved; if it is, it's additive and goes through the existing gated migration deploy.
2. **Production checks:** a new Launch-verify journey provisions nothing. It renders a known Theme 1 Academy's public pages and asserts:
   - no CSP violations;
   - no zero-stat or sample content;
   - images served from `/theme-assets` with immutable caching;
   - EN/AR, desktop/mobile screenshots attached as artifacts.
3. **Existing Theme 1 academies:** see DECISION 3.

---

## I. Testing strategy

| Layer | What |
|---|---|
| Unit (FE) | Pack registry + fallback; `useReveal` + reduced-motion; image resolver; hiding rules for live data; sample exclusion; count-up; carousel a11y props; contrast fallback |
| Unit (BE) | Schema acceptance of every legacy page shape; new types and fields; image validation; template v2 validates; generation config building (assets, sample, provenance) |
| Integration / e2e (BE, real Postgres + Redis) | Categories endpoint (published-only, public fields, 404, cross-academy); generation idempotency and Owner-edit preservation; RLS context of generation; the public `pages` payload excludes nothing it shouldn't and includes nothing from another Academy |
| Frontend/backend contract | Parity test that the frontend Zod and backend Zod accept and reject the same fixture set |
| E2E (browser, Playwright) | Provision → preview → publish → public site (EN/AR); catalog search/filter deep links; Course Details enrol states; contact form; FAQ; navigation/menu on mobile; sign in/up shells |
| Academy isolation | Two academies with different themes, brands and courses: every public page and endpoint shows only its own data; theme assets identical and tenant-free |
| Visual regression | Screenshot matrix (themes × pages × locales × widths × empty/rich); Themes 2–5 pixel diff 0 |
| Accessibility | axe (0 serious/critical), keyboard-only walkthroughs, focus visibility, reduced motion, 200% zoom, RTL |
| Performance | Lighthouse CI budgets (§H Phase 8), bundle budgets, image weight per page (Home ≤ 900 KB on mobile first load) |
| Theme initialization | New Academy × each of the 5 themes (Theme 1 v2, others unchanged) × both setup modes |
| Regression (existing) | The current website, e2e and frontend suites stay green; legacy Theme 1 content fixtures render |

---

## J. Acceptance criteria — "Theme 1 is complete"

1. **Completeness:** a newly provisioned Theme 1 Academy (complete mode) has Home with 11 sections plus Courses, Course Details, About, FAQs and Contact, all populated, with no placeholder copy and no empty containers. The preview is full immediately after provisioning.
2. **Honest public site:**
   - no fabricated testimonials, instructors or numbers are ever public;
   - no statistic shows 0;
   - live sections with no data are hidden or show a designed state;
   - the sample-content warning appears before publish.
3. **Images:** every image slot has a designed asset; every asset is self-hosted, versioned and license-recorded; there are designed no-image states; responsive `srcset`; zero CLS from images.
4. **Visual quality:**
   - the design review checklist passes (hierarchy, rhythm, type scale, CTA hierarchy, card quality, footer and nav polish);
   - it's clearly distinct from Themes 2–5;
   - it looks intentional at 390, 1024 and 1440px in EN and AR.
5. **Motion:** hero entrance, section reveals, card hover, carousels, count-up and accordion all work; `prefers-reduced-motion` disables every animation; only transform/opacity are animated; no autoplay.
6. **Responsive:** no horizontal overflow at 360–1920px; the mobile layouts match the plan (rails, stacked hero, sticky Course Details bar).
7. **Accessibility:** axe finds 0 serious/critical; complete keyboard operability; visible focus; contrast AA including with any brand colour (automatic fallback); correct landmarks and heading order; alt text EN/AR.
8. **Performance (mobile, fixture Academy):** LCP ≤ 2.5s, CLS ≤ 0.05, INP ≤ 200ms; Theme 1 JS ≤ 18 KB gzip beyond today; no new third-party origins; CSP remains enforced with 0 violations.
9. **Editing:** every seeded element can be edited, reordered, hidden, deleted or replaced (including images) through the existing Page Editor, in both languages. New section types are available in "Add section".
10. **Multi-tenancy:**
    - public endpoints and renders show only the resolved Academy's data;
    - generation runs only in the requester's RLS context;
    - theme assets are tenant-free;
    - isolation tests pass.
11. **Regression safety:** Themes 2–5 pixel-identical; existing Theme 1 academies render correctly; every existing suite stays green; backend changes are backward compatible (legacy pages parse unchanged).
12. **Architecture:** Theme 2 can be added without editing Theme 1 files (proved by a tiny test pack in unit tests).

---

## K. Risks and architectural concerns for Themes 2–5

| Risk | Why it matters | Mitigation in this plan |
|---|---|---|
| Duplicated components per theme | Five copies of a course card drift apart | Themes compose **shared primitives** (CourseCard parts, Rating, Price, ThemeImage, Carousel). A theme renderer is layout and style, not data logic. |
| Hard-coded content in renderers | Copy stuck in code can't be edited or translated | Renderers contain **no copy** besides UI chrome strings (i18n). All content is section data or live data. |
| Theme ↔ section-type coupling | A theme-specific type breaks after a theme switch | Every type joins the shared catalog **with a base renderer**. |
| Database coupling / schema limits | Deep, theme-specific JSON makes migrations painful | Additive optional fields only; `themeVersion`/`template_version` for deliberate evolution. The editor's single-repeatable-group limitation is respected by the new types (each has at most one list). |
| Media coupling | Tenant uploads reused across academies; disappearing assets | Theme assets are tenant-free, versioned and immutable; tenant media stays in its own R2 prefix; a manifest test guards against deletions. |
| Theme-switch surprises | The Owner expects the new theme's layout | The look switches immediately; the composition is an explicit, previewed, reversible action (built with Theme 2). |
| No page-level drafts | Seeded or regenerated content could go live unexpectedly | Provisioning never publishes; the "apply layout" action writes to the preview flow with backup. A page draft model is a candidate future improvement (out of scope here, but flagged). |
| All pages in one public payload | Pages grow with rich content | Content is references, not bytes (theme assets, R2 URLs); the base64 upload fix; per-page fetch is a later optimisation if payloads exceed 150 KB. |
| Performance creep from motion | Every theme adds effects | CSS-first motion primitives, bundle budgets in CI, LCP-safe hero rule. |
| Live-data sections look broken on young academies | Every theme has this problem | Shared hiding rules plus designed empty panels in the base primitives, inherited by every theme. |
| Existing Theme 1 sites change look on deploy | Customers see a redesign without asking | DECISION 3 (recommended: ship to all, verified on legacy fixtures first). |
| Legal: stock image licenses, fake reviews | Real business risk | License manifest (DECISION 1); sample-content rule (DECISION 2). |

---

## L. Final recommendation

1. **What changes**
   - Theme 1 gets its own presentation layer (renderers, chrome, visual system, motion), its own page compositions for every page, bilingual starter content and a real image set.
   - Live sections gain honest empty behaviour.
   - Uploads stop being inlined as base64.
2. **What stays**
   - The data model and tenancy boundaries.
   - Sections as typed data.
   - The backend template registry and idempotent provisioning-time generation.
   - Bilingual `LocalizedText` and routing.
   - One renderer on every surface.
   - The public course APIs.
   - Themes 2–5 exactly as they are.
3. **What gets refactored**
   - The theme registry becomes a **ThemePack** registry.
   - `SectionRenderer` dispatches through the pack with a base fallback.
   - `CourseDetailsTemplate` is split into composable parts.
   - The image field is routed through media upload.
   - The inline hero/card styling becomes shared primitives.
4. **What gets introduced**
   - 4 shared section types (`pageHeader`, `courseCategories`, `steps`, `featureSplit`) plus optional field extensions.
   - `GET public/websites/:id/categories`.
   - The theme asset pack, resolver and immutable caching.
   - CSS-first motion primitives.
   - The sample-content flag and publish-readiness check.
   - Optional template provenance columns.
5. **Why this supports Themes 2–5**
   - Composition (backend template), presentation (frontend pack) and content (shared contracts) are three independent axes.
   - A new theme is a new pack plus a template plus an asset pack, touching nothing in Theme 1.
   - A theme switch can never break rendering, because every section type has a base renderer.
6. **How Theme 1 becomes genuinely complete**
   - Rich compositions on every page, generated at provisioning.
   - Real imagery with designed fallbacks.
   - A designed state for every data condition (empty, loading, sample, rich).
   - A deliberate visual system and motion.
   - Everything verified by screenshots, accessibility, performance and isolation gates before release.

### L.4 Decisions needed before Phase 3 and Phase 7

| # | Decision | Recommended default |
|---|---|---|
| 1 | Image source for the Theme 1 asset pack (~18 images) | Licensed stock, self-hosted, with a license manifest (you or legal confirm the license terms); brand-pattern SVGs for course-card fallbacks |
| 2 | Sample social proof policy | Seeded testimonials are `sample`: visible in preview with a badge, hidden publicly until confirmed; stats and instructors are live-only; a pre-publish warning |
| 3 | Existing Theme 1 academies | Ship the new presentation to all Theme 1 sites (after legacy-fixture verification). Offer no automatic content change; a later opt-in "refresh starter content" uses template provenance |

Phases 0–2 don't depend on these decisions and can start as soon as you approve the plan.
