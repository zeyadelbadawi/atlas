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

---

## 12. Implementation and verification (recorded 30 Sep 2026)

Commits: FE `144aa3f` (renderer and hydration), `41ddb34` (tests, fixture SSR mode), `6617da1` (edge, image, workflow); BE `73d620a` (compose service, deploy script). Branch `claude/practical-wozniak-pjcdhe`. Nothing was deployed.

### 12.1 What was built

- **Renderer** (`src/ssr/entry-server.tsx`, `server/ssr/`): as designed in §5. Bounded passes: 6, not the 5 planned (Course Details needs five waves; 6 leaves one spare). Budget: 2.5 s per request, 2 s per API call.
- **Page cache key:** the full request **origin** (protocol + Host as sent, port included) | academyId | configVersion or `unpublished` | locale | path | query | consent decision. §7 said "normalised host"; that was changed after an adversarial test showed why (12.3 #4).
- **Edge** (`Caddyfile`): the route only applies while the Caddy container's `ATLAS_SSR` is `on` (default `off`). Off, every request takes exactly its previous route. This is the rollback switch.
- **Two changes made from measurements (§12.6):**
  - The router-chunk `modulepreload`s planned in §5 are **off**; `main.tsx` still starts that chunk at boot.
  - Hydration runs inside `startTransition`, so it is time-sliced.
  - An Arabic-font preload exists as an option and is off.
- **Deployment:** image `atlas-frontend-ssr` (Dockerfile `--target ssr`: Node 20, production dependencies, non-root, read-only filesystem, health check). Compose service `ssr` sits behind the `ssr` profile, which `deploy.sh` enables only when `ATLAS_SSR=on`. It has no published port and no `env_file`, holds no secret, and Caddy does not depend on it. Renderer health is checked on deploy but never fails one, since Caddy serves the SPA while the renderer is unhealthy. `SSR_IMAGE` is recorded in `.last-good` for `--rollback`.

### 12.2 Tests added

- **`pnpm test:ssr`** (`server/ssr/ssr.test.mjs`, 56 tests) runs the production bundles against a mock public API. The mock answers with the theme baseline's own generated website and live data. It serves two published Academies with different palettes, hero text, identity and courses, and one unpublished Academy.
  - **Pages:** every public page in EN and AR/RTL, Course Details, 404, Coming Soon.
  - **Isolation:** sequential, 12 interleaved concurrent renders, and through the cache.
  - **Cache:** keys for locale, query, consent and Host port/protocol; publish and unpublish take effect at once; expiry.
  - **Pass list:** every entry, plus methods other than GET/HEAD.
  - **Failures:** API 5xx, malformed data, budget exceeded, backend unreachable.
  - **Credentials:** none forwarded, and a session cookie renders byte-identical to anonymous.
  - **Escaping:** script, markup and U+2028 in owner text.
  - **Payload:** public-only.
  - **Preloads:** no router-chunk preloads by default; Arabic font preloads only on Arabic pages and only when enabled.
  - **Resources:** no timers remain after a request.
- **`src/edge-security-headers.test.ts`:** 7 new assertions against the shipped Caddyfile:
  - the `ATLAS_SSR` gate in both site blocks;
  - apex and www are never rendered;
  - only GET/HEAD for missing files;
  - `client_ip` is forwarded;
  - pass and 5xx fall back to the SPA;
  - the fallback carries the document headers, CSP and the site's own HSTS;
  - the API is never routed to the renderer.
- **Fixture server SSR mode** (`THEME_BASELINE_SSR=1`): the whole visual, axe, identity, CSP and retirement suite runs unchanged against server-rendered pages.

### 12.3 Defects found during verification, and fixed

1. **Hydration discarded the server HTML (React error #421).**
   - **Symptom:** 76 occurrences in 570 stress runs.
   - **Cause** (React 18.3.1 source, `mountDehydratedSuspenseComponent`): `hydrateRoot` always leaves a `<Suspense>` boundary's content for a later, offscreen-priority pass. The providers above it (identity, consent, localization) update state as soon as the shell commits, and a not-yet-hydrated boundary receiving an update is thrown away and client-rendered.
   - **Fix:** the public route tree is preloaded before rendering on both sides and rendered without a Suspense boundary. The lazy auth and learner routes keep their own boundary each.
   - **Result:** 0 in 570 runs. No `suppressHydrationWarning` anywhere.
2. **Coming Soon was server-rendered as an empty loading state.**
   - **Cause:** TanStack Query's `retryOnMount` reports an errored query without data as `pending` to a mounting component. The browser then refetched both 404s.
   - **Fix:** public queries do not retry on mount *while hydrating*, and the default is restored in `QueryProvider`'s mount effect, which runs after every hydrated observer has subscribed. The server renders with the same setting. SPA behaviour is unchanged.
3. **Per-request memory retention.**
   - **Cause:** the app's explicit `gcTime` (5 min) overrides TanStack's server default (`Infinity`). Every server request left a GC timer per query, holding its whole cache for 5 minutes (hundreds of timers after 52 requests).
   - **Fix:** the server client uses `gcTime: Infinity` and is cleared when the request ends. A test asserts that no timer remains.
4. **Cache poisoning through the Host port.**
   - **Cause:** the lookup strips the port but the canonical and social URLs use the Host as sent. `Host: alpha…:6666` could plant a canonical pointing at `:6666` into the entry every other visitor received.
   - **Fix:** the key uses the full origin. A test first failed against the old bundle, then passed.
5. **Router modulepreload silently missing.**
   - **Cause:** Rollup keys a facade-less chunk as `_Name-hash.js`, not by source path.
   - **Fix:** the lookup also goes through `index.html`'s dynamic imports. A test asserts the preload is present.

### 12.4 Container and edge, verified locally

- **The real Caddyfile:** only TLS, hostnames, ports and upstream addresses were substituted. It was run with Caddy built from source against a stub renderer, with `ATLAS_SSR` on, off and unset.
  - **On:** Academy pages render.
  - Apex, www and sign-in get the SPA.
  - Renderer pass, 5xx, timeout and down all give the SPA with 200 and CSP, XFO and the right HSTS (platform vs custom domain).
  - A spoofed `X-Real-IP` is overwritten with the real client address.
  - API errors pass through unchanged.
  - A missing hashed chunk is never answered with HTML.
  - **Off or unset:** byte-for-byte the previous routing.
- **The `ssr` image:** built from the real Dockerfile. The only change was injecting this sandbox's proxy CA into the Node stages, because the sandbox intercepts HTTPS; the stock `build` stage fails here the same way.
  - The container runs as `node` with a read-only root filesystem and renders EN and AR.
  - It forwards the visitor IP, never a cookie or `Authorization`.
  - Traversal attempts on `/assets` get the SPA shell or 404, never a file outside the build.

### 12.5 Regression and visual baseline

| Suite | Result |
|---|---|
| Theme baseline, SPA (as served today), final code | **1,047/1,047** (run twice): the hydration seams changed nothing for the SPA |
| Theme baseline, server-rendered (`THEME_BASELINE_SSR=1`) | **1,021/1,047**. All axe, CSP, off-origin, page-error, identity, palette-injection and retirement cases pass. The 26 failures are screenshots, identical (same tests, same pixel counts) in four full runs, including on the final code; see below |
| `pnpm test:ssr` (production bundles) | 56/56 |
| Frontend unit | 159 files / **1,580** tests (1,573 + 7 edge-routing). The vitest-worker `onTaskUpdate` RPC-timeout message also occurs on an untouched HEAD worktree (pre-existing) |
| Typecheck / lint | 31 errors, identical to before / clean (one pre-existing warning) |

**The 26 screenshot differences.** They were investigated per the rule (stop → investigate), and **no snapshot was updated**. Every diff's bounding box was computed from the diff image:
- All 26 are Theme 1 v2 rich **Home**: the page itself in EN/AR, and the brand matrix, which uses that page, at 1440 and 1024.
- 25 of them are exactly the "Learning designed around real progress" photo:
  - 1440: x 176–659, y 2666–3028;
  - 1024: x 32–450;
  - AR 1024: mirrored for RTL.
- The 26th (AR 1440) is that photo plus the features strip.

Two mechanisms, measured in the browser (`useReveal` and resource timing, 3 runs per mode). Neither is a rendering difference, and in both, SSR follows the components' own contracts:

1. **Native lazy loading.**
   - **SPA:** the photo's `<img loading="lazy">` is inserted while the page's data sections are still arriving and the layout is short. It is briefly inside Chrome's lazy-load distance, so it is requested at ≈ 0.9 s and the baseline shows it loaded.
   - **SSR:** the complete layout exists from the first parse. The photo sits 1,766 px below the viewport, beyond that distance, so it is correctly not requested until the visitor scrolls, and the full-page shot shows its LQIP.
   - (The CTA photo further down shows its LQIP in both modes.)
2. **Scroll reveal at the fold (AR 1440 only).**
   - `useReveal` decides once, at mount: already in the viewport → revealed; otherwise → hidden until 15 % is visible.
   - **SPA:** it measures the strip at top 982, before the data sections have laid out, so it hides it. The strip then settles at top 896, **4 px inside** the 900 px viewport, and stays hidden, because 4 px is less than 15 %.
   - **SSR:** hydration measures the final layout (896), so the strip stays visible, which is what the hook documents ("nothing above the fold ever blinks out").

Making SSR reproduce these would mean loading off-screen images eagerly or hiding content that is in view. That is worse for visitors and would only serve the snapshots. **Owner decision (§13):** keep the SPA baseline as the reference and accept these 26 as the server-rendered expectation, or ask for another option.

### 12.6 Performance: before (SPA) and after (SSR)

**Method.** It is `run-lighthouse.mjs`'s methodology, unchanged:
- Lighthouse 13.5 defaults (mobile) plus Lighthouse's own desktop preset;
- simulated throttling, median of 3 runs by performance score;
- the minified fixture build served like production (same origin, gzip, enforced CSP, HTTP/2 + TLS).

Both modes use **the same build and the same server**: "before" is served as the SPA (as production serves it today), "after" is server-rendered by the shipped renderer.
- **Cold:** storage and cache reset, renderer page cache off.
- **Warm:** browser cache primed and kept, renderer page cache 30 s (its production lifetime).

Script: `e2e/theme-baseline/lighthouse/run-ssr-comparison.mjs`. Raw results: `e2e/theme-baseline/baselines/lighthouse-ssr-comparison.json`. Same machine, run back to back; numbers vary between machines, so re-measure on the machine you compare on.

**Two design changes came from these measurements, each A/B-tested on the same pages before being kept:**

1. **Router-chunk modulepreloads removed.**
   - As first built, the head preloaded the public router chunk and its imports (≈ 290 KB gzip beyond the SPA's own). They competed with the render-blocking stylesheet, so the server HTML painted *later* than the SPA: mobile FCP +200 to +490 ms, and LCP only −200 to −330 ms.
   - Without them, mobile LCP fell to 2.28 s (EN) / 2.57 s (AR) on Home and Courses.
2. **Hydration inside `startTransition`.**
   - React 18 hydrates a root at a blocking lane, so the page hydrated in one long task (mobile TBT 117–360 ms; Course Details above the 200 ms budget).
   - As a transition it is time-sliced: TBT 0–38 ms.

(An Arabic-font preload was also measured: About AR CLS 0.066 → 0.021, but Arabic LCP about 450 ms later. Kept off; §13.)

**Results (final code).**
- **Mobile LCP:**
  - EN 3.04–3.06 s → **2.25–2.28 s** on Home, Courses, About, FAQs and Contact (≤ 2.5 s **met**);
  - Course Details EN 3.05 → **2.57 s**;
  - AR 3.17–3.32 s → **2.57–2.59 s** (just above 2.5 s);
  - Course Details AR 3.31 → **2.87 s**.
- **Mobile performance** 79–90 → **90–96**, and **TBT** 51–220 → **0–38 ms**.
- **CLS:** Contact goes 0.172/0.155 → 0.028/0.009, so the SPA's failure of the 0.05 budget is fixed. Rises, all from the web-font swap: About AR 0.007 → **0.066** (above 0.05), Home AR 0.036, Course Details desktop 0.038, FAQs EN 0.024.
- **Desktop:** performance 100 → 100; LCP equal or better on every page except Contact EN warm (+7 ms, noise).
- **Cost:**
  - TTFB 1 → 21–55 ms cold (the render; 210 ms on a never-warmed first request in an earlier run), 12–23 ms warm (cache hit);
  - HTML 1 → 9–15 KB gzip;
  - total bytes +4–7 KB;
  - 5–10 fewer requests (no client data waterfall before paint).

**Mobile, cold** (SPA → SSR)

| Page | Perf | TTFB ms | FCP ms | LCP ms | CLS | TBT ms |
|---|---|---|---|---|---|---|
| home EN | 88 → 96 | 1 → 43 | 2511 → 2272 | 3054 → 2272 | 0.009 → 0.013 | 163 → 4 |
| home AR | 87 → 93 | 1 → 40 | 2707 → 2590 | 3170 → 2590 | 0.003 → 0.036 | 142 → 16 |
| courses EN | 89 → 96 | 1 → 32 | 2504 → 2272 | 3046 → 2272 | 0.016 → 0.01 | 146 → 24 |
| courses AR | 85 → 93 | 1 → 34 | 2726 → 2584 | 3189 → 2584 | 0.007 → 0.001 | 220 → 2 |
| course-details EN | 89 → 93 | 1 → 46 | 2533 → 2565 | 3049 → 2565 | 0.009 → 0.012 | 141 → 38 |
| course-details AR | 87 → 90 | 1 → 36 | 2710 → 2872 | 3314 → 2872 | 0 → 0.001 | 133 → 9 |
| about EN | 90 → 96 | 2 → 27 | 2549 → 2251 | 3058 → 2251 | 0.014 → 0.014 | 108 → 1 |
| about AR | 87 → 92 | 1 → 24 | 2701 → 2577 | 3318 → 2577 | 0.007 → 0.066 | 100 → 0 |
| faqs EN | 90 → 96 | 1 → 30 | 2538 → 2262 | 3043 → 2262 | 0.009 → 0.024 | 106 → 0 |
| faqs AR | 87 → 93 | 1 → 32 | 2694 → 2571 | 3286 → 2571 | 0 → 0 | 149 → 1 |
| contact EN | 83 → 96 | 1 → 28 | 2546 → 2276 | 3058 → 2276 | 0.172 → 0.028 | 51 → 0 |
| contact AR | 79 → 93 | 1 → 21 | 2707 → 2581 | 3307 → 2581 | 0.155 → 0.009 | 184 → 0 |

**Mobile, warm** (SPA → SSR)

| Page | Perf | TTFB ms | FCP ms | LCP ms | CLS | TBT ms |
|---|---|---|---|---|---|---|
| home EN | 89 → 96 | 1 → 19 | 2551 → 2280 | 3075 → 2280 | 0.009 → 0.013 | 133 → 5 |
| home AR | 86 → 93 | 1 → 21 | 2692 → 2587 | 3210 → 2587 | 0.003 → 0.036 | 183 → 11 |
| courses EN | 90 → 96 | 1 → 19 | 2489 → 2279 | 2949 → 2279 | 0.016 → 0.01 | 146 → 15 |
| courses AR | 87 → 93 | 1 → 18 | 2701 → 2557 | 3222 → 2557 | 0.007 → 0.001 | 145 → 13 |
| course-details EN | 90 → 93 | 1 → 17 | 2541 → 2564 | 3050 → 2564 | 0.009 → 0.012 | 93 → 16 |
| course-details AR | 86 → 90 | 1 → 19 | 2707 → 2874 | 3231 → 2874 | 0 → 0.001 | 162 → 19 |
| about EN | 90 → 96 | 1 → 16 | 2557 → 2281 | 3076 → 2281 | 0.014 → 0.014 | 104 → 6 |
| about AR | 88 → 92 | 1 → 16 | 2700 → 2572 | 3241 → 2572 | 0.007 → 0.066 | 103 → 0 |
| faqs EN | 90 → 96 | 1 → 12 | 2575 → 2273 | 3114 → 2273 | 0.009 → 0.024 | 83 → 0 |
| faqs AR | 87 → 93 | 1 → 19 | 2698 → 2573 | 3217 → 2573 | 0 → 0 | 132 → 0 |
| contact EN | 81 → 96 | 1 → 18 | 2545 → 2273 | 3063 → 2273 | 0.172 → 0.028 | 169 → 1 |
| contact AR | 81 → 93 | 1 → 17 | 2705 → 2571 | 3223 → 2571 | 0.155 → 0.009 | 112 → 0 |

**Desktop, cold** (SPA → SSR)

| Page | Perf | TTFB ms | FCP ms | LCP ms | CLS | TBT ms |
|---|---|---|---|---|---|---|
| home EN | 100 → 100 | 1 → 34 | 528 → 527 | 628 → 527 | 0.001 → 0.025 | 0 → 0 |
| home AR | 100 → 100 | 1 → 36 | 562 → 551 | 627 → 571 | 0.003 → 0.002 | 0 → 0 |
| courses EN | 100 → 100 | 1 → 45 | 527 → 500 | 612 → 520 | 0.005 → 0.001 | 0 → 0 |
| courses AR | 100 → 100 | 1 → 30 | 563 → 545 | 646 → 545 | 0.005 → 0.001 | 0 → 0 |
| course-details EN | 100 → 100 | 1 → 55 | 537 → 595 | 687 → 595 | 0 → 0.038 | 0 → 0 |
| course-details AR | 100 → 100 | 1 → 43 | 552 → 586 | 702 → 606 | 0 → 0.038 | 0 → 0 |
| about EN | 100 → 100 | 1 → 23 | 518 → 537 | 614 → 577 | 0 → 0 | 0 → 0 |
| about AR | 100 → 100 | 1 → 22 | 564 → 548 | 648 → 568 | 0 → 0.002 | 0 → 0 |
| faqs EN | 100 → 100 | 1 → 23 | 532 → 552 | 626 → 612 | 0 → 0.002 | 0 → 0 |
| faqs AR | 100 → 100 | 1 → 23 | 562 → 546 | 649 → 566 | 0 → 0.001 | 0 → 0 |
| contact EN | 100 → 100 | 2 → 23 | 541 → 505 | 659 → 525 | 0 → 0.001 | 0 → 0 |
| contact AR | 100 → 100 | 1 → 26 | 552 → 556 | 634 → 556 | 0 → 0.002 | 0 → 0 |

**Desktop, warm** (SPA → SSR)

| Page | Perf | TTFB ms | FCP ms | LCP ms | CLS | TBT ms |
|---|---|---|---|---|---|---|
| home EN | 100 → 100 | 0 → 22 | 534 → 511 | 633 → 531 | 0.001 → 0.025 | 0 → 0 |
| home AR | 100 → 100 | 1 → 22 | 555 → 551 | 622 → 551 | 0.003 → 0.002 | 0 → 0 |
| courses EN | 100 → 100 | 1 → 25 | 518 → 529 | 601 → 549 | 0.005 → 0.001 | 1 → 0 |
| courses AR | 100 → 100 | 1 → 20 | 564 → 587 | 627 → 627 | 0.005 → 0.001 | 0 → 0 |
| course-details EN | 100 → 100 | 1 → 17 | 530 → 597 | 657 → 597 | 0 → 0.038 | 0 → 0 |
| course-details AR | 100 → 100 | 1 → 23 | 556 → 603 | 701 → 623 | 0 → 0.038 | 0 → 0 |
| about EN | 100 → 100 | 1 → 14 | 512 → 527 | 610 → 547 | 0 → 0 | 0 → 0 |
| about AR | 100 → 100 | 1 → 19 | 564 → 579 | 626 → 579 | 0 → 0.002 | 0 → 0 |
| faqs EN | 100 → 100 | 1 → 15 | 533 → 511 | 629 → 531 | 0 → 0.002 | 0 → 0 |
| faqs AR | 100 → 100 | 1 → 16 | 566 → 537 | 630 → 537 | 0 → 0.001 | 0 → 0 |
| contact EN | 100 → 100 | 1 → 18 | 521 → 571 | 624 → 631 | 0 → 0.001 | 0 → 0 |
| contact AR | 100 → 100 | 1 → 17 | 560 → 526 | 625 → 526 | 0 → 0.002 | 0 → 0 |

**Bytes and requests** (mobile, cold; KB transferred, SPA → SSR)

| Page | HTML | JS | Total | Requests | Critical chain |
|---|---|---|---|---|---|
| home EN | 1 → 12 | 390 → 390 | 495 → 499 | 53 → 45 | see below |
| home AR | 1 → 12 | 412 → 412 | 570 → 576 | 55 → 47 | see below |
| courses EN | 1 → 12 | 390 → 390 | 494 → 500 | 51 → 45 | see below |
| courses AR | 1 → 12 | 412 → 412 | 569 → 576 | 53 → 47 | see below |
| course-details EN | 1 → 15 | 390 → 390 | 495 → 502 | 55 → 45 | see below |
| course-details AR | 1 → 15 | 412 → 412 | 571 → 578 | 57 → 47 | see below |
| about EN | 1 → 9 | 390 → 390 | 492 → 496 | 50 → 45 | see below |
| about AR | 1 → 9 | 412 → 412 | 568 → 572 | 52 → 47 | see below |
| faqs EN | 1 → 9 | 390 → 390 | 492 → 496 | 50 → 45 | see below |
| faqs AR | 1 → 9 | 412 → 412 | 568 → 572 | 52 → 47 | see below |
| contact EN | 1 → 9 | 390 → 390 | 492 → 497 | 50 → 45 | see below |
| contact AR | 1 → 9 | 412 → 412 | 568 → 572 | 52 → 47 | see below |




**Critical request chain** (mobile, cold; single run; Lighthouse 13 network dependency tree, observed end time)

| Page | SPA | SSR |
|---|---|---|
| home EN | 3 requests, 530 ms, 132 KB | 3 requests, 655 ms, 143 KB |
| home AR | 3 requests, 501 ms, 145 KB | 3 requests, 479 ms, 157 KB |
| courses EN | 3 requests, 479 ms, 131 KB | 3 requests, 416 ms, 143 KB |
| courses AR | 3 requests, 426 ms, 145 KB | 3 requests, 487 ms, 157 KB |
| course-details EN | 3 requests, 436 ms, 131 KB | 3 requests, 506 ms, 145 KB |
| course-details AR | 3 requests, 531 ms, 145 KB | 3 requests, 476 ms, 160 KB |
| about EN | 3 requests, 404 ms, 131 KB | 3 requests, 391 ms, 139 KB |
| about AR | 3 requests, 415 ms, 145 KB | 3 requests, 393 ms, 154 KB |
| faqs EN | 3 requests, 416 ms, 131 KB | 3 requests, 364 ms, 140 KB |
| faqs AR | 3 requests, 390 ms, 145 KB | 3 requests, 341 ms, 154 KB |
| contact EN | 3 requests, 377 ms, 131 KB | 3 requests, 449 ms, 140 KB |
| contact AR | 3 requests, 414 ms, 145 KB | 3 requests, 421 ms, 154 KB |


### 12.7 Security review: what was verified

| Concern | Control | Evidence |
|---|---|---|
| **Host handling** | The Host decides only which hostname is resolved. An unknown host costs one public `resolve` (rate-limited per visitor IP) and then passes. A Host carrying a path, `@` or a suffix resolves nothing. | `ssr.test.mjs` (Host tricks); container probe with `evil.example` |
| **Cache poisoning** | The key is origin \| academyId \| configVersion \| locale \| path \| query \| consent. A Host port or protocol can't shape another visitor's page. Failed renders and passes are never cached. | `ssr.test.mjs` (poison test failed before the fix); "caches nothing" test |
| **XSS** | React escapes markup. The hydration data is JSON in `type="application/json"` with `< > & U+2028 U+2029` escaped. Head tags are escaped. The only scripts are the module entry, the JSON data and JSON-LD. | `ssr.test.mjs` (owner-authored `</script>`, `<img onerror>`, U+2028) |
| **CSP** | Unchanged and enforced; no inline executable script. Every fallback carries CSP. | SSR baseline: 0 CSP violations in every case that reached the check (in the 26 screenshot failures the check runs after the screenshot assertion, but those pages' own axe cases run it and pass); `edge-security-headers.test.ts`; local Caddy run |
| **Payload minimisation** | Only `['public-website', …]` queries, success or a plain "not found". Errors are reduced to `{kind, status}`. | `ssr.test.mjs` (public-only data) |
| **SSRF** | One fixed internal origin (`SSR_API_ORIGIN`, validated at start). Paths come from the app's own API client and the resolved academyId, never from the request. | `server.mjs`; "calls only the public website API" test |
| **Auth leakage** | No cookie, `Authorization`, token service or refresh on the server; only `X-Real-IP` is forwarded. A request with session cookies renders byte-identical to an anonymous one. `Cache-Control: private, no-cache`, so Cloudflare never stores tenant HTML. | `ssr.test.mjs`; container probe (backend saw no cookie or auth) |
| **Renderer surface** | No published port, no secrets (no `env_file`), runs as `node`, read-only root filesystem. `/assets` serves only files inside the build (traversal → SPA shell or 404). | compose; container probe |
| **Availability** | Renderer slow, failing or stopped → Caddy serves the SPA, with the API untouched. One switch (`ATLAS_SSR`) turns it off. | local Caddy run in all three switch states |
| **Resource exhaustion** | Bounded passes (6) and budget (2.5 s); per-request query cache cleared, no timers left; page cache LRU-capped (500). | timer test |

Residual, pre-existing (§10): the public API exposes `instructors[].id`, `introVideoAssetId` and review `studentId`. SSR places exactly the public responses into the page, so these remain as public as they already are. Removing them is an API change for the Owner.

## 13. Owner decisions (from this implementation)

1. **Enable it in production, and when.** It ships off. To enable:
   - set `ATLAS_SSR=on` in `/opt/atlas/.env` **after** the frontend workflow has published `atlas-frontend-ssr`;
   - run `deploy.sh --frontend-only`.
2. **The 26 server-rendered screenshot differences (§12.5).** Recommended: keep the SPA baseline as the reference and record these 26 as the server-rendered expectation, because SSR follows the components' own lazy-load and reveal contracts. They have not been re-recorded.
3. **About (AR, mobile) CLS 0.066**, above the plan's 0.05, caused by the Arabic font swap. Options:
   - (a) accept it;
   - (b) `preloadArabicFonts`: CLS 0.021 but Arabic LCP about 450 ms later;
   - (c) metric-matched fallback fonts (a CSS change; needs a visual review).
4. **Carried from §10:**
   - the `atlas_consent` cookie;
   - `en-US` currency formatting;
   - the three public API identifiers;
   - the FAQ/testimonial library endpoints that need authentication.

## 14. Rollout and rollback runbook (nothing here has been run in production)

> **Status, 1 Oct 2026.** Step 1 below is done: the renderer code merged to `main` (`0f4a21f`, Gate E) and its image was built and pushed by CI for the first time (deploy run #128, `atlas-frontend-ssr:0f4a21f…`, `linux/arm64`). **SSR is still off**: `ATLAS_SSR` is unset in production and no `ssr` container runs (E-POST). The Owner accepted the single-page app's ≈3.0 s lab LCP as a documented limitation, so enabling SSR (Gate H) is a separate, optional decision — not a condition of Theme 1's closure. See `THEME_1_ACADEMY_WEBSITE_PLAN.md` §Z.

1. Merge to `main` with `ATLAS_SSR` unset. The frontend workflow builds and pushes both images; Caddy loads the new Caddyfile and every request keeps its previous route.
2. Confirm `ghcr.io/zeyadelbadawi/atlas-frontend-ssr:<sha>` exists.
3. Set `ATLAS_SSR=on` in `/opt/atlas/.env`, then run `deploy.sh --frontend-only`. That pulls and starts `ssr`, then Caddy (recreated with the new environment), then checks health. An unhealthy renderer is reported but is not fatal.
4. **Verify:**
   - `curl -sI https://<academy-host>/` shows `x-atlas-ssr: render`, and a repeat shows `hit`;
   - `/sign-in` shows no `x-atlas-ssr` header (the SPA);
   - `docker compose logs ssr` shows the JSON render/pass events.
5. **Roll back**, choosing one:
   - set `ATLAS_SSR=off` and run `deploy.sh --frontend-only` (Caddy returns to the previous routing and the renderer is stopped);
   - `docker compose stop ssr` (Caddy serves the SPA on the next request, no deploy);
   - `deploy.sh --rollback` (previous images, including `SSR_IMAGE`).

## 15. Production-readiness remediation, H1–H4 (1 Oct 2026; nothing run in production)

The read-only production verification (Step 1) found four gates to close before any merge, migration or `ATLAS_SSR=on`. Commits: frontend `d7a128d`, backend `1b0d3e5`.

| Gate | Finding in production | Change | Evidence |
|---|---|---|---|
| H1 rollback | `.last-good` had empty `BACKEND_IMAGE`/`CADDY_IMAGE`: `record_last_good` read `RepoDigests` from the container object, which has none | Digest resolved from each running container's image (`<repo>@sha256:…`); the previous record is kept if any digest cannot be resolved; `--rollback` validates the whole record, pulls first, re-tags and verifies the running digests | `deploy/test/deploy-script.test.sh` §1, §3–§5 (backend) |
| H2 postgres/redis | Both tags newer than the running containers; a full deploy would recreate both before the migration gate and the backup | Only application services are pulled; postgres/redis start with `--no-recreate`; application services roll with `--no-deps`; drift is logged, never acted on | harness §2, including a control that the old flow recreates |
| H3 inline images | 12 inline logos (largest 3.4 MB) and a 1.9 MB inline section image | 1 MiB HTML budget; an API response over it stops the render before rendering (`api response over budget`); a page over it after rendering passes (`html over budget`); the cache is bounded by memory (64 MiB) and never holds an over-budget page; `ssr` gets `mem_limit: 384m` and `--max-old-space-size=256` | `server/ssr/ssr.test.mjs` "size budget"; `tools/ssr-memory/measure.mjs` |
| H4 zombies | 12,196 zombies, all children of Caddy | `init: true` on `caddy` and `ssr` | harness §6: 10 https probes leave 10 zombies without init, 0 with it; SIGTERM still exits 0 |

**How the budget was derived (measured, not chosen).**
- **Largest real page:** 106,039 B (Course Details AR, rich fixture).
- **Inline images multiply:** an inline logo appears **four** times in a page (JSON-LD `Organization.logo`, header, footer and hydration data), and a section image twice. Both counts are asserted by the tests.
- **The resulting gap:**
  - production's active Academies (inline logos under 100 KB) stay under about 506 KB;
  - its logos of 1 MB or more and its 1.9 MB section image produce pages of at least 3.8 MB.
- **The budget:** 1 MiB is about 2× the former and under a third of the latter. Oversized pages are served by the SPA, exactly as today.

**Memory measurements.** `tools/ssr-memory/measure.mjs` runs the production `server.mjs` in `node:20-alpine` under `--init`, against a mock API. It covers 720 distinct pages, the same pages with about 99 KB inline logos, and 16 oversized Academies.

| Run | Peak memory |
|---|---|
| No limit | grows to about 580 MiB (V8 collects lazily when nothing pressures it) |
| 384 MiB limit, concurrency 16 | 185 MiB |
| 384 MiB limit, concurrency 64 | 213 MiB |

There was no OOM and no restart under the limit. Two earlier variants failed under a 256 MiB limit, which is what led to the current design:
- rendering oversized pages before checking them;
- counting the cache in UTF-8 rather than heap bytes.

**H4 does not change behaviour.**
- The Caddyfile and routing are untouched.
- Under init, the real renderer still answers its healthcheck and still passes non-Academy hosts, and SIGTERM exits 0 in 89 ms (95 ms without init).
- Caddy stays healthy and stops on SIGTERM with exit 0.
