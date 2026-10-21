# Atlas B1 build spec: brand, M1a marketing site, SEO

**Compiled:** 20 Oct 2026, read-only extraction from the planning package. Nothing here is new policy. Every row cites its source. Where sources disagree, §G lists the conflict and the rule that wins.
**Scope:** B1 items S-1 (brand), S-2 (M1a site), S-3 (assets), S-4 (pricing), S-5 (SEO), plus the parts of S-6 (beacon) and S-9 (launch checks) that engineers build now.

## 0. Read this first

### 0.1 Abbreviations (paths under `scratchpad/atlas-planning/` unless noted)
| Short | File |
|---|---|
| RM | `11-roadmap/implementation-roadmap.md` (v2) |
| IA | `07-website/new-site-information-architecture.md` |
| LPB | `07-website/landing-page-blueprint.md` |
| ASP | `07-website/screenshot-and-magnific-asset-plan.md` |
| BDA | `07-website/brand-and-design-system-audit.md` |
| RMP | `07-website/route-migration-plan.md` |
| CMSA | `07-website/current-marketing-site-audit.md` |
| MDS | `09-seo/metadata-specification.md` |
| SEO | `09-seo/seo-strategy.md` |
| TAC | `09-seo/technical-acceptance-criteria.md` |
| RDM | `09-seo/redirect-matrix.csv` (line numbers = CSV lines incl. header) |
| POS | `04-market/positioning-and-messaging.md` |
| PMC | `04-market/product-marketing-context.md` |
| PRC | `05-pricing/pricing-and-packaging-proposal.md` |
| AMP | `10-analytics/analytics-and-measurement-plan.md` |
| REC | `12-governance/cross-file-reconciliation.md` (overrides IA/LPB/ASP/MDS on its points) |
| DISP | `12-governance/proposal-dispositions-2026-10-14.md` (70 XC/XW/XD/XB/XA rulings, DL-41) |
| DLF | `12-governance/risks-assumptions-decisions.md` (decision log DL-xx) |
| AC | `12-governance/approval-checklist.md` |
| OQ | `12-governance/owner-questions.md` |
| RR | `12-governance/review-register.md` |
| INV | `11-roadmap/b0/B0-INVENTORY.md` |
| P2B | `11-roadmap/b0/PHASE2-B-RESULTS-2026-10-19.md` |
| GLO | `11-roadmap/b0/DOC-07-arabic-glossary-DRAFT.md` |
| CRN | `assets/magnific-concepts/concept-round-notes.md` |
| MP | `ATLAS_COMPLETE_MASTERPLAN.md` |
| B1P-03/04/05/06 | `scratchpad/b1-prep/0x-*.md` |
| MKT-v1 | `scratchpad/ATLAS_MARKETING_PLAN_v1.md` (= `research/00-preliminary-marketing-plan-v1.md`, byte-identical; **superseded**) |

**Precedence** (REC L6–7; DISP §0): code and live evidence, then owner decisions (DL/OQ), then the specialist file (05-pricing for prices, POS for claims and vocabulary, 09-seo for URLs, metadata and redirects). A later explicit correction beats an earlier file. Website, SEO and analytics files are "Approved working direction (AC A5)". Implementation is gated by RM v2 and the review register (DISP XW-11).

### 0.2 State of play on 20 Oct 2026 (it changes what can render)
These facts postdate the b1-prep pack (14 Oct). Several gates in b1-prep are now closed, or have moved.
- **B0 is closed** (DL-49, DLF L434; INV L3). **B1 is NOT started.** It starts only on a separate owner go-ahead, after entry criteria E-2…E-5 (B1P-03 §3). Building is allowed as prep. Publishing, switching, sitemap submission and posting are not (RM L313).
- **DL-47** (19 Oct, DLF L432): 127 open B0 records moved to B4. **Moving a record does not make any claim it gated true. The §11.2 claim gates stay in force** (MP C.0.5a L1477–1479).
- Gate status of the records that drive the marketing site (INV §2 rows; P2B):

| Gate | Record | Status | Effect on M1a |
|---|---|---|---|
| Payment claims (S1 payment wording, S2 fact 4, S4, hub phrase, SS-006…009) | B0-OC-09 | **DONE — OWNER CONFIRMED** (DL-48) | Payment sections may render. The pass unlocks them (DISP XA-01) |
| Trace sentence, SS-011…017, hero SS-012 overlay, VID-001 code part, VID-002 | B0-OC-10 (A9), B0-MED-06 | **MOVED TO B4** | Stay hidden. Hero uses the plain-ground default (XA-02) |
| Catalog for `/pricing`, S11, academy counts | B0-OC-27, CAT-02 | **DONE — VERIFIED** (19 Oct). The public catalog equals the approved ladder; 14-day trial verified (CAT-05) | Pricing renders from `GET /public/plans` |
| Premium/USD removal | B0-CAT-03 | MOVED TO B4 (partially complete). P2B: Premium "hidden on every list"; checkout refuses hidden Premium keys | See §G C-12 |
| Name and logo public use, favicon included (RV-08) | B0-OC-25 | **MOVED TO B4** | Build and stage the logo. No public use. Blocks go/no-go line 1 (§G) |
| Counsel reviews RV-02/03/07/12/13/19/20 (RP-2) | B0-OC-24 | MOVED TO B4 | Legal pages and the beacon consent question stay unreviewed. Blocks the B1 exit |
| Arabic native review RV-14 | B0-OC-32 | MOVED TO B4 | Every AR string ships "Pending — not reviewed". Blocks the B1 exit |
| Entity details: footer identity line, About, Organization schema (RV-16) | B0-OC-17 | MOVED TO B4 | Footer identity line is a launch gate (LPB B.4) |
| Magnific licence + archive + provenance | B0-OC-19 | MOVED TO B4 | **No MG asset may be released.** OG plates need a non-Magnific background |
| Demo academy identity | B0-OC-29 | MOVED TO B4 | Captures and the `/verify` demo link need it |
| Flag values for capture manifests | B0-OC-07 | MOVED TO B4 | Record flags per capture anyway |
| Text lessons in frames | B0-LRN-01 | MOVED TO B4 | Text lessons are never shown or described (REC R-12) |
| Academy robots/sitemap per host | B0-WEB-01 | MOVED TO B4 (deployed, partially verified) | M0 and go/no-go line 14 depend on it |
| Contact consent fields | B0-SUP-04 | MOVED TO B4 (deployed, not verified) | Go/no-go line 10 needs "consent stored" |
| "free trial" in Privacy/Terms and in-product | B0-CPY-24 | MOVED TO B4 | The banned-string lint fails on the legal pages (§G C-9) |
| Google sign-in | B0-OC-12 | DONE — OWNER CONFIRMED | The gate is closed, but the claim stays banned until the claims register is updated (§G C-18) |
| Holding page at `/`, `/ar`; scaffold removed; `/blog` 404; contact verified | B0-WEB-13 | **DONE — VERIFIED** (19 Oct) | The rollback target is `ATLAS_MARKETING_STATIC=off` = holding state (REC R-15). Code: FE `src/features/home/holding/`; a `/contact` page exists (INV L1225–1249) |
| Search Console / Bing | B0-OC-18 | DONE (URL-prefix verified) | M0 can proceed |
| WhatsApp number / handles | OC-26, OC-30 | DONE (handle `atlas_edu`) | No social icons until the profiles are real (IA L327) |
| TOTP on the Platform Owner | B0-OC-01 | DEFERRED, carried (DL-32) | Go/no-go line 13 |
| Owned domain | B0-OC-22 | DEFERRED → WS-NAME (DL-39) | Canonical origin = `https://atlass.dpdns.org` |

---

## A. Brand

### A.1 Name and positioning
| Item | Spec | Source |
|---|---|---|
| Name | **Atlas / أطلس**. "Atlas is a temporary working name; the current domain stays." Build everything **rename-ready**: the brand name is a token in copy and config, and the symbol is separable from the wordmark | AC A1; DL-13 (DLF L398); DL-39 (DLF L424); DISP XA-10 |
| Brand token | `{Brand}` = "Atlas" / «أطلس». Titles are re-measured if the name changes | MDS L9 |
| Positioning (approved) | **P5: "Your own academy under your name, for Egyptian teachers who already sell online."** Primary: segment 1a. Secondary: multi-academy operators. Test wedge: IG tutors | AC A2; DL-15; OQ-01 (OQ L55); POS §C L186–210 |
| Category statement AR | منصة تعليمية باسمك للمدرسين اللي بيبيعوا كورساتهم أونلاين في مصر | POS D.1 L215 |
| Category statement EN | Your own branded academy platform for Egyptian teachers who sell their lessons online. | POS D.1 L216 |
| Core promise | "Move your paid students from WhatsApp groups to your own academy: they pay you by wallet or InstaPay, you approve once and they're in, and every video they watch carries their code" | POS P5 table (≈L96) |
| Internal positioning statement (not copy) | POS D.2 L218–219 | |
| Message hierarchy | 1 category + promise → 2 pillars → 3 proof (2 devices, 1 screen, 730-day trace record, 4 designs, 17 section types, custom domain, 0 % commission on manual payments) → 4 honest limits | POS D.4 L263–269 |
| Pillar order for 1a | Pillar 2 (payments) → 3 (protection) → 1 (own name) → 4 (team) | POS D.5 L271–278; LPB A.2 L20–22 |
| Rejected | Demo taglines "The operating system for education businesses" and "One platform to launch, run and grow your education business" | PMC L247; BDA L20 |

### A.2 Tagline candidates (options, not final; each needs a distinctiveness check)
POS D.7 L322:
- AR: «أكاديميتك باسمك» · «منصتك، باسمك، وفلوسك ليك»
- EN: "Your academy, your name" · "Your students, your academy"
- Note: Taalemy's "your own branded teaching website" is close to EN-1. Sharp's distinctive-asset point says to pair the line with the **code motif** (adopted, OQ-32 L83).
- Superseded (do **not** use): MKT-v1 §2 «منصتك التعليمية باسمك… في يوم واحد» ("in a day" is banned) and "Arabic-first … live in a day … hidden code".

### A.3 Headline directions (POS D.7 L300–320; checked against AI tells)
| # | AR | # | EN |
|---|---|---|---|
| AR-1 | أكاديميتك أونلاين، باسمك وعلى الدومين بتاعك | EN-1 | Your teaching academy, under your name and on your own domain |
| AR-2 | طلابك يدفعولك فودافون كاش أو إنستاباي، وبموافقة واحدة يدخلوا الكورس | EN-2 | Students pay by Vodafone Cash or InstaPay. You approve the proof and they're enrolled. |
| AR-3 | كل فيديو بيتشاف في أكاديميتك عليه كود الطالب اللي بيتفرج | EN-3 | Every video watched in your academy carries the viewer's code |
| AR-4 | اشتراك الطالب يشتغل على جهازين بس، وشاشة واحدة في نفس الوقت | EN-4 | Each student account works on two devices, one screen at a time |
| AR-5 | لو فيديو اتسرّب والكود باين فيه، نقدر نقولك اتفرج من أنهي حساب (**gated OC-10 → hidden**) | EN-5 | Found a copy of your lesson online? Send us the code on screen and we'll tell you which account watched it. (**gated**) |
| AR-6 | ضيف مساعدينك كمدرسين، وكل واحد يشوف كورساته بس | EN-6 | Add your assistants as instructors. Each one sees only the courses they teach. |
| AR-7 | انقل طلابك من جروبات الواتساب لأكاديمية باسمك | EN-7 | Open a second academy for a new subject from the same account |
| — | — | EN-8 | Move your paid students from WhatsApp groups to an academy with your name on it |

**CTA directions** (POS L324): «ابدأ تجربة أكاديميتك» / "Start my academy trial". «كلمنا على واتساب نجهزها معاك» is used only if the owner approves WhatsApp-assisted onboarding. **Never** "Get started free".

### A.4 Voice and personality (PMC §10 L238–249; MKT-v1 §2 "Brand voice", where consistent)
- **Tone:** warm, direct, calm, a knowledgeable colleague («زميل فاهم»), never a salesman.
- **Five adjectives:** honest, practical, precise, warm, steady.
- **Language:** Egyptian Arabic first for teacher-facing copy; MSA-leaning for legal and docs; English secondary and plain.
- **Units:** speak in the teacher's units (students, months, payments, leaks, exam season). Short sentences. Facts over adjectives.
- **Limits:** say what Atlas does and where it stops in the same breath.
- **Never:** exclamation marks, unproven superlatives, counts, logos or testimonials.
- **AI-tell rules** (LPB A.4 L34; MDS L41): no "it's not X, it's Y" reveals, no negation lists, no trailing pile-ons, no self-answered questions or colon reveals, no em dashes in short copy, at most one fragment and one list of three per section, no stock openers.
- **Arabic register** (OQ-33 L84; LPB L35; B1P-05 §2.1):
  - Egyptian colloquial (عامية مصرية مهذّبة) for headlines and buttons;
  - MSA-leaning Egyptian for body and disclosures; legal text MSA-leaning;
  - `ar-EG` Arabic-Indic digits, never mixed within a page;
  - glossary follows the shipped UI wording; Latin names (InstaPay, Vodafone Cash) in `<bdi>`;
  - no English fallback text on AR pages.

