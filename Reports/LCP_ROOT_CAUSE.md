# Public website LCP — root-cause report, fixes and decision (30 Sep 2026)

Scope: the Academy public website (Theme 1 and the base themes), mobile Lighthouse, the fixture build served like production (same origin, gzip, enforced CSP). Branch `claude/practical-wozniak-pjcdhe`, after P-2.

## 1. Current LCP timeline

Lighthouse's default (simulated) mode reports FCP ≈ 3.8–3.9 s and LCP 4.2–4.9 s; unthrottled, the same page paints at ≈ 0.5 s and reaches LCP at 0.5–0.75 s. The delay is therefore entirely what the page has to download and run before it can paint on a slow connection. To see the real order of events, Home was re-run with applied DevTools throttling (150 ms RTT, 1.6 Mbps, 4× CPU):

| # | Stage | Time (ms) | Share |
|---|---|---|---|
| 1 | HTML (1.4 KB) | 0 → 570 | one round trip |
| 2 | 8 JS chunks (≈ 400 KB gzip) + CSS 28 KB, in parallel | 615 → 3,471 | **≈ 2.9 s** |
| 3 | Google Fonts CSS (`@import` inside `index.css`) | 2,582 → 2,863 | serial after the CSS; render-blocking |
| 4 | Entry executes, discovers the translation chunk | 3,471 → 3,689 | CPU |
| 5 | `bundle-en` (103 KB) | 3,689 → 4,813 | **≈ 1.1 s, serial** |
| 6 | Providers mount, first render (FCP) | → 5,153 | |
| 7 | `GET /public/websites/resolve` | 5,182 → 5,751 | starts only after the first render |
| 8 | `GET …/{id}` + `GET …/{id}/pages` (parallel) | 5,785 → 6,397 | one more round trip |
| 9 | Home hero rendered (LCP) | → 6,854 | |

## 2. The actual LCP element

- Home: the Theme 1 hero `<h1>` (text). The hero photograph is below it at 390 px.
- Courses, Course Details: the cookie-consent banner paragraph (first visit, no consent stored). It renders with the app shell, so on those pages LCP = FCP.

## 3. Root causes, largest first

1. **The public website downloads the whole dashboard application before it can paint (stage 2).** The entry chunk is 1.25 MB raw / 172 KB gzip and statically pulls in `PublicWebsiteRouter`, every theme's renderers, the Theme 1 pack, the dashboard layout, navigation and command palette, the auth pages' code, toasts and more. `AppRouter` declares `PublicWebsiteRouter` as `lazy()`, but also imports `getCurrentPublicWebsiteContext` from the `@features/public-website` barrel, which re-exports `PublicWebsiteRouter`, so the lazy boundary never takes effect. `DashboardLayout`, `AuthLayout` and `PublicLayout` are static imports too. `manualChunks` then pins every Radix component, `zod` + `react-hook-form`, and every `date-fns` function and `lucide` icon used anywhere in the product into vendor chunks that the entry imports statically.
2. **Serial discovery of the translations (stage 5).** The language chunk is requested only after the entry has downloaded and run.
3. **Data is fetched only after React has mounted (stages 7–8).** The hostname, and so the resolve request, is known the moment the page loads, but two round trips of API calls wait until after the first render.
4. **A third-party, render-blocking font chain (stage 3).** `index.css` `@import`s `fonts.googleapis.com`, which then loads files from `fonts.gstatic.com`: two extra origins (DNS + TLS each), and nothing paints until that CSS arrives. It was hidden behind stage 2 in this run and becomes visible as soon as stage 2 shrinks.

Not causes: the images (`home-hero` is eager, `fetchpriority="high"` and not the LCP element at 390 px), CLS (fixed), theme resolution (a pure function of already-fetched data) and main-thread blocking (TBT 30–170 ms).

## 4. What is unnecessary on the public critical path

Dashboard layout, navigation, command palette (`cmdk`), dashboard providers' code paths, auth pages, Themes 2–5 base renderers on a Theme 1 site, most Radix primitives, `date-fns`, the form libraries on pages without forms, every namespace of the translation bundle except the public ones, and the serial ordering of stages 4–8.

