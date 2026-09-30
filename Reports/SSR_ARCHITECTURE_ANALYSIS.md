# SSR for the public Academy website — architecture and dependency analysis (30 Sep 2026)

Written **before** any SSR code, as the Owner required. Every statement is backed by a file reference from four read-only audits of both repositories and by a local experiment (Caddy fallback, §6). Scope: server-render **only** anonymous public Academy website pages; everything else stays exactly as it is.

## 1. Verdict

**SSR can be introduced without touching any stop-rule area.** None of the following is required:
- tenant architecture, RLS, authentication, the database schema, payments, courses/learners, provisioning;
- public API contracts;
- the ThemePack architecture or a second renderer;
- removing functionality, deleting data, any production migration, or any irreversible infrastructure change.

The work is:
- a server entry;
- a small Node renderer service;
- one Caddy route with a verified fallback;
- **frontend determinism fixes** in the public render path (listed in §4). Several of these fix real latent bugs.

Two items are recorded as Owner-visible decisions (§10). Neither blocks.

## 2. Current architecture (facts)

**Deployment:**
- **Topology:** a single ARM VPS behind Cloudflare. The compose file is `atlas-backend/deploy/docker-compose.prod.yml` (services postgres, redis, backend, caddy, and optional monitoring).
- **Frontend container:** Caddy plus the static Vite `dist` (`atlas/Dockerfile`). There is no Node at runtime, and the Caddyfile is baked into the image.
- **Routing:** Caddy proxies `/api/*` to `backend:3000`; everything else is `try_files {path} /index.html`.
- **Blocks:** the platform block covers `atlass.dpdns.org, *.atlass.dpdns.org`. The `:443` catch-all serves custom domains through Cloudflare for SaaS.
- **Mode switch:** "academy website" vs "atlas app" is decided only in the browser, from the hostname (`resolvePublicWebsiteContext`).

**Client boot and rendering:**
- `main.tsx`:
  - loads the runtime config (a no-op; `VITE_API_BASE_URL` is compiled in);
  - on Academy hosts, starts the public router chunk and the resolve → configuration + pages prefetch;
  - preloads the core translations;
  - `createRoot().render(<App/>)`.
- `App`:
  - `AppProviders` (theme, localization, identity, platform, toasts, query, dialogs, loading, tooltips);
  - a data router (`createBrowserRouter`, one splat route) → `RootRoute`: unsaved-changes, cookie consent, `ScrollRestoration`, `AppRouter`, consent banner and dialog, navigation-block dialog.
- `AppRouter` renders lazily: `PublicWebsiteRouter` on Academy hosts, `AtlasAppRoutes` otherwise.
- **Public data:** client-only React Query hooks over `PublicWebsiteService` → `/api/v1/public/websites/...`. The query keys live in `query-keys.ts:907-969`.
- **Rendering path:** `PublicWebsitePage` → `WebsiteRenderer` → `WebsiteChrome` → `WebsiteThemeScope` → `SectionRenderer`. `SectionRenderer` resolves each section through `resolveSectionRenderer(pack, type)`: `pack.renderers[type] ?? BASE_RENDERERS[type]`. Theme packs are synchronous, and there is no `lazy()` inside the renderer.

**Backend public API** (`atlas-backend/src/public-website/**`):
- **Endpoints:** unauthenticated. Tenant comes only from `?hostname=` (resolve) or the `:academyId` path parameter. The Host header is never used.
- **Tenant scoping:** every `:academyId` read:
  - resolves the organisation with a SECURITY DEFINER function;
  - runs in `runInTenantContext(org)`, with no user id;
  - filters by `academyId`.
- **RLS:** anonymous RLS exposes only `published` configurations and `visible` pages.
- **Publication checks:** only `GET :academyId` and `/pages` check publication. Identity, courses, categories and statistics answer for any non-archived, serving-eligible academy.
- **Redis caches:**
  - hostname: 60 s;
  - config and pages: 300 s, keyed `academyId:configVersion`;
  - courses, categories and statistics: not cached.
  - `configVersion` changes only on publish and unpublish.
- **Throttling:** 120 requests per minute per handler per client IP. The IP comes from `X-Real-IP`, trusted only from private or loopback peers.

## 3. Isolation — how SSR is kept away from everything else