### A.5 Audience
- **Primary (1a):** "brand" secondary-stage teachers (**Thanaweya Amma**, preparatory) who already sell recorded lessons and monthly access to hundreds of students, usually with assistants. Today they use YouTube unlisted, WhatsApp/Telegram groups, and Vodafone Cash/InstaPay screenshots (PMC §2 L74–93; LPB A.1 L14).
- **Secondary:** teacher-entrepreneurs running several academy brands; multi-teacher teams (segment 6).
- **Test wedge:** IG/international-curriculum tutors (segment 9).
- **Personas:** brand teacher (buyer); assistant/manager (champion; **cannot approve payments**, owner-only COM-2.0); technical influencer; student (end user); parent (nothing offered: do not promise) (PMC §3 L95–110).
- **Centres:** physical centres buying attendance software are **anti-personas**. Never use «السناتر» framing in public copy (PMC §7; POS D.5; LPB S3). MKT-v1 lists centres as "Secondary"; that is superseded.
- **Anti-personas** (PMC §7 L182–190): teachers who need a store app now or WhatsApp/parent messaging; tutors under ~20–50 students; buyers who need card checkout, coupons or international payments; "100 % cannot be recorded" buyers; schools needing SIS/SSO; anyone who needs live classes.
- **Customer words** (PMC §9 L203–236):
  - Use: منصة/أكاديمية باسمك، الدومين بتاعك، طلابك، اشتراك الشهر، فودافون كاش، إنستاباي، تحويل بنكي، إثبات الدفع، توافق وتفعّل، كود الطالب، جهازين، مراجعة، امتحان، واجب، شهادة، ثانوية عامة.
  - Glossary: Organization → «حسابك»; Academy → «أكاديميتك»; watermark code → «كود المشاهد / viewer code».