## 5. Proposed fixes (no SSR), in order

| Fix | Change | Expected effect | Regression risk |
|---|---|---|---|
| A | Restore the lazy boundaries: import `getCurrentPublicWebsiteContext` from its module, not the barrel; lazy-load the three layouts; stop pinning Radix / form / utils vendors in `manualChunks` (keep React, router, i18n and query as shared vendors) | The public entry drops to the app shell; the site's code loads only on the site | Low: behaviour unchanged, only chunk boundaries move. Covered by the visual baseline, unit tests and journeys |
| B | Start the site's critical work in parallel at boot: on an Academy host, `main.tsx` starts the public router chunk, the language bundle and the resolve → configuration/pages requests at the same time; the hooks reuse those in-flight requests | Stages 4–8 become one parallel wave instead of four serial steps | Low-medium: must keep React Query's error, retry and caching semantics (the hooks fall back to a normal fetch) |
| C | Self-host the fonts: the same OFL `woff2` files Google serves (identical glyphs and unicode ranges), with `@font-face` and `font-display: swap` in the app's own CSS | Removes two third-party origins and the render-blocking chain; also tightens the CSP | Low: identical files, so pixels are unchanged (the baseline already renders with these exact files from its font cache) |
| D | Only if still needed after A–C: a public-only translation bundle | ≈ 80 KB less on the public route | Medium: a missing namespace shows empty text; needs coverage |

## 6. Is SSR/prerendering necessary?

Not on this evidence. Every measured stage is client-side waste that can be removed without changing the rendering model; unthrottled, the page already paints in ≈ 0.5 s. SSR would make the *first* paint independent of JavaScript, but would bring a Node rendering tier, hydration and per-tenant HTML caching into a single-VPS Caddy deployment: a large architectural change. It is reconsidered only if A–D measurably cannot reach LCP ≤ 2.5 s.

## 7. Can a smaller, safer change reach ≤ 2.5 s?

Estimated: A + B bring the public critical path to roughly the React/router/i18n/query shell plus the site's own code and one parallel wave of data and translations; with C removing the third-party chain, the simulated FCP should fall to roughly 2 s. This is to be proven by measurement after each step, not assumed.

## 8. What was implemented (fixes A–D; no SSR, no design change)

