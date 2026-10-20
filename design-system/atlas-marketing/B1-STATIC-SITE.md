# Atlas marketing site — B1 static build (20 Oct 2026)

This supersedes the colour and motion decisions in `MASTER.md` for the static
marketing site in `src/marketing/` (owner decision DL-50). Layout, type and the
"no glassmorphism" rule from `MASTER.md` still apply.

## Direction

| Axis | Decision | Why |
|---|---|---|
| Colour | **Royal Navy + Gold**, from the platform tokens in `src/index.css` (`--primary` navy, `--brand-gold` accent; dark mode in the same file) | Owner chose palette 1 on 20 Oct 2026; teal and purple/indigo were rejected |
| Logo | Magnific-generated "A + open book" mark, `public/brand/*` | Owner-approved |
| Pattern | UI/UX Pro Max `hero-features-cta`: CTA in the hero, sticky header CTA, one closing CTA band | Same as MASTER |
| Pricing | UI/UX Pro Max `pricing-page-cta`: cards → comparison table → FAQ → CTA | Catalog-driven (DL-38) |
| Type | Readex Pro (display) + Rubik (body), self-hosted | Unchanged |
| Motion | CSS only: one hero rise (420 ms), colour transitions; all behind `prefers-reduced-motion` | No React at runtime |
| Accent use | Gold only for: eyebrow dot, "Recommended" badge, yearly-saving line, closing-band primary button | Keeps navy dominant |

## Rules the build enforces

- Pages are React rendered to static HTML at build time; the only script is
  `client/main.ts` (theme, menus, live price refresh, contact form). Every page
  works without JavaScript (FAQ, menus and billing toggle use native elements).
- Tokens only (no raw hex in components); logical properties for RTL; Arabic
  digits via `ar-EG` on Arabic pages.
- UX rules adopted from UI/UX Pro Max: skip link, visible focus ring, 44 px
  targets, inline errors plus an error summary on the contact form, screenshots
  with fixed dimensions and lazy loading, sticky header that never hides
  anchored content (`scroll-margin-top`).
- Screenshots are real captures from the local stack with demo data, never
  mirrored, always captioned "Demo content".
- Copy claims follow the SPEC claims register; `pages/pages.test.tsx` lints the
  rendered HTML for banned strings.