| Area | Why it is unaffected |
|---|---|
| Dashboard, Admin, Academy/Organisation management, course editor, page editor, website builder, publishing | They are served only on platform hosts, which never reach SSR. Caddy routes only Academy hosts to SSR; the renderer re-checks the mode and passes anything else back. The atlas-app client path keeps `createRoot`, unchanged |
| Authentication, authorization, learner/instructor/manager areas, checkout, orders, commerce, certificates, live sessions, support | Their routes (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/auth/*`, `/verify-email`, `/verify/*`, `/my/*`, retired learner paths, all under `/ar` too) are on a **pass list**: SSR returns "pass" and Caddy serves today's SPA. SSR never forwards cookies or tokens, so it renders anonymously by construction |
| Payments, media uploads, R2, Redis/BullMQ, email, notifications, analytics, entitlements, background workers, provisioning | SSR talks only to the public website API over the internal network. It has no database, Redis, queue or storage access and no credentials |
| Tenant isolation, RLS, existing APIs, database behaviour | SSR is an HTTP client of the existing public API: the same requests the browser makes today, with the visitor's `X-Real-IP` forwarded. No new endpoint and no contract change |
| Domains and subdomains | Resolution is the backend's `resolve` (the same exact-match SQL). Caddy's existing host blocks are unchanged; the SSR route is added inside them |
| ThemePack architecture, Theme 1, legacy data | SSR renders the **existing** `App` → `PublicWebsiteRouter` → `WebsiteRenderer` tree with the same pack registry. No page or theme code is duplicated. A future pack renders through SSR automatically: data is gathered by running the page's own hooks (§5), not by a per-section loader |
| EN/AR, RTL, brand palette | The same components. The server writes `<html lang dir>` from the URL locale, and palettes are computed by the existing pure brand mapping |
| CSP and security headers | Caddy applies the same `security_headers`, `csp` and `hsts` snippets to the SSR response. The hydration payload is `type="application/json"` (non-executing), allowed by `script-src 'self'` like the existing JSON-LD |
| Deployment | A new `ssr` service with no published port and no `env_file`, which Caddy does **not** `depends_on`. Stopping it returns every page to today's SPA (§6) |

## 4. Hydration and server-safety findings (classified)

1 = SSR-safe, 2 = move behind an effect/client boundary, 3 = make deterministic, 4 = architecture change inside the frontend, 5 = blocks SSR (crash in Node).

| # | Location | Issue | Class | Resolution |
|---|---|---|---|---|
| 1 | `App.tsx:71` | `createBrowserRouter` at module scope | 5 | Export the route objects. The client creates the browser router exactly as today; the server uses `createStaticHandler`/`createStaticRouter`/`StaticRouterProvider` over the **same** routes |
| 2 | `public-website-context.utils.ts:103,121`, `AppRouter.tsx:30`, `PublicWebsiteRouter.tsx:139`, `PublicWebsitePage.tsx:142`, `T1PageHeader.tsx:130`, `useCourseCatalog.ts:61`, robots/sitemap routes | `window.location` read during render | 5→3 | A tiny "request location" provider: the browser supplies `window.location`, the server supplies the request's host, origin and search. Catalog state comes from the router location |
| 3 | `PlatformProvider.tsx:54` | unguarded `localStorage` in a state initializer | 5→2 | Guard it (no behaviour change) |
| 4 | `initial-language.ts:22` + `LocalizationProvider` + `usePublicWebsiteDocumentDirection` | the first-render language comes from localStorage/navigator, not the URL; plus a latent effect-order race on `<html lang/dir>` | 4 | On Academy hosts the first-render language **is the URL locale** (server and client); the dashboard keeps its preference logic. This removes today's language flash and the race |
| 5 | `CookieConsentProvider.tsx:44` | consent read from localStorage in the first render | 3/4 | A strictly-necessary first-party cookie `atlas_consent=1` records that a decision exists (no preference data), so the server knows whether to render the banner. During hydration the client adopts the server's view, then reconciles in an effect. Existing visitors are migrated on their next visit |
| 6 | `useDocumentSeo.ts` | head and SEO written only by effects; JSON-LD and hreflang appended per run | 4 | The server renders the same tags (same pure helpers, the same `data-atlas-seo` marker). The effect first removes managed hreflang and JSON-LD before appending, so nothing duplicates |
| 7 | public data hooks, `public-website-prefetch.ts`, `http-client.ts:333` | client-only queries, a module prefetch map, a relative API URL | 4 | A per-request server QueryClient. The HTTP client gets a per-request server context (absolute internal origin, forwarded `X-Real-IP`, no retries, no auth). The prefetch map is disabled on the server. The dehydrated cache is embedded and hydrated before `hydrateRoot` |
| 8 | `t1-live-sections.tsx:770` | `canCarousel` checked in render | 3 | Render the carousel markup on the server too (every supported browser has `matchMedia`). `matchMedia` moves out of render |
| 9 | `WebsiteFooter.tsx:114`, `ModernEducationFooter.tsx:132` | `new Date().getFullYear()` | 3 | The year comes from the SSR bootstrap during hydration, otherwise the clock |
| 10 | `CourseReviews.tsx:48` | `Intl.DateTimeFormat` without a time zone | 3 | Explicit `timeZone: 'UTC'` |
| 11 | `course-pricing.utils.ts:20` | `Intl.NumberFormat(undefined)` (runtime locale) | 3 | Fixed `en-US`, which is what the approved screenshots show (§10) |
| 12 | `useReveal.ts`, `ScrollRestoration` | `useLayoutEffect` server warnings | 2 | An isomorphic layout effect in `useReveal`. `ScrollRestoration` returns null (warning only; it stays client-side) |
| 13 | `WebsiteBrandBridge.tsx:68` | `document` read in render | 2 | Only in auth/learning shells, which are not SSR'd; guarded anyway |
| 14 | `QueryProvider` `setGlobalQueryClient` | module global | 4 | Not set on the server, so there is no cross-request global |
| 15 | Theme 1 `t1-enter` motion, `Reveal`, `CountUp`, header scroll state, embla, Radix dialogs/sheets/selects/accordions, `useId`, `formatT1Number`, `ThemeImage`, brand engine, FAQ filter store | deterministic or effect-only | 1 | none (the hero `<h1>` has no enter animation, so it is visible in the server HTML) |

**Pre-existing bug found (not SSR, not fixed here):** FAQ and testimonial *library* entries on public pages call authenticated tenant endpoints (`/academies/:id/website/faq-entries`, `/testimonial-entries`). Anonymous visitors get 401, an error toast, and the entries disappear. SSR reproduces today's behaviour exactly: failed queries are not dehydrated, and the client refetches as it does now. Recorded for the Owner.

## 5. Design

**Request flow:**

```
Visitor → Cloudflare → Caddy
  static file exists? → file_server (unchanged: /assets, /theme-assets, /blog/, robots, sitemap…)
  /api/*              → backend (unchanged)
  page request on an Academy host → reverse_proxy ssr:3100
      SSR: GET/HEAD only · mode must be academy-website · path not on the pass list
        1. resolve(host) and configuration → academyId, configVersion
        2. HTML cache lookup (key below) → hit: return
        3. render passes: run the page's own hooks with a per-request QueryClient;
           fetch the queries they register; repeat until none are pending (max 5)
        4. final render (renderToPipeableStream → onAllReady) + head + <html lang dir>
           + dehydrated public queries (application/json) + modulepreload
      pass (X-Atlas-SSR: pass) / 5xx / timeout / SSR down → Caddy serves today's index.html (200)
Browser: main.tsx sees the payload → hydrates the QueryClient + i18n (URL locale, core namespaces)
         → hydrateRoot(<App/>) → normal SPA from then on (links, queries, auth restore)
```

**Why data is gathered by running the page's own hooks:** the query keys, parameters and query functions are exactly the ones the client uses, so there is no second source of truth and no per-section loader to keep in step. A future ThemePack's sections work unchanged. Passes are bounded (5), and the whole render has a time budget (2.5 s), after which it passes.

**Hydration payload:**
- The dehydrated React Query state, restricted to `['public-website', …]` queries.
- These are exactly the public API responses the browser would otherwise request itself, so nothing beyond today's public exposure is added.
- Failed queries are included only for the "unpublished" case (Coming Soon), as plain `{kind, status}`.
- Plus the render year and the consent flag.
- Escaped for HTML (`<` → `<`).

**Pages SSR'd:**
- Home, Courses, Course Details, About, FAQs, Contact, custom CMS pages, Coming Soon (unpublished), the theme 404 (no page), in EN and `/ar`.
- An unknown host, "unavailable" (API error) and robots/sitemap are **not** SSR'd; they pass.

## 6. Failure and fallback (verified locally with Caddy)

A Caddy built from source was run against a stub upstream with the proposed routing:

| Case | Result |
|---|---|
| SSR up, normal page | SSR HTML, 200 |
| SSR answers `X-Atlas-SSR: pass` | today's `index.html`, 200 |
| SSR returns 5xx | today's `index.html`, 200 |
| SSR slower than the response timeout | today's `index.html`, 200 |
| SSR container down (dial error) | today's `index.html`, 200 (`handle_errors` with a 200 override) |
| Static asset | unchanged |

Inside the renderer, any thrown error, API failure, unexpected data, render timeout or pass-limit overrun produces "pass". The browser then runs the unchanged SPA.

On the client, if hydration ever mismatches, React 18 recovers by client-rendering; the tests fail on any hydration error, so this is not relied upon.

**Version skew:** SSR HTML must reference asset hashes Caddy has. SSR and Caddy ship from the same build (same image digest). During the seconds of a rollout, `/assets/*` misses fall through to the SSR container, which serves its own copy of the same build.

**Rollback:**
- `docker compose stop ssr`, which is instant and needs no redeploy;
- or redeploy the previous frontend image;
- or remove the route.

## 7. Caching

**HTML micro-cache** (in the renderer, in memory, per process):
- **Key:** `normalizedHost | academyId | configVersion | locale | path | search | consentDecided`.
  - `academyId` and `configVersion` come from this request's own resolve and configuration calls, so an entry can only ever be read back for the same academy and version.
  - The host is included as well, so two hosts of one academy never share output (canonical URLs differ).
- **TTL:** 30 s. It never exceeds the backend's own 300 s content window, and live course data is at most 30 s old.
- **Publish and unpublish** bump `configVersion`, so a new key applies at once.
- **Only cached:** complete successful renders (`ready`, theme 404, Coming Soon).
- **Never cached:** "pass" or "unavailable".
- **Anonymous by construction:** SSR never forwards cookies or tokens, so no signed-in or private response can exist to be cached.
- **Size:** LRU-capped (500 entries).

**HTTP:**
- SSR HTML is sent with `Cache-Control: private, no-cache`, so Cloudflare and other shared caches never store tenant HTML.
- Client-side React Query revalidation is unchanged. The server `dataUpdatedAt` is honoured, so data younger than `staleTime` (60 s) is not refetched on mount.

## 8. Security review (SSR-specific)

- **Host handling:**
  - The Host header decides only which hostname is **resolved**. The backend's exact-match resolution and normalisation are reused.
  - An unknown host → the backend returns 404 → pass.
  - Caddy (behind Cloudflare's trusted proxies) is the only ingress, and the renderer has no published port.
- **Cache poisoning:** the cache key uses server-derived identity (`academyId`, `configVersion`) plus the normalised host. There is no user-controlled header in the key besides host and path, which also select the content itself. Query strings are part of the key but only affect catalog filters, which are validated by the API.
- **Injection:**
  - React escapes all text.
  - The payload is JSON with `<`, `>`, `&`, `U+2028` and `U+2029` escaped, inside `type="application/json"`.
  - Head tags are built with the same escaping.
  - Owner-authored section JSON goes through the same components as today.
- **SSRF:** the renderer calls one fixed internal origin (`SSR_API_ORIGIN`). Paths are built from the resolved `academyId` and the API's own route shapes, never from a URL taken from the request.
- **Authentication leakage:** no cookies, no `Authorization` header, no token service on the server. The identity provider stays "restoring" and the client restores the session after hydration, as today.
- **Rate limits:**
  - The visitor's `X-Real-IP` (set by Caddy from Cloudflare's trusted `client_ip`) is forwarded, so throttling stays per visitor.
  - Cache hits make no API calls.
- **Data minimisation:** the payload contains only public API responses the client already downloads today. The audit flags three fields that should arguably not be public at all: `instructors[].id`, `introVideoAssetId` and review `studentId`. That is an API decision for the Owner (§10), not SSR's.

## 9. Tests required (implementation plan §13 of the Owner's brief)

- A renderer test suite (SSR each page type, EN/AR/RTL, two academies × two palettes).
- **Adversarial isolation:**
  - A's host never receives B's HTML, configuration, pages, branding or courses;
  - a cache entry is never served across academies or versions;
  - publish invalidates.
- Unpublished, missing configuration, renderer failure, API failure, pass list.
- Hydration without errors or refetch.
- SPA fallback.
- **The full visual baseline and axe suites run with SSR on.** The fixture server gains an SSR mode that renders in-process, so every existing screenshot must stay pixel-identical.
- Lighthouse before and after, same methodology, adding TTFB.

## 10. Owner-visible decisions (non-blocking)

1. **Consent cookie.** A strictly-necessary `atlas_consent=1` cookie records that a consent decision exists. It holds no preference data; the decision itself stays in localStorage. It is needed so the server knows whether to render the banner without a flash.
2. **Currency formatting.** Prices are formatted with a fixed `en-US` locale instead of the browser's default. That is what every approved screenshot shows; a visitor with a non-English browser locale previously saw locale-specific formatting.
3. **Pre-existing, not changed by SSR:**
   - Public FAQ and testimonial library entries call authenticated endpoints (§4).
   - The public API exposes three internal identifiers (§8).
   - Content edits reach the public site within 300 s without a republish.

## 11. Implementation order

1. Frontend determinism fixes (§4), each covered by the existing unit and visual suites with SSR off: the SPA must stay pixel-identical.
2. The server entry and renderer, and the client hydration path.
3. The fixture server's SSR mode, then the full baseline, axe, isolation tests and Lighthouse.
4. Caddy route, compose service and deploy script changes (no production deploy).