| Fix | Change | Files |
|---|---|---|
| A | `AppRouter` now only decides website vs dashboard; both sides are `lazy()`. The dashboard routes moved to `AtlasAppRoutes` (whole module lazy). The hostname helpers moved from the `@features/public-website` barrel to `@utils`, so importing them no longer pulls in `PublicWebsiteRouter`. `manualChunks` keeps only React, router, i18n, query and a small utils vendor; Radix, forms, `date-fns` and `lucide` split with the code that uses them. `src/` modules are declared side-effect free to Rollup (except `main.tsx`), so barrels no longer drag whole features into the entry. Auth pages and the learner area on the public site are lazy. | `src/app/routes/AppRouter.tsx`, `AtlasAppRoutes.tsx`, `src/App.tsx`, `src/shared/utils/public-website-context.utils.ts`, `src/features/public-website/PublicWebsiteRouter.tsx`, `vite.config.ts` |
| B | On an Academy host, `main.tsx` starts the public router chunk and the resolve → configuration + pages requests at boot, in parallel with the translations. The React Query hooks take the in-flight promise once (`takePrefetched`) and fall back to a normal fetch, so errors, retries and caching are unchanged. | `src/services/public-website/public-website-prefetch.ts`, `src/main.tsx`, the three `use*` hooks |
| C | Fonts self-hosted: the same OFL `woff2` files Google serves (verified identical by sha256), 62 `@font-face` rules with the same unicode ranges and `font-display: swap`. The CSP drops `fonts.googleapis.com` and `fonts.gstatic.com`. | `src/styles/fonts.css`, `src/assets/fonts/` (16 files + 3 OFL licences), `src/index.css`, `Caddyfile` |
| D | Translations split per language into a core (the 9 namespaces a public page's first paint uses) and the rest. A public site waits for the core only; the rest loads at idle, and every lazy public route waits for it (`withCompleteTranslations`), so no screen renders a missing key. The dashboard still loads the whole language before rendering. | `src/localization/language-resources.ts`, `resources/bundle-*-core.ts`, `bundle-*-rest.ts`, `i18n.ts` |

**Found by the visual baseline and fixed:** once the theme pack became lazy, `modern-education.css` shipped as a chunk stylesheet that loads *after* `index.css`, so its rules started overriding Tailwind utilities of equal specificity. For example, `.t1-lead`'s `65ch` measure beat `max-w-xl`, which re-wrapped the Theme 1 v1 hero lead. `main.tsx` now imports the two theme stylesheets before `index.css`, the order they had when the app was one bundle (they are ≈ 3 KB gzip of CSS, already in the entry before).

Nothing visible changed: no content hidden, no UI removed, the same fonts and pixels (the full visual baseline, §9), EN/AR/RTL unchanged, the CSP only tightened.

## 9. Measured results

Lighthouse 12, mobile, simulated throttling (150 ms RTT, 1.6 Mbps, 4× CPU), median of 3 runs per case, first visit, cold cache, the fixture build served like production. 20 cases (5 themes × Home new/rich, Courses, Course Details).

- **Before:** branch HEAD `8fa85c5` built in a separate worktree.
- **After:** the final code of this session, with the released Theme 1 images, measured on an otherwise idle machine.

**HTTP/2 + TLS (how production serves the site, Caddy):**

| | Before (median) | After (median) | After (worst case) |
|---|---|---|---|
| Performance | 76 | **90** | 88 |
| FCP | 3,838 ms | **2,558 ms** | |
| LCP | 4,237 ms | **3,024 ms** | 3,246 ms |
| TBT | 59 ms | 66 ms | 181 ms |
| CLS | 0.009 | 0.009 | 0.016 (Theme 1 Courses; 0.017 before) |
| Script transferred | 485 KB | 388 KB | |
| Accessibility score | 100 | 100 | |

Theme 1: Home 76/77 → 90, LCP 4.22 → 3.04–3.10 s; Courses 77 → 90, LCP 4.24 → 3.09 s; Course Details 77 → 90, LCP 4.21 → 3.02 s. The released photographs don't change LCP: the LCP element is the hero heading, and every photograph below the hero is lazy.

**HTTP/1.1 (the fixture server's default, 6 connections per origin):**
- FCP 3.84 → 3.24 s, LCP flat (4.39 → 4.35 s).
- TBT rises (37 → 147 ms median, worst 256 ms): the public page is now ~50 smaller requests instead of ~20 large ones, which HTTP/1.1's connection limit serialises, so their evaluation lands in more separate tasks.

Production is HTTP/2, so the HTTP/2 table is the one that applies. The committed `baselines/lighthouse.json` keeps its HTTP/1.1 method, for continuity with earlier phases.

Unthrottled, Home now paints and reaches LCP at ≈ 0.24 s (was 0.56 / 0.76 s).

**The "before" runs include no web-font download** (the fixture environment has no internet access, so Google Fonts failed silently), while "after" pays for the self-hosted fonts (≈ 35 KB on first paint). The comparison is therefore conservative for "after".

## 10. Remaining gap to LCP ≤ 2.5 s, and the decision needed

The LCP element on Theme 1 Home is still the hero `<h1>` (text). What remains, from the HTTP/2 traces:

- **FCP ≈ 2.55 s is the cost of the JavaScript that must run before anything can paint.** A 1× CPU run barely moves it (2.51 s), so it is network bytes and round trips, not CPU: ≈ 214 KB in the first wave (entry, React/router/i18n/query vendors, CSS), ≈ 126 KB in the second (the public router chunk, the core translations), then the fonts.
- **LCP − FCP ≈ 0.5 s is the data wave** (resolve → configuration + pages), which now starts at boot but still after the entry has downloaded and run.

Small, safe steps that remain (not implemented; estimates, to be measured):

1. Lazy-load the cookie-preferences dialog, `NavigationBlockDialog` and the Radix toaster on the public site: ≈ 20–30 KB, ≈ 0.1–0.15 s.
2. Start the resolve request from a tiny same-origin classic script in `<head>` (CSP-safe, no inline script) instead of from the entry: could hide most of the 0.5 s data wave behind the JavaScript download.

Together these might bring LCP to ≈ FCP ≈ 2.4–2.6 s under the Lighthouse mobile model. That is borderline, not a guarantee.

**Reaching LCP ≤ 2.5 s reliably needs the first paint to stop depending on JavaScript: HTML-first rendering of the public website.** Per the Owner's instruction this is **not implemented**. It is documented here for approval.

**Minimum architectural change proposed: server-render the public website routes only.**

- A small Node rendering service renders `PublicWebsiteRouter` pages to HTML with the same React components (`renderToPipeableStream`), EN/AR with the right `lang`/`dir`, and embeds the page's data as a non-executing `application/json` block (allowed by the CSP) so the client hydrates without refetching.
- Caddy routes Academy hosts' page requests to it; `/api/*`, assets and the dashboard are unchanged. On any failure it falls back to today's SPA `index.html`.
- Output is cached per `(academy, configVersion, locale, path)`, the same key the public API cache already uses, so a publish invalidates it naturally.
- Expected: FCP/LCP ≈ HTML + CSS + font ≈ 1.2–1.8 s simulated (estimate), independent of the JavaScript size.

Risks and costs:

- **A new runtime tier** on the single VPS: a process to deploy, monitor and restart; memory per render; a new failure mode, mitigated by the SPA fallback.
- **Hydration mismatches:** anything that differs between server and client (dates, random ids, `window`/`localStorage` reads such as cookie consent, viewport-dependent rendering) must be made deterministic. Every public section renderer needs an audit.
- **Tenant isolation of cached HTML:** the cache key must include the academy and must never cache a signed-in response. Only anonymous public pages are rendered.
- **Security:** the renderer calls the public API server-side (SSRF surface limited to the internal API origin), and any HTML injection bug becomes server-rendered. The same escaping rules as React apply, but they need an explicit review.
- **Live data:** course counts, catalogues and statistics are rendered at request time (or cached per `configVersion`), so they can be up to one cache lifetime stale before hydration refreshes them. This needs a short TTL or cache busting on course changes to avoid a visible jump (CLS).
- **Effort:** medium–large, touching every public route, the deployment and the test harness (the visual baseline and Lighthouse must run against the SSR server).

**Alternative, smaller but weaker:** prerender each Academy's public pages at publish time into static HTML served by Caddy, with the same hydration.
- This avoids a request-time renderer.
- But live sections go stale between publishes, and every course change has to trigger a re-render.

**Decision requested:** approve (a) the two small steps above only, accepting ≈ 2.4–2.6 s; or (b) the SSR proposal as its own phase; or (c) accept the current ≈ 3.0 s (performance 88–90 on HTTP/2) for now.

---

## Addendum (1 Oct 2026): server rendering of the public site, implemented and measured

The HTML-first option above (server rendering of the public routes only) was authorised and built. Report: `Reports/SSR_ARCHITECTURE_ANALYSIS.md` §12. It ships **off** (`ATLAS_SSR`); nothing was deployed.

Lighthouse (this report's methodology: mobile, simulated, median of 3, HTTP/2), same build served as the SPA vs server-rendered, Theme 1:

| | SPA | SSR |
|---|---|---|
| LCP, EN (Home, Courses, About, FAQs, Contact) | 3.04–3.06 s | **2.25–2.28 s** (≤ 2.5 s met) |
| LCP, AR (same pages) | 3.17–3.32 s | **2.57–2.59 s** |
| LCP, Course Details EN / AR | 3.05 / 3.31 s | **2.57 / 2.87 s** |
| Performance | 79–90 | **90–96** |
| TBT | 51–220 ms | **0–38 ms** |

Two lessons came out of the measurements:
- **Preloading the route's JavaScript from the server HTML made first paint slower.** It competes with the render-blocking stylesheet.
- **Hydration must run as a transition**, or it is one long task.

What remains above 2.5 s is Arabic, which carries about 22 KB more script (translations) and one more font file, and Course Details, the heaviest page.