### A.6 Logo and brand pack (DL-13 "Claude-designed")
| Item | Spec | Source |
|---|---|---|
| Authority | Claude designs the logo (symbol, typography, EN/AR lockups, exports) **with no separate approval**. DL-13 and OQ-02 say "within the existing palette" (see A.7 and §G C-1) | AC A1; DL-13; OQ-02 (OQ L56); RM §3.1 item 1 L205 |
| Supersedes | BDA L225 / ASP L18, L123 / RMP R-18, A-08 "export from `AtlasLogo.tsx`, no redraw" | DISP XA-10 |
| Rename-ready | Symbol separable from the wordmark; name as a token | DL-39; XA-10 |
| BR-001 logo pack | SVG: mark; mark + EN wordmark; mark + AR wordmark «أطلس». Mono and reversed versions. PNG at 112, 256 and 512 px (for schema and OG). Vector design tool, **not AI** | ASP A.7 L125; B1P-05 §1.5 |
| BR-002 favicon/app icons | `favicon.svg` + PNG 32/180/192/512; `theme-color` light/dark (the planning tokens are #15696F / #38AAB2; see A.7). Replaces the Vite favicon (purple `#863BFF`, BDA L18). Academy hosts keep `useAcademyFavicon` | ASP L126; MDS L27; TAC B-8, G-9 |
| OG templates | MKT-OG-001…006 (see D.4). Headline set by a designer in the display face; **never AI-rendered text** | ASP L127–130 |
| Distinctive asset | The "code motif" (short dashes and dots that never form characters) is adopted (OQ-32). MG-010 vector is later; Claude vectorises it and the owner approves the motif | OQ-32; ASP L159; DISP XA-15 |
| Trademark note | Claude desk research handed to counsel. **Never claim clearance** | RM L205; DL-13 |
| Gate | **RV-08 (= B0-OC-25) before ANY public use, favicon included**, social avatars too. B0-OC-25 has moved to B4 (§0.2) | RM L205; P-01 guard (B1P-04 §0.2) |
| Existing mark (reference only) | Inline SVG 32×32 rounded square (`rx=9`), "three ascending meridians" A-shape, stroke 2.1, crossbar 75 % opacity; wordmark in the display face, semibold, `tracking-tight` | BDA §1 L16–17 |
| Arabic lockup | Owner open item in BDA §11; DL-13 delegates it to Claude. GLO: Latin "Atlas" leaks into 71 Arabic UI strings, so use «أطلس» in AR | BDA L239; GLO summary |

### A.7 Colour (as recorded in the planning files; **the owner has since rejected teal and purple/indigo as brand colours**, so treat this as history plus constraints, not a recommendation)
- **What the files specify:** "Atlas Deep Teal" (hue 184) is the single saturated brand hue (BDA §2.1–2.2 L34–73; LPB A.3 L29). Rule BDA §10.2 L223: "A palette change is a rebrand: [OWNER]". DL-13 says the logo is "within the existing palette". All of this now conflicts with the owner's rejection (§G C-1).
- **Recorded token values (current product UI, `src/index.css`):**
  - brand ramp 50…900 = #F0F9F9, #DAEFF1, #B3DDE0, #80C6CB, #3DAFB8, **#21858C** (500, ring), **#15696F** (600 = light primary), #10565B (700 hover), #0D4045, #0C2E32;
  - primary: light #15696F / fg #F4FAFB; dark #38AAB2 / fg #092225;
  - neutrals tinted at hue ~199;
  - background: light #FCFDFD / dark #0E171B;
  - foreground: #142229 / #ECF2F3;
  - surface: #F6F8F9 / #121C21;
  - border: #DBE2E6 / #29373D;
  - semantic colours:
    - destructive #C3282D / #C94045;
    - success #267E55 / #3C9A6E;
    - warning #C88819 / #D89B31;
    - info #2762A5 / #4A85C9;
  - the full table is in BDA L49–73.
- **Contrast already computed** (BDA §2.5): primary on fg 6.07:1 (light) and 5.97:1 (dark); muted-fg on background 5.03:1. Re-verify all pairs with a tool.
- **Constraints that survive any palette** (BDA §2, §10):
  - components never hard-code colours; tokens on `:root` (light) and `.dark`, exposed as `hsl(var(--token))`;
  - "pure white and pure black are never used" (tinted neutrals); one saturated hue "used sparingly";
  - any new marketing token (e.g. the hero ground replacing raw `#05120f`) gets light and dark values (BDA §10.1; LPB L29);
  - the marketing design system governs `PUBLIC_ROUTES` only and must not alter the dashboard's tokens or leak into academy sites (`.website-theme-scope`) (BDA §10.11, §2.4);
  - contrast ≥ 4.5:1 body in both themes (LPB S1 a11y; F.1).
- **Default theme:** light (MASTER §10; OQ-44 L94 "light marketing theme"). The theme switcher is removed from the marketing header (IA L305). Acceptance still tests axe in **light and dark** (LPB F; go/no-go line 4), so a dark palette must exist (§G C-2).
- **Imagery palette** (Magnific art direction ASP B.2 L140; CRN): anchored on teal + cream + soft gold. It must be re-specified if the brand hue changes.
- **Anti-patterns** (BDA §9; LPB A.3): glassmorphism, gradient meshes, 3×3 identical cards, `shadow-lg`, mixed radii, decorative badges, dark as default, backdrop-blur, neon glows.

### A.8 Typography and Arabic fonts
| Role | Spec | Source |
|---|---|---|
| Display | **Readex Pro** (Latin + Arabic), 300–700, self-hosted WOFF2 | BDA §3 L103; LPB A.3 |
| Body | **Rubik** (Latin + Arabic), 300–700 | BDA L104 |
| Mono | JetBrains Mono | BDA L105 |
| Rule for any new face | "Any new marketing font must have full Arabic coverage, or be paired with a matching Arabic face and tested." OFL or commercial licence on file; self-hosted (CSP `font-src 'self' data:`). Plus Jakarta Sans was rejected for having no Arabic. UI/UX Pro Max suggestions (Noto Naskh, Libre Bodoni/Public Sans) were rejected | BDA L128, §10.3 L224; LPB A.3 L27 |
| Not brand fonts | Academy theme faces (Alexandria, IBM Plex Sans Arabic, Markazi Text, the theme displays) | BDA L106 |
| Loading | ≤ 2 preloaded WOFF2 subsets (the display face in the page's script), `font-display: swap` | LPB §H L311 |
| RTL type | `rtl:tracking-normal`, `rtl:leading-[1.5]` on headings; numerals via `NumericExpression` / `isolateNumericExpression` | BDA L125–127; LPB D L272 |
| Marketing scale | Hero h1 `text-[2.5rem] sm:text-6xl lg:text-7xl`, `tracking-[-0.03em]`, `leading-[1.05]`, `max-w-[22ch]`. h2 `text-3xl sm:text-4xl lg:text-5xl`. Lead `text-base sm:text-lg`, `max-w-[58ch]`. Mobile hero H1 2.25–2.5 rem (AR leading 1.5) | BDA L120–124; LPB S1 L85 |
| OG text | Set in Readex Pro by a designer | MDS L146; ASP L127 |

### A.9 Components, layout, icons and motion (keep consistent with the product)
- **Stack:** shadcn/ui + Radix + Tailwind 3.4, react-hook-form + zod, i18next, framer-motion only (**GSAP rejected**), lucide-react only (stroke 1.75, `aria-hidden` beside text, `rtl:-scale-x-100` when directional, no emoji). Primitives: `MarketingContainer`, `MarketingSection`, `SectionHeading` (BDA §5–6, §8).
- **Layout tokens:** `max-w-marketing` 75 rem; header 3.75 rem; sections `py-16 lg:py-28`; gutters `px-5 sm:px-6 lg:px-8`; hairline dividers; **at most one tinted block per page** (the closing CTA); `radius-xl` 0.875 rem cards (BDA §4).
- **Motion** (LPB §E L275–279):
  - presets `RISE_VARIANTS` (8 px, 220 ms) and stagger ≤ 50 ms per item and ≤ 0.5 s total;
  - opacity and transform only; `whileInView` once with −80 px margin;
  - global `MotionConfig reducedMotion="user"`;
  - no loops, no parallax, no scroll-jacking, no autoplaying carousels.

### A.10 Banned strings (lint on rendered EN + AR HTML, `<title>`, meta, OG, `llms.txt`, `pricing.md`, alt text)
Consolidated in B1P-05 §4; sources LPB A.4 L33, MDS §1.1 L30–42, POS D.8 L326–343, IA L21, RM WS-02 acceptance.

| Group | Strings |
|---|---|
| Price/trial | free · مجاني · ببلاش · "start free" · "free trial" · «تجربة مجانية» · literal "3-day" / «٣ أيام» (any hard-coded trial length) · "Free" label · prices or currencies in metadata · **USD** · **Premium** rows |
| Protection | DRM · "prevents recording" / «يمنع التسجيل» · "blocks screen recording" · "cannot be recorded" · 100 % / «حماية 100%» · "impossible to leak" / «مستحيل يتسرّب» · "leak-proof" · "hidden watermark" / «علامة مائية مخفية» · "hidden code" · "burned into" · "find the leaker yourself" · "your YouTube links are protected" · "device lock" / «قفل الجهاز» |
| Unbuilt/hidden | "upload your videos" / «ارفع فيديوهاتك» / hosted video · automatic/instant payment (دفع تلقائي/فوري) · Fawry · card payment · coupons · app / «تطبيق» · live / «لايف» · blog / «مدونة» · WhatsApp **as a feature** (allowed as the status quo) · SMS/parent notifications · anti-cheating / proctoring / integrity · text lessons |
| Speed/rank | "Arabic-first" / «عربي بالكامل» · "in minutes" / «في دقائق» · "in a day" / «في يوم» · "most popular" / «الأكثر اختيارًا» · best / #1 / leading |
| Roles/data | administrator / staff roles · "managers can add students" · "revenue dashboard" / «أرباحك في الداشبورد» · "combined revenue" · "date-range reporting" · "your team approves" · "Atlas reviews manual payments" · bulk import · transfer ownership |
| Other | "Sign in with Google" · "ranks on Google" · compliance badges · uptime figures · enforced 2FA / session timeout · competitor names · «السناتر» · "Only you can see" · "Auto-renew" · "tenant isolation" / "RLS" / "operating system for education" / «منصة تعليمية متكاملة» |
| Social proof | testimonials, ratings, reviews, customer or student counts, logos, case studies |

- **Replacement wording** (REC R-03 L20–23): annual = "Pay for 10 months, use 12" / «ادفع ١٠ شهور واستخدم ١٢» (or "Save EGP {x} a year"); trial row label = "Trial" / «فترة التجربة»; founding (B2) = «التجهيز معانا مشمول».
- **Allow-list** (TAC A-8): "WhatsApp" and "YouTube" as the visitor's current tools; «مجاني» only inside docs about free courses (B2).
- **Protection pairing:** always "deters and traces" / «يردع ويكشف», scoped to "videos watched in your academy" (POS D.9 rules 1–3).

### A.11 Claims register (what we may and may not claim)
Mechanism: `content/claims.yaml` maps section → feature IDs → gate → open/closed. The build hides gated sections. A PR adding a gated claim cannot merge. Go/no-go line 2 checks it (RM WS-03 L593–607; B1P-05 §4; LPB A.4 L36: feature ID per claim in the content source).

| Claim | Status for B1 | Source |
|---|---|---|
| Own subdomain the moment the academy is created; Arabic and English pages; 4 designs; logo sets the colours; 17 section types | **May say** (ACD-6.2 prod-verified; WEB-2.1, ACD-5, WEB-6.7 Tested) | POS P1 L223–230 |
| Connect your own domain | May say generically. **"On every plan" and SS-020 only after a live custom domain is verified** (CF-28; WEB-11 → B4) | REC R-06; IA L169 |
| Students pay by Vodafone Cash / Orange Cash / Etisalat Cash / WE Pay / InstaPay / bank; upload proof; you approve once; enrolled and emailed; reject with a reason; money goes straight to you; **0 % commission** on these payments | **May say** (OC-09 done, DL-48). Say "you approve" (owner-only) | POS P2 L232–239; XA-01 |
| 2 devices, 1 screen at a time; third device refused; student frees a device on the Devices page | May say (MED-6.x Tested). SS-013/014 still gated by OC-10 | POS P3; claims table |
| Code tied to the viewer's account on every video watched in your academy; "deters and traces" | May say, **with the required YouTube disclosure** (A.12). Review RV-12 is pending | POS L241–249; LPB S5 L143 |
| "Send us the code and we'll tell you which account" (trace) | **Hidden** (OC-10/A9 + lookup process → B4) | B1P-05 §4 |
| Owner, manager, instructor roles; instructors see only their courses; several academies in one account | May say. Academy counts **from the catalog** (Teacher 1 / Academy 1 / Organization 5) | POS P4; REC R-05 |
| Quizzes (5 question types), assignments (due dates, late policy, feedback), certificates verifiable online | May say. **No integrity wording** in B1 (claims register not updated, §G C-18) | POS L117–119; IA §3.7 |
| Each academy's data separated in the database, verified in production; email sign-in code on new devices; watermark records encrypted, kept 730 days, operator-only, lookups audited; payment credentials encrypted at rest | `/security` "can say" list, subject to RV-13 | IA §3.9 L246 |
| No backup statement | Until the owner confirms the schedule (OPS-08 now has daily/weekly backups, DL-47; still owner wording) | IA L245 |
| Response time / "every message is read by a person" | Only with an owner commitment. OQ-23: Teacher 2 business days, Academy/Organization 1 business day, "publish only what can be kept"; WhatsApp first reply ≤ 2 business hours (OQ-13) | IA L268; LPB S13; OQ L65, L74 |
| Hosted video | Only "planned for launch, pending production enablement" behind gate `VIDEO-ACTIVE`; no availability claim (DL-33). Recommendation: omit in M1a | DL-33; B1P-05 §4 |
| Testimonials, logos, counts, case studies | **Never** until real, consented evidence exists. "There are no proof points yet" | PMC §11 L251–253; POS D.9 rule 6 |
| Competitor comparisons | Never in B1 (CF-09; RV-09 B2+) | IA §7; POS D.9 rule 8 |
| Time claims | Never without measured data | POS D.9 rule 9 |

### A.12 Required disclosures (verbatim, inline, body-size, in the no-JS HTML)
- **YouTube disclosure** (LPB S5 L143; POS L106):
  - AR: «الدروس فيديوهات يوتيوب بتتعرض جوه أكاديميتك. الطالب اللي مصمم يقدر ينسخ لينك يوتيوب نفسه. الكود بيردع تسجيل الشاشة جوه الأكاديمية وبيساعد نعرف مصدر النسخ اللي اتعملت منها.»
  - EN: "Lessons are YouTube videos played inside your academy. A determined student can still copy the YouTube link itself. The code deters screen recording inside your academy and helps trace copies made there."
- **Payments honest limit** (IA L185): "Approval is manual and done by the account owner. There is no card or Fawry checkout today."
- **Demo label** on every screenshot caption: «محتوى تجريبي» / "Demo content" (or "Demo academy") (ASP A.1 rule 3).

---

## B. Site IA (M1a)

### B.1 Pages and URLs
EN at the root, AR under `/ar` with the **same Latin slugs**, no trailing slash, lowercase, apex canonical on `https://atlass.dpdns.org` (OQ-04; RMP §2; DL-39). M1a = **8 pages + branded 404 per language** (B1P-03 S-2; RM §3.1 item 2; DISP XW-01: the full set is 13 per language, with the 5 feature pages in M1b).

| Page | EN | AR | Nav | In sitemap | Render |
|---|---|---|---|---|---|
| Home | `/` | `/ar` | Logo | yes | static |
| Product hub | `/features` | `/ar/features` | Header "Product" (dropdown first item) | yes | static |
| Pricing | `/pricing` | `/ar/pricing` | Header | yes | static, built from the catalog |
| Security & privacy | `/security` | `/ar/security` | Header + footer | yes | static |
| About | `/about` | `/ar/about` | Footer (mobile drawer) | yes | static |
| Contact | `/contact` | `/ar/contact` | Header + footer | yes | static + form |
| Privacy policy | `/privacy-policy` | `/ar/privacy-policy` | Footer | yes (low priority) | static, URL-selected language |
| Terms | `/terms` | `/ar/terms` | Footer | yes (low priority) | static, URL-selected language |
| 404 | any unknown path | any unknown `/ar/*` | — | **no**; `noindex`, no canonical, no hreflang, no OG | static branded, HTTP 404 |
| **Planned (DL-37)** | `/features/academy-website`, `/features/payments`, `/features/content-protection`, `/features/teams-and-academies`, `/features/quizzes-and-certificates` | same under `/ar` | Header dropdown + hub + footer, **visibly labelled "Planned"** (AR via RV-14) | **no** (nor hreflang, llms.txt, pricing.md, search) | `status:'planned'` in the manifest → **genuine HTTP 404** with the branded page; no redirect, no catch-all 200 |

- **App and system paths** (`noindex`, never prerendered): `/dashboard*`, `/auth*`, `/onboarding*`, `/academy-chooser`, `/verify/:code`, `/403`, `/index.html` (SEO §4.1 L118–127). Since DL-63 the app is served on `https://dashboard.<base>` (`dashboard.atlass.dpdns.org`); old app links on the apex `301` to the same path there.
- **Not in scope:** `/design-partners`, `/founding`, `/demo`, `/partners`, `/press`, `/resources*`, `/docs*`, `/blog*` (404), `/lp/*`, `/solutions/*`, `/compare/*` (DISP XW-06, XW-07; IA §7).
- Sources: IA §2.3 L99–122; DISP XA-03; REC R-13; RDM L44–53.

### B.2 Global chrome
| Element | Spec | Source |
|---|---|---|
| Header ≥ 1024 px | Order in reading direction: Logo (→ `/` or `/ar`) · **Product** dropdown (Product overview first, then the 5 planned items with one-line descriptions) · Pricing · Security · Contact · end cluster: language link · Sign in (`/auth/sign-in`) · CTA-T button (rightmost in EN, leftmost in AR). ≤ 6 primary items | IA §4.1 L294–306; LPB B.1 |
| Header style | Sticky; `--header-height` 3.75 rem; `bg-background/90` **without backdrop-blur**; hairline border after 8 px scroll; logical properties; the dropdown opens to the inline end | LPB B.1 L46–47 |
| Signed-in state | CTA → "Go to dashboard" → `<app>/dashboard` (`https://dashboard.<base>/dashboard`, DL-63); Sign in hidden | IA L306; RMP §6 |
| Tablet/mobile | Bar: logo · language link (short "ع"/"EN" with a full accessible name) · compact CTA "Start trial" / «ابدأ التجربة» · menu. Drawer = Radix Sheet from the inline end, focus trap, Escape; lists Product (expanded), Pricing, Security, Contact, About, **Sign in**, language. Targets ≥ 44 px | IA §4.2 L308–310 |
| Header acceptance | Tab order logo → nav → language → Sign in → CTA. Dropdown: Enter/Space/ArrowDown opens, Escape closes and returns focus. `aria-current="page"`. No overflow at 375 px; CTA visible | LPB B.1 L49 |
| Language link | Real `<a href>` to the paired URL (anchor kept), label in the target language with `lang` and `hreflang`. No-JS HTML must contain `<a href="/ar" hreflang="ar" lang="ar">العربية</a>` on `/` and the reverse on `/ar` | LPB B.2 L51–57; TAC A-5 |
| Suggestion bar | Non-modal, dismissible, `role="region"` + label; client-side only after hydration; never a redirect; shown when the stored preference (only with Preferences consent) or `navigator.language` differs. **No IP or Accept-Language redirects** | IA §4.6 L332–334; RMP E-9 |
| Sticky mobile CTA (< 768 px) | Bottom bar (CTA-T + "Pricing" link) after the hero CTA leaves the viewport (IntersectionObserver). Hidden when S14 or the footer is in view, with the cookie banner open, or a field focused. Reserves its own height; safe-area insets. **Not on `/contact`, legal pages or `/security`** | IA §4.3 L312–315; LPB B.3 L60 |
| Footer | Product (overview + 5 planned + Pricing) · Company (About, Contact, Security & privacy) · Legal (Privacy policy, Terms, **Cookie preferences** = reopens the existing consent dialog) · Language (English · العربية) · identity line (legal entity name, city/country, email, "© {year} {entity}"; **blocked on B0-OC-17/RV-16 — launch gate**). **No social icons** until real profiles exist. No Resources column in M1a | IA §4.4 L317–327; LPB B.4 L63 |
| Breadcrumbs | Visible breadcrumbs only on L2+ pages. M1a pages are all L1 and the planned L2 pages return 404, so none are shown in M1a. `BreadcrumbList` JSON-LD still goes on the inner pages (§E.3). "Home › Product › …" / «الرئيسية › المنتج › …»; arrows mirror | IA §4.5 L329–330 |
| Overlays | Allowed: cookie banner (existing), suggestion bar, click-triggered dialogs (theme lightbox, video). **Not allowed:** exit-intent, timed or scroll popups, countdown promo bars | LPB B.5 L65–67 |
| Skip link, landmarks | Skip to main; `header`, labelled `nav`, `main`, `footer`; one H1; no skipped levels | LPB F L283 |
| Depth | Every page ≤ 2 clicks from home | IA L122; RM WS-05 |

### B.3 CTA targets
- **App origin:** at B1 the marketing and app hosts were the **same origin** `https://atlass.dpdns.org` (DL-39). **DL-63 split them:** the app (sign-in, registration, every dashboard) moved to `https://dashboard.atlass.dpdns.org` (`VITE_APP_URL`); the apex keeps only the marketing pages, and old app links on the apex `301` to the same path on the dashboard host. CTAs are built from the config origin and always carry the query parameters, so the split needed no copy change. In the table below, `<app>` is that app origin; paths without it are on the marketing origin. Across the two origins, `sessionStorage['atlas:intendedPlanKey']` does not cross origins and `?plan=` is the only carrier (RMP §6 L145; SEO §2.1).

| CTA | Label EN / AR | Target | Source |
|---|---|---|---|
| CTA-T (primary, every page) | "Start my academy trial" / «ابدأ تجربة أكاديميتك» | `<app>/auth/register` + `?plan=<key>` when a plan is in context + `lang=ar` from `/ar/*` pages (RM §3.1 item 4: `/auth/register?plan=<key>&lang=…`) | IA L131; LPB S1 acceptance 6; RMP §6 L146 |
| CTA-C (secondary) | "Set it up with us" / «جهّزها معانا» | `/contact?topic=sales` | IA L132 |
| Pricing card, trial plan | "Start my trial on {Plan}" | `<app>/auth/register?plan=<key>&lang=…` | LPB §I L324 |
| Pricing card, no-trial plan / Enterprise | "Talk to us about {Plan}" / "Talk to us" | `/contact?topic=sales&plan=<key>` (Enterprise has no catalog key; §G C-13) | LPB §I; RMP §6 L149 |
| S7 variant | "Running several academy brands? Talk to us" | `/contact?topic=sales` | LPB S7 L180 |
| `/security` primary | "Ask us a security question" (CTA-C) | `/contact?topic=sales` (or `support`) | IA §3.9 L243 |
| Contact topics (B1) | **sales / support / partnership / other only.** `founding` is **not** exposed until B2 (the backend enum lacks it) | DISP XW-12; RM L205 |

- **Plan keys:** come from the catalog. The current keys are `starter` = Teacher, `growth` = Academy, `enterprise` = **Organization** (the cosmetic mismatch is known). Tests read the key from `GET /public/plans` at test time, never hard-coded (OQ-05 L59; PRC L166; TAC H-2).
- **App behaviour:** reads `lang` once for that render, even with Preferences consent declined (EP-11; TAC H-5). The `<app>/auth/sign-up` alias keeps the query (RMP §4 L111).
- **UTM pass-through:** UTM on the landing URL is passed to the registration and contact URLs, **held in memory only** (no browser storage before consent) (RMP §6 L147; RM WS-09 L2). Storage-side attribution (B0-ANL-04) moved to B4.
- **The app page itself:** `auth:register.plan.freeTrial` exists in the UI, and B0-CPY-24 has moved to B4. The register screen may still say "free trial" (§G C-9).

### B.4 Home `/` · `/ar`: section blueprint S1–S14 (LPB §C L75–265; "directions, not final copy", LPB L5)
- **Narrative order:** S3 routine → S4 payments → S5 protection → S6 website → S7 team → S8 assessments → S9 how → S10 fit → S11 price → S12 FAQ → S13 assisted → S14 close (LPB A.2 L22).
- **Anchors:** `#payments`, `#protection`, `#website`, `#team`, `#assessments`.
- **Section opening:** each section opens with a 40–60-word quotable answer (LPB §J L332).

| # | Content (copy direction, EN / AR) | Visuals | Gate / state now | Key acceptance |
|---|---|---|---|---|
| S1 Hero | H1 = EN-8 / AR-7 (alternatives EN-1/AR-1, AR-2). Subhead names the mechanism. AR example: «طلابك يدفعولك فودافون كاش أو إنستاباي، توافق على الإيصال فيدخلوا الكورس، وكل فيديو بيتفرجوا عليه جوه أكاديميتك عليه كود الطالب.» CTA-T + CTA-C text button. Microcopy = ICU from the catalog: '{days}-day trial on {plans}. No card needed.' / «تجربة {days} … على {plans}. من غير كارت.» | SS-001 in a neutral browser frame (AR on `/ar`); chip «محتوى تجريبي». Background = **plain hero-ground token (default)**; MG-001 only after OC-19; SS-012 overlay only after OC-10. No autoplay video | Payment wording OK (OC-09). Overlay hidden | No-JS has H1, subhead, both CTA links and microcopy; LCP = hero image or H1, ≤ 2.5 s; no `<video autoplay>`; at 375×812 both CTAs visible; `/ar` CTA has `lang=ar`. Layout: ≥ 1024 12-col (text 6 / visual 6), `min-h ≈ 88svh`; screenshots never mirrored |
| S2 Facts | 4 facts with lucide icons: (1) own subdomain immediately; (2) connect your own domain ("on every plan" gated); (3) 2 devices, 1 screen at a time («حساب الطالب يشتغل على جهازين، وشاشة واحدة في نفس الوقت»); (4) no commission on wallet, InstaPay or bank payments | icons only | Fact 4 **unlocked** (OC-09); fact 2 "every plan" wording gated | `<ul>`; each fact maps to a feature ID; no other numbers; no CTA |
| S3 Routine | H2 EN "You already sell online. The routine around it is what wears you down." / AR «إنت بتبيع أونلاين فعلًا. اللي متعب هو اللف حوالين ده.» 3 observations (transfer screenshots checked by hand: «الإيصالات بتوصلك سكرين شوت على الواتساب وحد لازم يراجعها واحدة واحدة»; links forwarded to non-payers; no place with your name) | MG-002 (blocked by OC-19) or the DOM icon chain; `alt=""` | — | No numbers or amounts; WhatsApp/YouTube only as the status quo; no «السناتر». Link "See how payments work" → `#payments` |
| S4 Payments | H2 EN-2 / AR-2. 3 steps (H3s "How students pay", "Upload the proof", "Approve once"); reject with a reason; money straight to you, 0 % commission; "You approve" | SS-006, SS-007 (mobile), SS-008 (desktop), opt. SS-009 | **Unlocked (OC-09)** | Radix Tabs stepper (no autorotation, cross-fade 150 ms); mobile stacked; no "automatic/instant/Fawry/card/coupon/revenue"; CTA-T after step 3. The planned link "More about payments" points at a 404 page (planned label) |
| S5 Protection | H2 EN-3 / AR-3. Blocks: (a) code + partly hidden email moving + faint tile; (b) 2 devices / 1 screen, third refused, Devices page; (c) trace (**hidden**). Required YouTube disclosure (A.12). H3 «هل الطالب يقدر يسجل الشاشة؟» answered in 40–60 words | SS-011/013/014, VID-002 → **all gated OC-10** | Text only, without the trace sentence or screenshots (RV-12 pending) | Disclosure in no-JS HTML at ≥ body size; no DRM/"cannot be recorded"/100 %/hidden/burned/upload; demo identity only. Links "How we handle security" → `/security` |
| S6 Website | H2 EN-1 / AR-1. Body: own subdomain at once, connect your domain, 4 designs, the logo sets the colours, AR + EN pages («اختار تصميم من ٤، واللوجو بتاعك بيحدد الألوان، وصفحاتك بالعربي والإنجليزي.»). No Arabic-only implication | Theme tabs SS-001…004 + SS-019; SS-020 gated (live domain) | Custom-domain line follows pricing (all plans per the catalog) and CF-28 | Tabs + Radix Dialog lightbox; mobile vertical list (no swipe carousel); lazy-load below the fold; current themes only; no testimonials |
| S7 Team | H2 EN-6 / AR-6. Second line: «ولما تحب تفتح مادة جديدة أو تشارك مدرس تاني، افتح أكاديمية تانية من نفس الحساب» | `PlatformStructureFigure` DOM diagram (reuse) + SS-021, SS-022 | Counts from the catalog | Only owner/manager/instructor; no "managers add students", bulk import, combined revenue |
| S8 Assessments | EN "Quizzes, homework and certificates anyone can check online" / AR «امتحانات وواجبات وشهادات أي حد يقدر يتأكد منها أونلاين» | SS-026 lead (8 cols) + SS-024, SS-025 | "Check a demo certificate" → demo academy `/verify/<demo-code>` needs OC-29 (→ B4); hide the link if no demo academy exists | No integrity/anti-cheat wording |
| S9 How it works | `<ol>` of 4: create account and start the trial (length **from the catalog**, not "3-day"); set up the academy (name, design, logo, payment methods); add courses with your YouTube lessons («ضيف كورساتك بفيديوهات اليوتيوب اللي عندك»); send students the link | SS-027 (no cosmetic build screen); VID-001 optional (gated) | — | No durations; no text lessons or upload; video 0 bytes before click; captions EN/AR |
| S10 Honest fit | «أطلس مناسب ليك؟» "A good fit if…" (you sell to your own students; wallet/InstaPay/bank; lessons on YouTube; want your own name) / "Not the right fit yet if…" (need a mobile app; need card or Fawry; need live classes; need WhatsApp messages to parents) | none | Re-review as features ship | In no-JS HTML; matches the PMC §7 anti-persona list; link → `/pricing#faq` |
| S11 Pricing teaser | H2 EN "Plans by number of students and academies" / AR «باقات على حسب عدد الطلاب والأكاديميات». Cards from `GET /public/plans` (3 + 1) | none | **Unlocked** (OC-27) | Prices equal the API; `en-US`/`ar-EG` formatting; localized names; no "Free" or "Most popular"; skeleton never in server HTML; ≤ 3 in a row (4 narrow at ≥ 1280) |
| S12 FAQ | 6–8 Qs: app? · record the screen? · videos already on YouTube? · how do students pay / can my assistant approve? · third device? · can I see how much I sold? (orders and payments lists; charts don't count manual payments, CF-19) · is my data separate? · trial length and after? Answers from POS D.6 L280–293 | none | — | Each ≤ 80 words, direct answer first; all answers in server HTML (Radix accordion); `FAQPage` JSON-LD identical to the visible text; the screen-record answer includes the YouTube disclosure |
| S13 Assisted setup | EN "Prefer to set it up with someone? Tell us about your academy and we'll get back to you." / AR «تحب حد يجهزها معاك؟ ابعتلنا عن أكاديميتك وهنرد عليك.» | MG-007 (OC-19) | Response time only if committed | Button to `/contact?topic=sales` (no form on home) |
| S14 Closing | EN "Put your next group of paid students in an academy with your name on it." / AR «خلّي الدفعة الجاية من طلابك في أكاديمية باسمك.» + trial microcopy + both CTAs | `bg-surface` tint (the only tinted block) | — | Same CTA links as S1 |

### B.5 Other M1a pages
| Page | Blueprint | Source |
|---|---|---|
| `/features` hub | 4 pillars + the supporting module, one short block each; H2s phrased as questions ("How do students pay?"); CTA-T; child links to the 5 **planned** pages labelled "Planned"; hub description follows the claims register (no availability wording). Visuals SS-001, 008, 018, 022, 026 (SS-011 gated) | IA §3.2 L149–159; DISP XA-03; B1P-05 §2.4 |
| `/pricing` | See §C | |
| `/security` | Plain-language: academy data kept apart, sign-in protection, what the watermark records and for how long, what Atlas does **not** offer yet. **Can say** (IA L246, A.11). **Must say** (L247): no DRM; the overlay is drawn by the browser, not burned in; learners can't self-delete or export; no self-service academy export; how to request it [owner process]. **Must not say** (L248): compliance badges, uptime, never/cannot-leak absolutes, enforced session timeout or 2FA. CTA-C "Ask us a security question", then CTA-T. No sticky CTA. Visual MG-004 (OC-19) / SS-011/014/016 (OC-10). Gates RV-13, RV-12 | IA §3.9 L237–248 |
| `/about` | Who builds Atlas, why, where (Egypt), legal entity, how to reach a person. Short. No team photos unless real and consented; no invented milestones; MG-003 never presented as the founder. Needs OC-17 (B4) and the owner's founder story | IA §3.10 L250–258; ASP B.5 rule 8 |
| `/contact` | Keep the 5 fields (name, email, organization optional, topic, message) + an optional phone/WhatsApp field only if the owner will call back; separate unticked consent boxes; labels visible; inline errors; one success state with focus moved to it; honeypot `company`, `startedAt`, rate-limit message; `POST /api/v1/public/contact` contract unchanged. Submissions notify every active Platform Owner (in-app + email). Optional WhatsApp button [owner]. No sticky CTA | IA §3.11 L260–269; RMP R-02 L59; REC R-10; B1P-05 §2.4 |
| `/privacy-policy`, `/terms` | Full documents, reskinned; **URL selects the language** (not the UI preference); MSA-leaning AR; parity tests kept; RV-02/03/16. Port `privacy-policy-content`, `terms-and-pricing-content` tests | IA §3.12; RMP R-06/R-07 |
| 404 | Branded, localized by prefix, HTTP 404, `noindex`, no canonical/hreflang/OG; MG-009 (OC-19) or a plain illustration; links to **home, pricing, contact only** (docs = B2) | B1P-05 §2.4; DISP XA-03; §G C-6 |
| `/#contact`, `/ar#contact` | Client-side replace to `/contact`, `/ar/contact` | RMP R-02; RDM L33–34 |

### B.6 Copy status and where to find it
- **No approved page copy exists.** P-04 (all EN/AR site copy) is NOT STARTED (MP L1698; B1P-05 §0). LPB lines are "directions, not final copy" (LPB L5). Claude drafts EN and AR (XA-09). The workflow is draft → owner → native reviewer (RV-14) → owner publishes (OQ-33).
- **Drafted text that does exist:**
  - Metadata EN/AR: MDS §3 L79–94, §4 L98–113 (reproduced in §E.1).
  - Headline, CTA and section directions: POS D.7 L295–324; LPB §C L75–265.
  - Disclosures: LPB L143; IA L185.
  - Pricing FAQ list: PRC §4.4.2.
  - FAQ answer facts: POS D.6 L280–293; PMC §7 L170–180.
  - `/security` can/must/must-not lists: IA L246–248.
  - Holding-page copy (live code, FE `src/features/home/holding/`).
- **Material for writing new copy:**
  - Pillars with "can say / cannot say": POS D.3 L221–261.
  - Vocabulary use/avoid: POS D.8 L326–343.
  - Honesty rules 1–10: POS D.9 L345–357.
  - Proof points: true facts plus live demos only (PMC §11 L251–273).
  - Customer language: PMC §9.
  - JTBD and switching forces: PMC §2, §8.
- **Arabic terminology** (GLO draft, unreviewed): UI uses «الخطة» (plan), «الدورة» (course), «الاختبار» (quiz), «الواجب», «الشهادة», «إثبات الدفع», «تسجيل الدخول», «لوحة التحكم»; trial = «الفترة التجريبية» / «فترة التجربة» (inconsistent in the UI). Marketing drafts use «باقات», «كورس». See §G C-17.

---

## C. Pricing page `/pricing` · `/ar/pricing`

| Rule | Spec | Source |
|---|---|---|
| Single source | **Only `GET /api/v1/public/plans`.** Never duplicated constants. Defined loading and error behaviour. If no catalog value: show **no price and no trial line**. Never invented | DL-38 (DLF L423); REC R-14 |
| Render | Build-time fetch into static HTML (`/pricing`, `/ar/pricing`, `/pricing.md`). **Build fails if the fetch fails** (EQ-R-04). A client refetch keeps the page fresh; **a failed refetch keeps the build-time values**. Rebuild on every catalog change (E-8; the staleness window is an owner setting). No skeleton in server HTML | RM WS-01 T7; DISP XW-03; RMP E-8; SEO §3.2.3 |
| Live catalog (verified 19 Oct) | Teacher / المعلّم EGP 1,190/mo, 11,900/yr · Academy / الأكاديمية 2,790 / 27,900 · Organization / المؤسسة 7,490 / 74,900; EGP only; all trial-eligible; trial 14 days (CAT-05); limits per PRC §4.2.3 (Teacher 1 academy / 100 students / 3 instructors / 20 courses; Academy 1 / 400 / 8 / unlimited; Organization 5 / 1,500 / 25 / unlimited) | INV OC-27; P2B; AC A3; PRC L145–285 |
| Cards | **3 self-serve + 1 Enterprise "Talk to us" card**; one family; **no family switch**. Order: ascending price in reading order (OQ-44); in RTL the first card is rightmost. Enterprise = CTA-C card, **no `Offer`** unless the catalog carries a price; "from EGP 15,000/month, billed annually, quoted" only if the owner approves the floor as copy (§G C-13) | REC R-02; LPB §I; PRC §4.4.2 |
| Per card | Localized name (`nameLocalized`/`descriptionLocalized`); who it's for (one line); monthly price; yearly price + "Pay for 10 months, use 12" / «ادفع ١٠ شهور واستخدم ١٢» or "Save EGP {x} a year" (computed from the catalog); students, academies and instructors in words; trial line from `trialDurationDays`/`trialEligible`; CTA per B.3 | LPB §I L321; REC R-03; PRC §4.4.2 |
| Fit label | Academy gets "Recommended", with an owner-approved fit line based on limits, e.g. "For teachers with assistants, up to 400 students" (number from the catalog). **Never "Most popular"**; no positional badge | REC R-02 L16; OQ-44 |
| Toggle | Monthly/annual toggle allowed (PRC: default annual, test E; not decided, §G C-14). Event A8 `billing_toggle_changed` | PRC §4.4.2; AMP L254 |
| Formatting | `en-US` / `ar-EG` (Arabic-Indic digits), never the browser locale; bidi-isolated; EGP only | LPB S11; OQ-33; DISP XW-09 |
| Forbidden | "Free" / «مجاني» anywhere; Premium/Stream rows; USD; add-on prices (CF-23); `staff` and `recordedSessions` limits; video storage/minutes (hosted video off, MED-04 → B4); "Most popular"; competitor names or prices; testimonials or logos | RM L226; DL-38; PRC §4.4.2; LPB §I L325 |
| Sections in order | 1 H1 «اختار على حسب عدد طلابك» / "Choose by your number of students" + orientation · 2 cards · 3 (removed: family switch) · 4 comparison table of **enforced limits only** (students, academies, instructors, courses, file storage, monthly academy emails, support level; `<caption>`, `scope` headers, keyboard-scrollable region) · 5 trial and gifted-days explainer (catalog-driven; 14 gifted days on the first annual purchase, none on monthly, OQ-20) · 6 **"What's included and what isn't"** honest-limits block (no app, no card/Fawry, no live classes, YouTube-hosted lessons, manual approval) · 7 pricing FAQ · 8 CTA-C | LPB §I L320; POS D.9 rule 10; OQ-20 L72 |
| Text statements | Payment methods for paying Atlas (InstaPay, wallets, bank transfer) and manual activation (publish a time only with an SLA); trial (once per customer, no card); what happens at a limit (hard block on create, warnings); upgrade/downgrade and cancellation per current mechanics (PRC §4.2.7 L323–334; wording to RV-03); refunds only as the Terms state (BIL-09 → B4); **VAT line «الأسعار شاملة الضريبة» only after RV-05** (tax adviser not engaged → omit) | PRC §4.4.2; REC R-04 |
| Pricing FAQ (≥ 12 Q&As EN + AR) | Is there a plan with no subscription? (no; trial; must avoid the word "free", §G C-15) · Do I need a card? · How do I pay? · How long does activation take? · What counts as a student? · What happens at my limit? · Upgrade/downgrade any time? · Cancel? · Commission on my course sales? (0 % in manual mode) · Own domain? · Is video protected, and how? (no-DRM wording, `watermark-claims.test.ts`) · Mobile app? (no) · VAT? (only after RV-05) · What is Enterprise? Answers only from implemented mechanics | PRC §4.4.2; LPB §I L320 |
| Schema | `SoftwareApplication` (`applicationCategory` BusinessApplication, `operatingSystem` Web) + one `Offer` per listed plan: `price`, `priceCurrency` **EGP**, `priceSpecification` `UnitPriceSpecification` with billing duration (P1M/P1Y), `url` = plan CTA; + `BreadcrumbList`; `FAQPage` semantic; **no `aggregateRating`/`review`** | SEO §12 L310–332; DISP XW-09; §G C-11 |
| `/pricing.md` | Generated with the HTML from the same fetch: plans, prices, currency, billing period, limits, trial terms, what is not included, **catalog date**. Never hand-edited. 404 if pricing is unpublished. Banned-string lint applies | SEO §21.2; RMP R-20; RDM L74; TAC I-5 |
| Visible date | "Prices last updated {date}" | PRC §4.4.2 |
| Acceptance | No-JS HTML contains every plan's localized name, price and student cap equal to the API (EN + AR); no "Free"/«مجاني»; honest-limits block in both languages; table a11y; Offers equal the API; `/pricing.md` equals the API; **no literal "3-day"/«٣ أيام»/"14-day" in source outside fixtures** | LPB §I L327; TAC A-7, E-6, I-5; REC R-01 |
| Tests to port | `pricing-limits-only.test.tsx`, `plan-gifted-days.test.tsx`, `terms-and-pricing-content.test.ts`, `e2e/j41-gifted-days.spec.ts`, `watermark-claims.test.ts` | CMSA §8 item 8; PRC §4.4.2 |
| Pilot caveat | During the B1 pilots the platform trial is temporarily 60 days (OQ-07). It must be reset to 14 **before** the switch and checked on `GET /public/plans` (go/no-go 15). The page must show whatever the catalog says | RM L228; B1P-03 §5 line 2 |

---

## D. Screenshots, Magnific and OG assets

### D.1 Capture rules (ASP §A L28–114; B1P-05 §1.1)
- **Source:**
  - real, current **post-B0 build** on the **local full stack with the demo seed** (OQ-16; XD-05); never production;
  - never mocked, composited, AI-generated or edited inside the UI;
  - allowed edits: crop, scale, neutral frame, annotations outside or over the UI.
- **Matrix:**
  - EN and AR captured separately, **never mirrored**;
  - desktop 1440×900@2x, tablet 768×1024@2x, mobile 390×844@2x;
  - light theme; cookie banner declined;
  - `prefers-reduced-motion` where it stabilises frames.
- **Masters:** PNG DPR2 (2880×1800 / 1536×2048 / 780×1688), not committed, archived privately with sha256 (archive blocked, IMG-3).
- **Delivery:**
  - AVIF + WebP `<picture>`; widths desktop 640/960/1280/1920, tablet 512/768/1024, mobile 390/585/780;
  - name `mkt-ss-<nnn>_<slug>_<en|ar>_<device>_<width>w.<ext>` under `/marketing-assets/screenshots/v<n>/`;
  - explicit `width`/`height`; lazy-load except LCP.
- **Budgets** (stricter value, XW-08): screenshots desktop ≤ 140 KB, mobile ≤ 60 KB AVIF; hero use SS-001 desktop ≤ 120 KB, SS-012 mobile ≤ 50 KB. Crop tighter rather than over-compress text.
- **Never in frame:**
  - text lessons; video-upload UI; Live Sessions; the academy blog;
  - the Google sign-in button (CF-12; gate now closed, claim not yet released);
  - exam-integrity UI; zero-revenue charts; administrator/staff roles; retired themes;
  - testimonials, ratings, reviews or student counts (XA-07); real people or minors; the cosmetic 45–75 s build screen.
- **Manifest per capture:** feature IDs, route, role, locale, breakpoint, theme, FE/BE SHAs, environment URL, date, seed version, flag states, script step, reviewer checklist, outcome, `masterSha256`.
- **Release gate AG-5:** checklist plus owner spot-check.
- **Captions and alt:** «محتوى تجريبي» / "Demo content" on every caption; localized alt text describing the screen and its state, ≤ 125 characters, banned-string lint applies (SEO §14).
- **Demo data** (ASP A.2 L36–51):
  - four demo academies on the local stack, one per theme (modern-education, atelier, manara, riwaq) (XA-06);
  - fictional teacher; owner-owned unlisted YouTube lessons;
  - fake payment details («حساب تجريبي»); a demo receipt «إيصال تجريبي — Demo receipt» that imitates no wallet UI;
  - 3–5 demo learners with masked emails `d•••@<demo-domain>`; 1 manager + 2 instructors;
  - one quiz with all 5 question types, a graded assignment, a certificate with a known demo code;
  - payments in approved, under-review and rejected states.
- **Datasets:** DS-A fresh owner · DS-B established · DS-C learner · DS-D commerce · DS-E assessments · DS-H custom domain (B1P-05 §3).

### D.2 The 22 M1a screenshots (B1P-05 §1.2; ASP register L59–86; DISP XA-12)
| ID | Screen (route · role) | Lang / device | State / data | M1a placement | Publish now? |
|---|---|---|---|---|---|
| SS-001 | Academy home, theme modern-education (academy `/`, `/ar`, anonymous) | EN+AR · D/T/M | Published site: hero + featured courses + FAQ; no testimonials/ratings/counts; browser frame shows the demo subdomain; DS-B | Home S1 (LCP), S6; hub; OG composite | Yes |
| SS-002 | Theme atelier home | EN+AR · D/M | Academy 2 | S6 | Yes |
| SS-003 | Theme manara home (AR lead) | AR(+EN) · D/M | Academy 3, dark stage | S6 | Yes |
| SS-004 | Theme riwaq home | EN+AR · D/M | Academy 4, column grid | S6 | Yes |
| SS-006 | Learner checkout: method choice + frozen instructions (`/my/courses/:id/checkout`) | EN+AR · M | InstaPay or Vodafone Cash selected, demo details; callout "Student picks a method"; DS-D | S4 step 1 | Yes (OC-09 done) |
| SS-007 | Proof upload → "under review" | EN+AR · M | Demo receipt + reference; callout "Upload the proof" | S4 step 2 | Yes |
| SS-008 | Owner payment review sheet (`<app>/dashboard/academy/:id/payments?payment=`) | EN+AR · D | Sheet with proof, amount, method, Approve/Reject; mixed-status list; callout "Approve once" | S4 step 3; hub | Yes |
| SS-009 | Learner My courses / My payments (optional) | EN+AR · M | Enrolled; one approved + one rejected with a reason; DS-C/D | S4 | Yes |
| SS-011 | Lesson player with viewer-code overlay (desktop) | EN+AR · D | YouTube demo lesson paused on a clean frame; code + masked email + tile; ring on the code; **never crop the code out**; DS-C | S5; hub; `/security` | **No (OC-10)** |
| SS-012 | Player, mobile | EN+AR · M | Portrait overlay, phone frame | S1 overlap (only after OC-10), S5 | **No** |
| SS-013 | Third-device refusal (`DeviceLimitDialog`) | EN+AR · M | "A third device is refused" | S5; `/security` | **No** |
| SS-014 | Learner Devices page (`/my/devices`) | EN+AR · M | Two demo devices | S5; `/security` | **No** |
| SS-016 | Learner protection report stating no DRM | EN+AR · D | Caption quotes the "no DRM" line | `/security` | **No** |
| SS-018 | Website page editor + device preview | EN+AR · D | Home page tree + preview; EN/AR `LocalizedTextField`; DS-B | Hub | Yes |
| SS-019 | Brand Studio palette from logo | EN+AR · D | Demo logo, extracted palette, contrast checks | S6 | Yes |
| SS-020 | Domain tab: subdomain + connected custom domain | EN+AR · D | Custom domain "connected"; DS-H | S6 | **No until a live custom domain exists** (CF-28) |
| SS-021 | Add instructor/manager dialog | EN+AR · D | Role select shows **manager and instructor only** | S7 | Yes |
| SS-022 | Academy switcher | EN+AR · D | 4 demo academies | S7; hub | Yes |
| SS-024 | Quiz builder, question types | EN+AR · D | Five types; crop to the selector; no integrity UI; DS-E | S8 | Yes |
| SS-025 | Assignment grading with feedback | EN+AR · D | Graded submission | S8 | Yes |
| SS-026 | Certificate public verification (`/verify/:code`) | EN+AR · D/M | Demo fact sheet; caption "Anyone can check a certificate online (demo)" | S8; hub | Yes (needs the demo cert) |
| SS-027 | Onboarding theme picker (`/onboarding/:step`) | EN+AR · D/M | Live previews in demo colours; caption "Pick a design during setup"; DS-A | S9 | Yes |

- **Publishable now:** 16 of 22. Six are blocked: five by OC-10, plus SS-020.
- **M1b only (not now):** SS-005 (reviews block empty or hidden), 010, 015, 017, 023. Later: SS-028.
- **Videos (optional):** VID-001 ≤ 90 s walkthrough and VID-002 ≈ 8 s overlay clip are both gated (OC-10). They are click-to-play with `preload="none"`. VID-001 needs EN/AR captions. The legacy 807 KB `hero-video.mp4` is retired (LPB G.3; RMP A-01).

### D.3 Magnific (ASP §B L136–182; CRN; DL-06; OQ-32)
- **Scope:** banners, illustrations, backgrounds and concepts only. **Never** UI, screens with content, receipts, wallet apps, logos or certificates. Generated images are never presented as real teachers, students or places.
- **Gate:** **release only after B0-OC-19** (licence for marketing use with a dated terms copy, private archive, provenance per file). **OC-19 moved to B4, so no MG asset ships in B1 unless the owner re-opens it.** Spend is authorised (DL-6, RE-12).
- **Download:** CDN `pikaso.cdnpk.net` is blocked in this environment; it needs an allowlist entry or a manual download.
- **Art direction** (B.2): calm editorial contemporary Egypt; paper, stone, wood, tea glass; negative space at the start edge (crop per language, never mirror); people small, from behind or hands only; **never a minor's face**. The palette line ("teal, cream, soft gold") must be re-set to the new brand colours.
- **Exclusions** (B.3): no text, letters or digits; no logos; no screens with content; no chat UI; no receipts or money; no identifiable faces; no orientalist clichés (pyramids, camels, lanterns, arabesque); no glassmorphism, neon or gradient meshes.
- **Pipeline:**
  - model Nano Banana Pro (`imagen-nano-banana-2`), recording the exact string;
  - 3–4 candidates per key at 2K–4K with fixed seeds; `simulate_cost` first;
  - review at 100 % and in context at 390/768/1024/1440 × EN/AR × light/dark;
  - provenance = `ThemeAssetProvenance` fields + `assetId`, page, `alt.en`/`alt.ar`, focal, crops, `budgetBytes`;
  - AVIF/WebP at 640/1024/1600/2400 under `/marketing-assets/images/<asset>/v<n>/`.
- **Budgets:** plates ≤ 110 KB at 1600 w; illustrations ≤ 100 KB at 1200 w; MG-001 as LCP ≤ 70 KB mobile.

| ID | Purpose | Page | Concept status |
|---|---|---|---|
| MG-001 | Hero ambient plate (light + dark) | S1, S14, OG | CP-1 strong |
| MG-002 | Scattered → one | S3 | CP-2 strong (copy must not imply replacing WhatsApp) |
| MG-003 | Teacher's evening prep | S9 / About | CP-3 **regenerate** (pseudo-text) |
| MG-004 | Separate rooms (isolation) | `/security` | CP-4 usable |
| MG-006 | Pricing plate | `/pricing` | none |
| MG-007 | Contact / assisted setup | `/contact`, S13 | none |
| MG-008 | OG background plates (EN-safe and AR-safe, 1200×630; master 2400×1260) | OG-001…006 | CP-6 strong (generated 16:9; needs crop/expand) |
| MG-009 | 404 illustration | 404 | none |

- **Not M1a:** MG-005 (CP-5, M1b); MG-010/011 (later).
- **Legacy assets:** MKT-LEG-001…006 are not reused without a provenance back-fill.
- **Concept PNGs:** `assets/magnific-concepts/CP-*.png` (~1K) are "not production assets".

### D.4 OG set (MDS §5 L140–165; ASP A.7 L127–130)
- **Spec:** 1200×630, PNG/JPEG ≤ 200 KB (no AVIF), under `/marketing-assets/og/` (platform-only path, immutable/versioned); text set by a designer; AR layout mirrored; **no prices, counts or competitor marks**; localized `og:image:alt`.
- **Set:**
  - OG-001/002 home EN/AR (`home-en.png` / `home-ar.png`): background plate + logo + headline (+ optional SS-001 crop);
  - OG-003/004 generic EN/AR template: title slot = page **H1**, plus a section label; rendered for features, security, about, contact, privacy-policy and terms × EN/AR;
  - OG-005/006 pricing EN/AR: no prices;
  - 404: no OG.
- **Gates:** RV-08 (logo) and OC-19 (if an MG plate is used). Both are in B4, so OG images cannot go public as specified (§G).
- **Validate** in the Facebook Sharing Debugger, LinkedIn Post Inspector and a WhatsApp preview for `/`, `/ar`, `/pricing`, `/ar/pricing` (TAC B-6; smoke 9).

---

## E. SEO

### E.1 Metadata (MDS §3–§4, draft for owner approval; counts = Unicode code points with brand "Atlas")
Global rules (MDS §1 L17–28):
- **Document:** `<html lang="en" dir="ltr">` or `lang="ar" dir="rtl"` from the server.
- **Title:** ≤ 60, unique site-wide and per locale; pattern `[topic] [+reason] | {Brand}`, brand last except brand-intent pages.
- **Description:** ≤ 155, unique.
- **H1:** one per page.
- **Canonical:** absolute, HTTPS, apex, self, parameter-free.
- **Language signals:** `content-language` meta.
- **Robots meta:** omitted on indexable pages; `noindex,follow` on 404.
- **OG:** `og:title` (= title minus suffix), `og:description`, `og:url` = canonical, `og:image` + `og:image:alt`, `og:locale` `en_US`/`ar_EG` + alternate, `og:site_name` (brand in the page language), `og:type` website.
- **Twitter:** `twitter:card=summary_large_image` + title/description/image; **no `twitter:site`**.
- **Theme colour:** `theme-color` light/dark.
- **Source:** metadata lives in the route manifest, never hand-written in templates.
- **Lint:** banned strings; **no prices or currencies in metadata**.

| Page | EN title (chars) | EN description (chars) | AR title (chars) | AR description (chars) |
|---|---|---|---|---|
| Home | Your Own Teaching Academy Online, Under Your Name \| Atlas (57) | Move your paid students from WhatsApp groups to an academy with your name. They pay by wallet or InstaPay, you approve once. {trialDays}-day trial. (137–138) | منصة تعليمية باسمك للمدرسين في مصر \| أطلس (41) | انقل طلابك من جروبات الواتساب لأكاديمية باسمك. الطالب يدفعلك فودافون كاش أو إنستاباي، وبموافقة واحدة منك يدخل الكورس. تجربة {trialDays} أيام. (131–132; needs an ICU plural, §G C-16) |
| Product hub | Product: Academy Website, Payments and Protection \| Atlas (57) | An academy site on your own domain, wallet and InstaPay payments you approve, a viewer code on every video watched, and roles for your assistants. (146) | المنتج: موقع أكاديميتك والدفع وكود الطالب \| أطلس (48) | موقع لأكاديميتك على الدومين بتاعك، ودفع بالمحافظ وإنستاباي بموافقتك، وكود الطالب على كل فيديو بيتشاف، وأدوار لمساعدينك. (119) |
| Pricing | Atlas Pricing: Plans by Students and Academies (46) | Compare plans by number of students and academies, and see the trial terms and the limits of each plan before you start. (120) | أسعار أطلس: باقات حسب عدد الطلاب والأكاديميات (45) | قارن الباقات حسب عدد طلابك وأكاديمياتك، واعرف شروط التجربة وحدود كل باقة قبل ما تبدأ. (85) |
| Security | Security and Privacy: How Academy Data Is Kept Apart \| Atlas (60) | How each academy's data is kept separate, how sign-ins are protected, what the viewer code records and for how long, and what we don't offer yet. (145) | الأمان والخصوصية: إزاي بيانات كل أكاديمية منفصلة \| أطلس (55) | إزاي بيانات كل أكاديمية منفصلة، وإزاي تسجيل الدخول محمي، والكود بيسجل إيه ولمدة قد إيه، وإيه اللي لسه مش متاح. (110) |
| About | About Atlas: Who Builds It and How to Reach Us (46) | Atlas is a branded academy platform for Egyptian teachers who sell lessons online. See who builds it, where we are based and how to reach a person. (147) | عن أطلس: مين بيبنيه وإزاي توصل لنا (34) | أطلس منصة تعليمية باسمك للمدرسين في مصر اللي بيبيعوا دروسهم أونلاين. اعرف مين ورا المنصة، وإحنا فين، وإزاي تكلّم حد مننا. (121) |
| Contact | Contact Atlas: Plans, Setup Help and Support (44) | Ask about plans, get help setting up your academy, or reach support. Send us a message and tell us about your academy. (118) | كلّم أطلس: الباقات والمساعدة في التجهيز والدعم (46) | اسأل عن الباقات، أو اطلب مساعدة في تجهيز أكاديميتك، أو كلّم الدعم. ابعتلنا رسالة عن أكاديميتك. (94) |
| Privacy | Privacy Policy \| Atlas (22) | How Atlas collects, uses, keeps and protects the personal data of academy owners, their teams and learners, and how to contact us about it. (139) | سياسة الخصوصية \| أطلس (21) | كيف يجمع أطلس البيانات الشخصية لأصحاب الأكاديميات وفرقهم وطلابهم ويستخدمها ويحتفظ بها ويحميها، وكيف تتواصل معنا بشأنها. (119) |
| Terms | Terms of Service \| Atlas (24) | The terms that apply when you use Atlas to run an academy: accounts, subscriptions and trials, acceptable use and responsibilities. (131) | شروط الخدمة \| أطلس (18) | الشروط التي تنطبق عند استخدام أطلس لإدارة أكاديمية: الحسابات والاشتراكات والتجربة والاستخدام المقبول والمسؤوليات. (113) |
| 404 (noindex) | Page Not Found \| Atlas (22) | MDS: "This page does not exist. Go to the home page, pricing, the help center or contact us." (86). **Drop "the help center"** (XA-03) | الصفحة مش موجودة \| أطلس (23) | MDS: «الصفحة دي مش موجودة. روح للصفحة الرئيسية أو الأسعار أو مركز المساعدة أو كلّمنا.» **Drop «مركز المساعدة»** |

- **Per-page gates** (MDS §4.1 L115–131):
  - Home: the payment sentence is now allowed (OC-09).
  - Academy-website (M1b): no "on every plan".
  - Security: no compliance or uptime claims.
  - About and Contact: only owner-true statements.
  - Legal pages: lawyer review.
- **H1 vs title:** the home H1 = EN-8 / AR-7 and differs from the title on purpose; the pricing H1 is «اختار على حسب عدد طلابك» (MDS §4.2).
- **M1b drafts:** titles and descriptions for the 5 feature pages are at MDS L83–87 / L102–106. They are not used until B2.

### E.2 Canonical, hreflang, language
- **Canonical:** `https://atlass.dpdns.org` + path; self-referencing; never cross-locale; query strings (`utm_*`, `plan`, `ref`, `lang`) return 200 and are stripped from the canonical; one origin across canonical, hreflang, sitemap and `og:url` (SEO §2.2 L72–80, §7 L192–211; TAC B-2, B-3; RDM L32).
- **hreflang:** `en`, `ar`, `x-default` (→ EN). **`ar`, not `ar-EG`** (OQ-04; XW-10; `ar-EG` is only for digits and dates).
- **Placement:** in `<head>` **and** sitemap `xhtml:link`, generated from the same manifest (SEO §8 L213–222); not in HTTP `Link` headers.
- **Pairing:** self-reference + reciprocity. Pairs only when both pages are published and fully translated (title, description, headings, body, alt).
- **Exclusions:** no hreflang on 404, planned URLs or noindex pages.
- **Language:** the server emits `<html lang dir>`; no automatic redirects.
- **Tests:** TAC C-1…C-6.

### E.3 JSON-LD (SEO §12 L310–332; IA §8; LPB §J; MDS §2)
Server-rendered, one `@graph` per page, data blocks only (CSP-compatible), values from the same content source as the visible page.

| Page | Types |
|---|---|
| Home `/`, `/ar` | `Organization` (`@id` `https://atlass.dpdns.org/#organization`; `name` Atlas, `alternateName` أطلس; `url`; `logo` = BR-001 PNG ≥ 112 px **after RV-08**; `sameAs` **only real owner-controlled profiles**, else omit; `contactPoint` only if a public channel exists) + `WebSite` (`name`, `alternateName`, `url`, `inLanguage` [en, ar]; **no `SearchAction`**) + `FAQPage` (semantic only, equal to the visible FAQ). **No `Product`/`Offer` on home** |
| `/features`, `/security`, legal | `BreadcrumbList` + `WebPage` (`inLanguage`) |
| `/about` | `AboutPage` + `BreadcrumbList` (entity facts after OC-17) |
| `/contact` | `ContactPage` + `BreadcrumbList` |
| `/pricing` | `SoftwareApplication` + `Offer`s (see §C) + `BreadcrumbList` (+ `FAQPage` semantic) |
| 404, app pages | none |

- **Forbidden everywhere:** `Review`, `AggregateRating`, `HowTo`.
- **Validation:** Schema.org validator (0 errors) + Rich Results Test (Breadcrumb and Organization detected; FAQ rich results not expected).
- **Content match:** JSON-LD must match the visible content exactly (TAC E-1…E-7).

### E.4 Route classes, 404 and host rules (SEO §4.1; RMP E-3…E-10; TAC F, G)
Platform host only, evaluated in order:
1. `/api/*` → backend.
2. Static: `/assets/*`, `/theme-assets/*`, `/marketing-assets/*` and platform root files (`robots.txt`, `sitemap*.xml`, `llms.txt`, `pricing.md`, favicons) → file or a **real 404**.
3. App prefixes `/dashboard`, `/auth`, `/onboarding`, `/academy-chooser`, `/verify`, `/403`, `/index.html` → SPA shell, 200, **`X-Robots-Tag: noindex`** (header, not robots.txt Disallow). Since DL-63 the app prefixes are served on `dashboard.<base>`; on the apex, old app links `301` to the same path on `dashboard.<base>`.
4. Manifest URLs (EN + `/ar`, `render:'static'`) → prerendered HTML, 200.
5. Normalisation: trailing slash or case on a manifest URL → **one** 301 to the normalised URL.
6. **Everything else → 404 with the branded HTML** (localized by `/ar` prefix). This includes `planned` URLs.

Rules that apply across these classes:
- **"Unknown paths 404" ships at the switch** (M1a), not at M0. Until then the soft-404 stays (XB-05).
- No catch-all redirect to home, anywhere.
- `/index.html` is **never redirected**: 200, byte-identical SPA shell, `noindex`, on every host (P0 regression; `sw.js#refreshShell`) (SEO §5.4; RMP R-15).
- Prerendered files go to a **platform-only folder** (`dist/_platform/<path>/index.html`), never `dist/index.html`. A CI byte-compare (shell-identity check) enforces this (RM WS-01 T3, WS-11 T7).
- The edge serves marketing only when **Host = the canonical marketing host**. Academy subdomains and custom domains keep their order (API → assets → SSR → SPA). They never receive `robots.txt`, `sitemap*.xml`, `llms*.txt`, `pricing.md`, `/marketing-assets/og/*` or marketing pages (E-5, E-6; TAC G-1…G-8).
- Academy `/robots.txt` and `/sitemap.xml` are generated per host. This is B0-WEB-01, which has moved to B4 (partially verified).
- Reserved academy labels: `preview`, `staging`, `docs`, `blog`, `help`, `learn` (EP-11, backend `RESERVED_SUBDOMAINS` + frontend); the OC-16 Q5 count shows 0 held (P2B).

### E.5 Sitemaps (SEO §9.1 L226–244; DISP XD-08; TAC C-8…C-13)
- `https://atlass.dpdns.org/sitemap.xml` = **`<sitemapindex>`** → `/sitemaps/marketing-en.xml`, `/sitemaps/marketing-ar.xml`. Docs and blog files arrive only in B2+ (§G C-7).
- **Contents:** only the canonical, indexable 200 URLs from the manifest (the 8 M1a pages per locale), each with the full `xhtml:link` set (self, pair, x-default).
- **Excluded:** app paths, `/verify/*`, 404, planned URLs, `/blog`, `/index.html`, `/lp/*`.
- **`lastmod`:** the real content change (content hash; catalog change date for pricing), never build time; no-content deploys don't change it.
- **No `changefreq`/`priority`.**
- **Format:** compact XML (no whitespace in `<loc>`); only the `sitemap` and `xhtml` namespaces; XML content type.
- **Submission:** at the switch, in Search Console and Bing. Never during prep (RM L313).
- **Before the switch:** B0-WEB-13 already removed `/blog` and legacy or noindex URLs from the platform sitemap.

### E.6 robots.txt (platform host; SEO §10.1 L253–293; OQ-34 L85 resolved)
```text
# https://atlass.dpdns.org/robots.txt — platform marketing host only. Generated from the manifest.
User-agent: Googlebot
User-agent: Bingbot
User-agent: OAI-SearchBot
User-agent: PerplexityBot
User-agent: Claude-SearchBot
User-agent: Applebot
Allow: /

User-agent: GPTBot
User-agent: ClaudeBot
User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: *
Allow: /

Sitemap: https://atlass.dpdns.org/sitemap.xml
```
- **D-7 resolved** (OQ-34): search and retrieval bots allowed; training bots and `Google-Extended` `Disallow` (reversible).
- The SEO draft's `Disallow: /docs/search` lines only matter once docs ship (B2).
- **Do not disallow app paths** (their `noindex` must stay readable).
- Verify the current user-agent names before publishing.
- Check that Cloudflare does not challenge the allowed bots (TAC I-6).
- `www` 301s to the apex. The file is served only on the platform host (TAC I-1, G-3).

### E.7 llms.txt (SEO §21.2 L495–505; RMP R-19; TAC I-3)
- `/llms.txt`, `text/plain; charset=utf-8`, generated from the route manifest and the same content source as the pages. It mirrors visible content and never replaces it.
- **Content:**
  - H1 = brand name;
  - a 2–3 sentence summary identical in meaning to the category statement (POS D.1, EN + AR);
  - sections linking the **published** EN and AR M1a pages (home, features, pricing, security, about, contact; legal optional);
  - a link to `/pricing.md`;
  - an AI-crawler policy statement matching robots.txt.
- **Exclusions:** no planned, 404, internal or deferred pages. **404 on academy hosts.** The banned-strings lint passes.
- **Not in B1:** `llms-full.txt` and `llms-full.ar.txt` (docs bodies, B2). OKF and WebMCP are not planned.

### E.8 Redirect matrix: what ships when (RDM; DISP XB-04, XC-14)
- **M0 (early B1)**, in RDM `phase=M0`:

| RDM line | Rule | Test (expected) |
|---|---|---|
| L3 | `https://www.{host}/` → `$O/` 301 | `curl … "$W/"` → `301 $O/` |
| L4 | www `/pricing?utm_source=x` → apex, path + query kept | `301 $O/pricing?utm_source=x` |
| L5 | www `/ar/pricing` → apex | `301 $O/ar/pricing` |
| L6 | www unknown path → apex (then 404 on the apex once unknown-404 ships) | `301 $O/this-does-not-exist` |
| L7 | www `/api/*` **unchanged** (excluded until logs show no use; later 308) | `200` on `$W/api/v1/public/plans` |
| L8 | www `/index.html` → apex `/index.html` (host normalisation only) | `301 $O/index.html` |
| L16, L17 | `/privacy-policy/`, `/terms/` → slash-less 301 | `301 $O/privacy-policy`, `301 $O/terms` |
| L24 | `/ar/` → `/ar` 301 | `301 $O/ar` |
| L58–L65 | `/dashboard`, nested dashboard, `/auth/sign-in`, `/auth/register?plan=`, `/auth/sign-up?plan=`, `/onboarding/{step}`, `/academy-chooser`, `/403` → keep 200 shell + `X-Robots-Tag: noindex` (not disallowed); since DL-63 on `dashboard.<base>`, and the apex answers `301` to the same path there | `200` and `grep -ci "x-robots-tag: noindex"` → 1 |
| L66 | `/verify/{code}` keep 200 + `noindex` (on `$O` and `$A`; D-6 is decided) | header present |
| L67 | platform `/robots.txt` generated, host-aware, lists only `$O/sitemap.xml`, `text/plain` | grep `Sitemap: $O/sitemap.xml` → 1 |

- **M0 also includes:**
  - platform root files moved into the platform-only folder (RM L1139);
  - case 301 on the live pages (XB-04; no explicit RDM row for case at M0, §G C-10).
- **Not in M0:** the favicon (RV-08) and unknown-404 (switch).
- **Already shipped in B0** (`phase=B0-WEB-13`): L37 `/blog` 404 and removed from the sitemap; L38 `/blog/` 301 → `/blog`; L40 scaffold slugs 404.
- **M0 acceptance** (B1P-03 §4, DISP XB-04):
  - every M0 row passes on staging (Host override) and production, ≤ 1 hop;
  - `/index.html` 200 + noindex; academy hosts unchanged; app prefixes noindex;
  - host-aware robots correct on apex, `www`, an academy subdomain and a custom domain;
  - evidence = a dated curl-matrix log;
  - owner steps: baseline recorded before, cleaned sitemap submitted at M0, inspect `/` and `/pricing` (RM §8.5).
- **Switch set** (`phase=switch`, 38 rows):
  - L9–L13 keep `/`, `/features`, `/pricing`, `/privacy-policy`, `/terms` (200 + self-canonical);
  - L14/15/18–21/25/26 slash 301s; L28–30 case 301s (single hop: `/Features/` → `/features`);
  - L32 params keep 200;
  - L33–34 `#contact` client replace;
  - L35–36 `/ar` + AR twins 200 with `lang="ar" dir="rtl"`;
  - L41–43 unknown → 404 (incl. `/features/does-not-exist`);
  - **L44–L53 the 10 planned feature URLs → 404**, branded, no sitemap, no hreflang, no 3xx;
  - L68 sitemap becomes an index;
  - L72 `/llms.txt` 200 text/plain; L73 academy `/llms.txt` 404;
  - L74 `/pricing.md` 200 = API.
- **Untagged rows:**
  - L2 HTTP → HTTPS 308 keep;
  - L56/L57 `/index.html` never redirect (every host);
  - L55 missing assets 404;
  - L69–71 academy robots/sitemap (B0-WEB-01);
  - L76 favicon replaced (after RV-08);
  - L75 `/manifest.webmanifest` real manifest or 404, never HTML;
  - L22–27, L54, L77–83 docs, blog and lp (B2+);
  - L84–85 domain move (WS-NAME only).
- **Rule:** never redirect a removed URL to the homepage (RM WS-12).
- **Rollback:** M0 can roll back alone (RM L1139).

---

## F. Technical acceptance criteria (marketing site)

### F.1 Performance budgets (LPB §H L300–313; XW-08; SEO §13)
| Metric (p75, mid-range Android, 4G, Egypt) | Budget |
|---|---|
| LCP | ≤ 2.5 s (LCP element = hero image or H1 from server HTML; `fetchpriority="high"`, `srcset`, width/height) |
| CLS | ≤ 0.1 |
| INP | ≤ 200 ms (lab proxy TBT ≤ 200 ms) |
| TTFB (HTML) | ≤ 0.8 s (edge-cached prerendered HTML) |
| Critical JS (gz) | ≤ 90 KB landing route, excluding lazy islands (tabs, dialog, video); **0 dashboard modules in marketing chunks** (import-boundary ESLint rule + bundle report in CI) |
| CSS (gz) | ≤ 30 KB critical |
| Hero image | ≤ 50 KB mobile AVIF / ≤ 120 KB desktop AVIF (XW-08 stricter value) |
| Fonts | ≤ 2 preloaded WOFF2, `font-display: swap`, self-hosted |
| Initial transfer | ≤ 700 KB mobile / ≤ 1.2 MB desktop (excluding user-started video) |
| Third-party requests | **0** (CSP `script-src 'self'`) |
| Lighthouse (TAC D-1, proposed) | Perf ≥ 90, **SEO = 100**, A11y ≥ 95, BP ≥ 95; mobile preset, 3 runs, median; home EN + AR; all M1a templates for D-2 |

- **CI jobs:** Lighthouse mobile budget job, axe job and bundle budget job (RM WS-10 T4). The budget file fails the build (TAC D-8).
- **Other checks:** no `<video autoplay>` on `/`, `/ar` (TAC D-4); immutable caching of `/marketing-assets/*`.
- **Field data:** RUM p75 for 28 days after launch is a **B2** exit item.

### F.2 Accessibility (LPB §F L281–286; RM WS-10 L773)
- WCAG 2.2 AA. **axe-core: 0 serious/critical in EN and AR, light and dark.**
- **Manual passes, recorded:** keyboard-only in both directions; NVDA/VoiceOver in AR and EN.
- **Patterns:** WAI-ARIA via Radix (tabs: arrows, Home/End; accordion buttons with `aria-expanded`; dialog focus trap, Escape, focus return).
- **Media and images:** meaningful screenshots carry localized alt; decorative images `alt=""` + `aria-hidden`; targets ≥ 44×44 px with ≥ 8 px spacing; no hover-only info.
- **Motion:** nothing moves without user action except the 220 ms entrances, which are skipped under reduced motion.
- **Breakpoints:** 375/768/1024/1440 (+ 390), no horizontal overflow; logical CSS only.

### F.3 No-JS rendering and content (SEO §3.2 L94–100; TAC A)
- Every manifest URL (EN + AR), fetched by curl as Googlebot, returns **200 `text/html; charset=utf-8`** with:
  - `<html lang dir>`; unique title and description; self-canonical; hreflang trio; OG/Twitter;
  - **exactly one H1** equal to the manifest H1;
  - all body copy, **including collapsed FAQ answers**;
  - crawlable `<a href>` header and footer nav; JSON-LD.
- **Not the shell:** no manifest page is byte-identical to `/index.html`, and none has an empty `#root` (A-1…A-6).
- **Word counts** (proposed): ≥ 150 words on pricing and security; ≥ 80 on contact and legal (A-4).
- **Pricing:** names, prices and caps equal the API (A-7).
- **Hydration parity:** only the suggestion bar and cookie banner are client-only (A-10, Playwright).
- **Switch behaviour:** `ATLAS_MARKETING_STATIC` off = holding state; on = prerendered HTML; flipping takes one Caddy restart and no rebuild (`/opt/atlas/.env` + `docker compose up -d --no-deps caddy`; needs the backend compose `environment:` allowlist change). **Neither the toggle nor its Caddy handle exists in code yet** (DISP §0.3; RM WS-01 L549–554, §8.2).
- **Manifest:** carries `render:'static'` or `status:'planned'`; there is no `spa-legacy` mode (RM L536 as amended).

### F.4 CSP and headers (TAC J; RMP E-7; live baseline `09-seo/live-evidence-2026-10-12/hdr_`)
- **Baseline CSP to keep unchanged:** `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https:; frame-src 'self' blob: https://www.youtube-nocookie.com https://www.youtube.com; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; report-uri /api/v1/security/csp-reports; report-to csp-endpoint`.
- **Implications:** no inline executable scripts, no third-party script, font or CDN. JSON-LD and data blobs are non-executed `type` blocks.
- **Other headers:** HSTS `max-age=31536000; includeSubDomains` (platform), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, the Permissions-Policy as baseline. These must be identical on prerendered responses and the sitemap (J-1).
- **CSP violations:** `atlas_csp_violations_total` stays at 0 for 48 h after the switch (J-2).
- **Caching:**
  - static marketing HTML is edge-cacheable with purge on deploy and on catalog change;
  - `/index.html` stays `no-cache`;
  - hashed assets immutable (J-3);
  - `/sw.js` 4-hour Cloudflare cache is WEB-08 → B4 (owner Cache Rule).
- **Noindex:** staging carries `X-Robots-Tag: noindex` + access control; production marketing carries **none** (J-4).

### F.5 Cookieless beacon (RM WS-09 L729–745; AMP L154, L215–228, L247–261, L364, L434, L611, L616; DISP XB-07, XB-15)
- **Endpoint:** `POST /api/v1/mkt/events`, a sibling of `POST /rum/vitals`. Cloned RUM design: 204, `credentials:'omit'`, GPC/DNT skipped.
- **Data rules:** **closed vocabularies only**; no identifiers; no IP stored; nothing stored in the browser; never a raw URL, query or fragment.
- **Storage:** daily aggregate rows in Postgres, retained 25 months [proposal]. The migration is additive and nullable.
- **Protection:** scrubber, bot filter, per-IP throttle.
- **Deployment:** deployed **dark** (no client calls) until M1a.
- **Properties:**
  - P-PAGE `page_template` ∈ {`mkt:home`, `mkt:features`, `mkt:pricing`, `mkt:contact`, `mkt:security`, `mkt:about`, `mkt:legal`, `other`} for M1a (`mkt:demo`, `mkt:founding`, `mkt:design-partners` removed, XW-06), plus `locale`, `device_class` (767 px rule);
  - P-CAMPAIGN UTM values from the register (else `unregistered`) + `referrer_domain`.
- **Events for M1a:**
  - A1 `page_viewed`; A2 `section_viewed` (`s1_hero`…`s14_closing`); A3 `feature_tab_used`; A4 `video_progressed` (if video ships); A5 `faq_expanded`; A6 `language_switched`;
  - A7 `cta_clicked` (`cta_t`, `cta_c`, `cta_pricing`; not founding/partner); A8 `billing_toggle_changed`;
  - B1 `contact_form_started`; B2 `contact_form_submitted` (after `{received:true}`; over-counts);
  - C1 `whatsapp_clicked` (only if a wa.me link exists); M1 `campaign_landing`.
  - A9 (`/demo` hub) is out of scope.
- **RUM templates:** marketing templates in `route-template.ts` + backend vocabulary + marketing sample rate (B9).
- **Consent:** **unresolved.** It is an RV-07 question (counsel, OC-24 → B4). Until counsel confirms the exemption, the beacon may be built and staged but **ships behind consent** in production (XB-15).
- **Host rule:** no marketing analytics on academy hosts or in the app (AMP L434). DQ-07 academy-host leak test runs every release and blocks the release (AMP L512).
- **Privacy policy:** today it says there are no analytics cookies or third-party scripts. The beacon must be disclosed in EN + AR before launch (AMP L451).

### F.6 Smoke tests §8.6 (RM L1061–1072; run at the switch and after any rollback; scriptable now)
| # | Test | TAC |
|---|---|---|
| 1 | No-JS fetch of every M1a URL EN/AR: 200, title/description, canonical, hreflang, lang/dir, H1, JSON-LD parses, pricing equals the API | A-1…A-7, B-1, B-2, C-1, E-2 |
| 2 | Redirect matrix + 404s (`/this-does-not-exist`, `/ar/does-not-exist`, `/blog`) + planned URLs 404 (F-12) | F-1, F-8 |
| 3 | Host matrix: robots/sitemap/llms on apex, www, academy, custom domain; llms 404 on academy hosts | G-1…G-4, I-3 |
| 4 | App regression: 10 dashboard deep links on `dashboard.<base>` (DL-63) and their apex `301`s, `AUTH_ROUTES`, `?plan=` (key from the API), `/verify` on both host types, offline `/dashboard` reload gives the SPA shell | H-1…H-4 |
| 5 | Academy SSR `x-atlas-ssr: render` on 3 hosts | G-7 |
| 6 | Forms: real submission reaches contact-submissions + owner notification; consent stored (**topic `sales`, marked TEST**; staging posts to the local stack) | H-7; XB-06 |
| 7 | Attribution (local stack) + beacon aggregate received | — |
| 8 | Headers identical to the baseline; CSP report count 0 | J-1, J-2 |
| 9 | Social previews `/`, `/ar`, `/pricing` | B-6 |
| 10 | Production marketing pages carry no `noindex` | J-4 |

**Release rule** (TAC L7, §K.1): every `[GATE]` check (A, B, C, E, F, G, I, J) passes on staging before the switch and again on production within 1 h. A failed `[GATE]` after the switch → roll back. **Daily synthetic checks:** F-1, F-4, F-7, G-1…G-4, I-1, I-3.

### F.7 Go/no-go §8.7 (16 lines; RM L1074–1095 as amended by DISP; B1P-03 §5)
| Line | Check | Buildable by an engineer now? |
|---|---|---|
| 1 | M1a items `Approved` in RR (RP-2 incl. RV-08); AG-5 screenshots; Magnific provenance + OC-19 | No: owner/reviewers (OC-24/25/32/19 in B4). Engineer builds the capture manifest + provenance records |
| 2 | Claims register: gates closed or sections hidden; banned-strings lint clean; no "free"; no literal trial length | **Yes**: `claims.yaml`, build-time section flags, lint on rendered HTML |
| 3 | No-JS, redirect, host and app matrices green on staging | **Yes**: curl/Playwright matrices parameterised by host (WS-11) |
| 4 | Lighthouse within §H; axe 0 EN/AR light/dark; keyboard + SR passes recorded | **Yes** (CI jobs); manual passes recorded |
| 5 | Unique titles and descriptions; canonicals on the production origin; hreflang complete; JSON-LD valid | **Yes**: head generator + validators (WS-08 report) |
| 6 | `noindex` only on staging; no staging rules in the production image | **Yes**: header check |
| 7 | `/index.html` byte-identical, never redirected | **Yes**: CI shell-identity byte-compare |
| 8 | Rollback rehearsed on staging (switch-off + SHA pin) with timings; `--check-rollback-record` passes | Partly: runbook + staging rehearsal; the pin mode is OPS-13 (→ B4) |
| 9 | Search Console/Bing verified; sitemap URLs ready | Owner (OC-18 done); engineer prepares the sitemap |
| 10 | Contact TEST submission (topic `sales`) in contact-submissions + owner notification; consent stored; wording RV-02 | Partly: consent fields are SUP-04 (B4); RV-02 counsel |
| 11 | Beacon working on staging; **no third-party script**; privacy policy matches what is collected; beacon consent-exempt per counsel or behind consent | Engineer: beacon + "0 third-party" check; counsel part blocked |
| 12 | `/pricing` = catalog (OC-27); trial from the catalog; no free/Premium/USD | **Yes**: parity test against `GET /public/plans` |
| 13 | Ops ready (disk headroom, no deploy in progress, owner + engineer available 2 h); TOTP on the operational Platform Owner account (DL-32); OA-PO-1 recorded | Owner |
| 14 | Academy-host robots/sitemap per host (B0-WEB-01) | Engineer, but WEB-01 is in B4 (partially verified) |
| 15 | 60-day trial reset to 14, checked on `GET /public/plans`, dated | Owner (engineer can script the API check) |
| 16 | B0 exit recorded (done, DL-49) + design-partner criteria met | Owner |

- **Switch-time checks:** smoke 1–10 within 1 h; TAC `[GATE]` re-run; CSP 0 for 48 h; owner AG-7, then `ATLAS_MARKETING_STATIC=on` + sitemap submission = **B2 day 1** (B1P-03 §5 items 7–8).

### F.8 Other build acceptance worth wiring now
- **WS-01** (RM L549–554):
  - `off` → holding page; `on` → prerendered HTML;
  - academy-host or custom-domain Host gets the academy response;
  - no dashboard modules in marketing chunks.
- **WS-02/WS-03** (RM ~L578, L607):
  - LPB §M items 1–8;
  - banned-strings lint; no literal "3-day";
  - ported tests green: `watermark-claims`, `pricing-limits-only`, `marketing-contact-section`, `plan-gifted-days`, `terms-and-pricing-content`, `privacy-policy-content`, `e2e/j41-gifted-days`, translation parity;
  - CI fails on a malformed feature ID, a missing AR pair, missing alt text or a gated claim;
  - a closed gate shows its section after a rebuild.
- **WS-07** (RM L701):
  - server `lang`/`dir`; no English fallback in AR (parity + rendered check);
  - hreflang only for complete pairs;
  - `/ar/pricing` CTA opens registration in Arabic with Preferences declined.
- **WS-12/F-12:** the link linter accepts the declared `planned` list and asserts each planned path returns 404 (not 200/3xx) and is absent from sitemaps and hreflang. It fails on orphans and on non-manifest links (IA L348; XA-03).
- **WS-13:** a test PR with a gated claim, a missing AR pair or an unreviewed security page cannot merge.
- **Staging (WS-14):**
  - protected hostname under the reserved label (`staging`) on the current domain;
  - `X-Robots-Tag: noindex` + access control on that host only;
  - contact form posts to the local stack.

---

## G. "Do not" list and open contradictions

### G.1 Do not (marketing site)
1. **Do not** switch the site on, submit sitemaps for new pages, post on social, contact design partners, or publish any offer, price communication or claim before the owner's go-ahead and AG-7 (RM L313; DL-49: B1 not started). Prep work: "built and reviewed on local stack/staging" only (P-02/P-03 guards).
2. **No third-party scripts, fonts or CDNs.** **No GA4** in B1 (B2, only after RV-07 + OC-31). No Meta pixel. No YouTube player on marketing pages without a consent review (XB-07; BDA §10.10; AMP A4).
3. No `/go/*` redirects (XB-10). No `/demo`, `/founding`, `/design-partners`, `/lp/*` pages. No `?topic=founding` (XW-06, XW-12).
4. No hard-coded prices, currencies or trial lengths. No Premium, USD or "Most popular". No "free"/«مجاني» anywhere (DL-38; R-01; R-03).
5. No logo or favicon on a public surface (social avatars included) before RV-08 (RM L205).
6. No generated imagery that depicts UI, receipts, logos, certificates or readable text. No Magnific release before OC-19. Never mirror screenshots. Never capture from production. No text-lesson, upload, live, blog, Google-button or integrity frames (ASP A.1, B.1; DL-06; DL-12).
7. No testimonials, logos, counts, ratings, `AggregateRating`/`Review` schema, case studies or uptime figures. No compliance badges. No competitor names (POS D.9).
8. Never redirect `/index.html`. Never put prerendered HTML at `dist/index.html`. Never serve platform files on academy hosts. Never 301 unknown or removed URLs to home. No IP or Accept-Language redirects (SEO §5; RMP E-3…E-9).
9. No soft-404 for planned feature URLs (no catch-all 200, no `spa-legacy`, no redirect loop) (DL-37).
10. No backdrop-blur, glassmorphism, gradient meshes, autoplay video, scroll-jacking, parallax, autoplay carousels, exit-intent or timed popups (LPB B.5, §E, §G.3).
11. No `twitter:site` and no `sameAs` until real profiles exist. No social icons in the footer (MDS L26; IA L327).
12. Don't change dashboard tokens or academy theme scope. Don't touch app routes, academy hosts, `/api/*`, `GET /public/plans` or `POST /public/contact` contracts (DL-11; BDA §10.11; RMP §4).
13. Don't use superseded MKT-v1 content: the "Arabic-first" category line, "live in a day", "hidden code", centres (السناتر) as secondary, the Teacher 990 / Pro 2,490 / Center 5,990 ladder, the "Kollia" rename idea.
14. Don't claim trademark or legal clearance. Don't present unreviewed AR or legal text as reviewed (DL-13; DL-31).

### G.2 Open contradictions and decisions relevant to the build
| # | Conflict | Sides | Working rule / who decides |
|---|---|---|---|
| C-1 | **Brand colour** | Planning: Atlas Deep Teal is the single brand hue; DL-13/OQ-02 say the logo is "within the existing palette"; BDA §10.2 "palette change is a rebrand: [OWNER]"; ASP art direction and theme-color #15696F/#38AAB2 are teal-based. **Owner now rejects teal and purple/indigo** | Owner decision needed and to be recorded (it is a rebrand per BDA §10.2). This affects the tokens (marketing scope only, or the product too?), theme-color, the MG art direction, OG plates and the logo. Keep the token architecture and contrast rules (A.7) |
| C-2 | Light vs dark on marketing | OQ-44 "light marketing theme"; switcher removed (IA L305) vs go/no-go 4 / LPB F "axe light and dark" | Decide: honour `prefers-color-scheme` with dark tokens, or light-only (then amend line 4) |
| C-3 | B0 closed with gates in B4 | RV-08 (OC-25), RP-2 counsel (OC-24), RV-14 (OC-32), RV-16 (OC-17), OC-19 Magnific, OC-10 A9, WEB-01, OC-15 (entry E-3 time sheet), OC-29 demo academy, OPS-13 pin rollback, SUP-04 consent, ANL-04 attribution all moved to B4 (DL-47), yet they gate B1 entry, exit or §8.7 | Build and stage everything. The switch cannot pass AG-7 as written unless the owner re-opens these records or records G.7 changes (B1P-03 §5: no deferral rule exists) |
| C-4 | Page count | P-04 / RM WS-02 "13 pages" vs M1a 8 + 404 | M1a = 8 + 404 per language (XW-01) |
| C-5 | Founding CTA | RM §3.1 item 4 still lists `/contact?topic=founding` | XW-12: not in B1; the enum lacks it |
| C-6 | 404 links | MDS L94/L113, TAC F-2, SEO §5.1 say "help center/docs" | XA-03: home, pricing, contact only |
| C-7 | Sitemap index contents | TAC C-8 lists `docs-en.xml`/`docs-ar.xml` | Docs = B2 (XB-11). B1 index lists only marketing-en/ar |
| C-8 | Hero budget | TAC D-3 / SEO §13 ≤ 70/140 KB | XW-08: ≤ 50/120 KB |
| C-9 | "free trial" still live | CPY-24 → B4: Privacy, Terms and the register page (`auth:register.plan.freeTrial`) may say "free trial"/«تجربة مجانية» | The lint will fail on `/privacy-policy`, `/terms`. Counsel rewording is needed (RV-02/03); no allow-list for marketing |
| C-10 | M0 case normalisation | XB-04 says slash/case on live pages at M0; RDM has only slash rows for M0 (case rows are `switch`) | Add case rows for `/`, `/ar`, `/privacy-policy`, `/terms` at M0, or confirm switch-only |
| C-11 | Pricing schema type | SEO §12 `SoftwareApplication`+`Offer` vs PRC §4.4.2 `Product`+`Offer` (`eligibleQuantity`, `valueAddedTaxIncluded`) | SEO says "choose one": use `SoftwareApplication` (09-seo governs metadata, REC) |
| C-12 | Premium/USD removal | CAT-03 → B4 (partial) vs OC-27 verified catalog = 3 plans; MED-03 Premium hidden; DL-38 "removed through the catalog, not page code" | Render what the API returns. Add a build assertion (proposal) that fails on non-EGP or a Premium family, rather than filtering silently |
| C-13 | Enterprise card | A3 approves "from EGP 15,000"; R-02 shows it "only if owner approves that floor"; DL-38 "prices only from the catalog"; no catalog key (`enterprise` = Organization) | Owner: is the floor allowed as static copy? Default: card without a price, CTA `/contact?topic=sales` (no `plan=enterprise`, which would mean Organization) |
| C-14 | Billing toggle default | PRC §4.4.2 default annual (test E); LPB silent | Owner/G.2 decision |
| C-15 | FAQ wording | PRC FAQ "Is there a free plan?" vs the ban on "free" | Rephrase without "free", or a documented allow-list entry (TAC A-8 allows documented exceptions) |
| C-16 | Arabic trial plural | MDS/REC template «تجربة {days} أيام» is wrong for 14 (should read «١٤ يومًا») | ICU plural forms per R-01 ("correct Arabic plural forms") |
| C-17 | Arabic terms | UI glossary «الخطة/الدورة/الفترة التجريبية» vs marketing «باقات/كورس/تجربة»; OQ-33 "glossary follows shipped UI wording" vs MDS "market vocabulary in titles" | Titles may use market words. CTA hand-off copy should match the UI. RV-14 decides |
| C-18 | Lifted gates not yet in the claims register | OC-12 Google sign-in done; quiz engine v2/integrity flags `on` (P2B) | Keep banned/hidden until the claims register is updated by decision |
| C-19 | Logo source | BDA L225, ASP L123, RMP R-18/A-08 "export AtlasLogo.tsx, no redraw" | DL-13 wins (XA-10) |
| C-20 | Favicon at M0 | RMP P1 (old) | Waits for RV-08 (XB-04) |
| C-21 | Unknown-paths 404 timing | RM L1042 (M0) | Switch (XB-05) |
| C-22 | Domain | OQ-03/SEO §2.1 recommended an owned domain (option B) | DL-39: stay on `atlass.dpdns.org`; WS-NAME later (RK-85 equity risk); keep origin configurable (`VITE_SITE_URL`) |
| C-23 | Stale "pending" gates | TAC A-7/E-6/I-5, RDM L74 "after 05-pricing approval"; RDM L66 "pending D-6"; IA §3.1/LPB S11 "hidden until 05-pricing approved"; MDS §4.1 "trial 3 days" | Pricing approved (A3) and switched (OC-27): active at M1a. `/verify` noindex decided (OQ-34) |
| C-24 | Staging contact form | RM L1011 (local or disabled) vs TAC H-7 (real staging submission) | XB-06: staging → local stack; production TEST `sales` at the switch |
| C-25 | Contact response time | LPB S13 "only if owner commits"; OQ-23 sets internal targets, "publish only what can be kept" | Owner confirms public wording |
| C-26 | Custom-domain claim | S2 fact 2 / S6 "on every plan" (all plans include it per PRC §4.2.2-A) vs CF-28 (no live custom domain verified; WEB-11 → B4) | Show only "connect your own domain" wording without "every plan" until a showcase domain is verified; SS-020 withheld |
| C-27 | Analytics plan vs scope | AMP A9 `demo_academy_opened` (`/demo` hub), `cta_apply_founding`/`cta_apply_partner`; AMP says the beacon is "Phase 2" | Not in B1 (XW-06). The beacon is built in B1, dark until M1a (X-8) |
| C-28 | S5 with the A9 gate closed | IA §3.5 makes the whole protection page conditional on A9; LPB gates only the trace sentence and screenshots | Home S5 ships text-only (code, devices, disclosure) without trace or screenshots, pending RV-12. The feature page stays planned |
