# Atlas — Post-Phase-11 Production Fix Pass

**Status:** shipped and verified in production.
**Frontend:** `a0728fc` (three commits: `ea8e8a9`, `2df0746`, `a0728fc`)
**Backend:** `44fd9e5`
**Verified against:** `https://atlass.dpdns.org` and `https://elzozo.atlass.dpdns.org`

Two defects in this report were found by real-browser verification and not
by any test suite — one of them in code written earlier in this same pass.
Both are written up in full, including the one whose regression test does
not actually reproduce it.

**One thing to know before reading:** the `elzozo` website was published
when this pass began and was in `draft` when I re-checked it near the end.
I restored it to published and confirmed it is live. I could not establish
what changed it and I did not knowingly unpublish it. Details in §11.

---

## 1. Issue 1 — the public Academy site did not fill the viewport

### Root cause

The shell asked for `min-h-full`, which is `min-height: 100%`. A percentage
minimum height resolves against the *containing block's* height, and that
only works if an ancestor has a definite height. Neither `#root`, `body`
nor `html` has one, so the declaration collapsed to `auto` and the site was
exactly as tall as its content.

### Measured, before the fix, on the live site

| | |
|---|---|
| Viewport height | 722px |
| `#root` height | **320px** |
| `body` background showing through | `rgb(14, 23, 27)` — the Atlas dashboard's dark body |

That is a dark strip covering the bottom 56% of a customer's own domain.

### Fix

`min-h-[100dvh]` on every wrapper between the root and `<main>`, `<main>`
itself `flex-1` inside a flex column.

- `100dvh` is measured against the viewport, needs no ancestor height, and
  follows mobile browser chrome as it appears and disappears.
- It is a **minimum**, never a fixed height, so a long page still grows.
- No hardcoded pixel heights were introduced; a test asserts that.

`src/features/website/renderer/WebsiteChrome.tsx`

### Verified in production

| | Minimal content | 90 injected paragraphs |
|---|---|---|
| Viewport | 769px | 769px |
| Document scroll height | 769px | 5,556px |
| Page scrolls | no | yes |
| Footer bottom at end of scroll | 769px | 769px |

Content-light fills exactly one viewport with nothing showing beneath;
content-heavy grows and scrolls normally rather than being clipped.

---

## 2. Issue 2 — unpublished Academy now shows a real "Coming Soon"

### Root cause, and why the state was unreachable

`GET /public/websites/:academyId` deliberately 404s for a site that is not
published — the publication condition is part of the database query, so an
unpublished configuration is **indistinguishable from a missing one**.
That is the correct security posture and **it is unchanged**; no backend
change was made for this issue.

The `unpublished` state already existed in `PublicWebsiteDataState`. It was
simply unreachable: the hook treated *every* query error as `unavailable`,
so an Academy that had merely not launched yet told its visitors that Atlas
was broken.

The distinction needed was already available client-side and needed no new
endpoint and no new field: **the hostname resolved successfully**, so the
Academy exists and is reachable. A `notFound` on its configuration
therefore means "no published website"; anything else is genuine trouble.

```ts
function isNotFound(error: unknown): boolean {
  const apiError = error as ApiError | null | undefined;
  if (!apiError) return false;
  return apiError.kind === 'notFound' || apiError.status === 404;
}
```

`kind` is checked as well as `status` because a transport failure has no
HTTP status at all, and "no status" must never be read as a 404.

### Why it is not a CMS page

It is a platform-level state, not content. As an ordinary editable page row
an Academy could delete the very page that covers the window in which it
has nothing else to show, and every new Academy would need one seeded.
Rendered from the public runtime, every Academy has it automatically —
including one created a minute ago — and there is nothing a customer can
accidentally remove.

### What it shows, and what it refuses to invent

Only the identity the hostname resolution already returned: name, and logo
when one exists. No launch date, no contact details, no marketing copy —
none of that is available without reading unpublished configuration, and
guessing it would be fabricating business information.

Bilingual, RTL-capable, full-viewport, with its own palette independent of
the dashboard's tokens.

`src/features/public-website/components/AcademyComingSoon.tsx`
`src/features/public-website/hooks/usePublicWebsiteData.ts`

---

## 3. Issue 3 — CMS individual-section preview rendered LTR in Arabic

### Root cause — why Phase 11's fix did not cover it

Direction was never a property of the locale. It was set by
`WebsiteChrome`, one particular shell. The **full-page** preview mounts
that shell, so Phase 11's fix made it correct. The **section editor's**
preview does not: it mounts `PublicWebsiteLocaleProvider` + `SectionRenderer`
on their own, inherited `dir="ltr"` from the surrounding dashboard, and
rendered Arabic copy left-to-right.

### Fix — architecture, not a CSS override

`PublicWebsiteLocaleProvider` now owns direction and emits `dir`/`lang`
itself:

```tsx
<PublicWebsiteLocaleContext.Provider value={value}>
  <div dir={value.direction} lang={locale} className={className}>{children}</div>
</PublicWebsiteLocaleContext.Provider>
```

Every surface that renders public-website content is now correct **by
construction**, rather than by each shell remembering to set it. A CSS
override on the section modal would have left the next preview to regress.

### Verified in production, both directions

In the live section editor on the `elzozo` Home page, with an Arabic
dashboard (`<html dir="rtl">`):

| Preview locale | Provider wrapper | Heading computed direction |
|---|---|---|
| العربية | `dir="rtl" lang="ar"` | `rtl` |
| English | `dir="ltr" lang="en"` | `ltr` |

The English case is the decisive one: the dashboard stayed `rtl` while the
preview went `ltr`, proving the preview follows the locale selector and not
its surroundings. Nothing was saved — the test section was removed and the
page left with its original (empty) composition and the Save button
disabled.

---

## 4. Issue 4 — two stacked footers merged into one

### Root cause

The mandatory Atlas attribution was a **sibling** rendered after
`<WebsiteFooter>`:

```html
<footer>…academy footer…</footer>
<div class="border-t border-border bg-background px-4 py-3">Powered by Atlas</div>
```

Its own bordered, full-width strip directly beneath the Academy's footer —
visually a second footer.

### Fix

It now renders **inside** the `<footer>` element as its bottom row, via a
`FooterAttributionRow` used by all three footer variants (simple, stacked,
columns).

**The Phase 6 requirement is unchanged and unchangeable:** the attribution
is still emitted from component code and never read from
`configuration.footer`, so no CMS field, prop or toggle can remove it. What
moved is where the markup sits, not who controls it. A test asserts it
still renders for a footer configured with no groups and no social links.

### Verified in production

`footerCount: 1`, `attributionInsideFooter: true`, `poweredByCount: 1` — on
both a content-light and a content-heavy page, in English and Arabic.

---

## 5. Issue 5 — frontend typecheck: 9 → 0

All nine were the same shape: section metadata and `SectionConfigForm`
treating a `LocalizedText` field as possibly-undefined where the type
required a value. Fixed by introducing a single shared

```ts
export const EMPTY_LOCALIZED_TEXT: LocalizedText = { en: '', ar: '' };
```

and using it as the explicit default in the metadata registry and the form.

No `any`, no `@ts-ignore`, no `as unknown as`, no assertion suppression.

```
$ npx tsc -p tsconfig.app.json --noEmit
(no output)
```

---

## 6. Issue 6 — frontend lint: 9 → 0

### Root cause

All nine were `no-restricted-imports` — deep `@features/*/*` imports
reaching into another feature's internals. The obvious fix (import from the
feature barrel instead) was **impossible**: `@features/public-website`'s
barrel re-exports components that import `@features/website`, so routing
through it closed a real module cycle. The existing code had comments
documenting exactly that, which is why the deep imports were there.

### Fix — move the shared layer out, rather than work around the cycle

The genuinely shared data layer does not belong to the `public-website`
feature. The dashboard sidebar, the Student LMS shell and the website
section renderers all use it.

| Moved | To |
|---|---|
| `PublicWebsiteService` | `@services` |
| `useAcademyIdentity` | `@hooks` |
| `usePublicWebsiteStatistics` | `@hooks` |
| `usePublicCourses`, `usePublicCourse` | `@hooks` |

That fixed eight. It also removed `@features/learning`'s only path back
into `@features/public-website`, which un-cycled the learning barrel and
let the ninth (`PublicWebsiteLearningRoute`) import `@features/learning`
properly. `LearningPaths.context` is now exported from that barrel with the
reasoning recorded in place.

Two dead things found and removed in passing: an unused
`AtlasPlatformAttribution` import left behind by the footer move, and an
`eslint-disable-next-line react-hooks/exhaustive-deps` in
`LocalizedTextField` that suppressed nothing.

**No ESLint rule was disabled, globally or inline.**

```
$ npm run lint
(no output — 0 errors)
```

12 pre-existing `react-refresh/only-export-components` **warnings** remain.
They are warnings, not errors, and are unrelated to this pass.

---

## 7. Issue 7 — flaky `provisioning.e2e-spec.ts`

This turned out to be **three** independent problems, one of which is a
real production bug.

### 7a. A production bug: connection-pool starvation on retry

`executeSubdomainStep` called `platformDomainConfigurationRepository
.findSingleton()` from **inside** its tenant transaction. That method is an
`upsert` on the pooled `PrismaService` client, **not on `tx`**, so it had to
acquire a *second* connection while the interactive transaction held the
first one open and idle. Under load the transaction aged out:

```
Invalid `tx.subdomainAllocation.create()` invocation
Transaction API error: Transaction not found. Transaction ID is invalid,
refers to an old closed transaction …
```

`withTransientRetry` already classified that error as transient and
correctly retried — but retrying could not help, because every attempt
re-entered the same nest and recreated the same contention.

**Fix:** read the platform configuration *before* opening the transaction.
This is also the more correct shape on its own terms — it is
platform-global configuration with no business being read under a tenant
RLS context, and because the upsert never ran on `tx` it was never covered
by the transaction it appeared to sit in; a rollback would not have undone
it. The remaining transaction is exactly the writes that must be atomic.

I audited every other repository call inside a `runTenant`/
`runTenantAsRequester` callback in that file — all seven correctly pass
`tx`. This was the only one.

`src/provisioning/services/provisioning-orchestrator.service.ts`

### 7b. The 429s: only one of two rate limiters was being flushed

Two independent limiters guard the app. `flushRateLimitKeys` cleared
`ratelimit:*` — the sign-in limiter. The **global `ThrottlerGuard`**
(120 requests/60s, `APP_GUARD`, every route) stores its counters as
`{<hash>:<name>}:hits` and was never cleared at all. With `maxWorkers: 1`,
every spec file shares one localhost IP and therefore one budget, so any
file that polls an endpoint exhausted it and produced 429s in tests that
have nothing to do with rate limiting.

**The throttler was not disabled or weakened.** It stays enabled for every
request in every spec and is still asserted where it is the subject under
test. What was removed is cross-file counter accumulation — which is
exactly what that helper's own comment already claimed it did.

### 7c. A stale terminal status read as a new one

`retryRequest` deliberately only *enqueues* — it does not clear `status` or
`failedAt`. The resume test waited for "the academy step re-executed **and**
the request is terminal", and `failed` satisfied the second half while
still being the *previous* attempt's verdict. The wait returned before the
remaining steps had run.

It now keys on `failedAt` changing, so a retry that genuinely fails again
is still observed promptly and still fails the assertion. **No assertion
was weakened**; the wait was taught to observe the right event.

`waitForAsync` also backs off (25ms → 250ms cap) instead of spending up to
400 requests inside one 10s wait. The first two polls are unchanged, so
nothing that resolves quickly got slower. **No large sleeps were added.**

### Result — run repeatedly

```
RUN 1  Tests: 35 passed, 35 total
RUN 2  Tests: 35 passed, 35 total
RUN 3  Tests: 35 passed, 35 total
```

(`provisioning.e2e-spec.ts` + `organizations.e2e-spec.ts`, three
consecutive full runs.)

---

## 8. Issue 8 — `organizations.e2e-spec.ts`

### Root cause

Test 10 waits for a new Organization's `tenant_usage` row. The recompute
job was **failing**:

```
Invalid `tx.academy.count()` invocation … Transaction already closed:
the timeout for this transaction was 5000 ms, however 5445 ms passed
since the start
```

The SQL itself is **0.1ms** (measured with `EXPLAIN ANALYZE`). This was
pure contention. Two contributors:

1. **166,309 waiting jobs** had accumulated in `bull-test:tenant-usage-recompute`
   across many e2e runs that never clean up. BullMQ is FIFO and this queue
   drains at ~137 jobs/sec, so a job a test enqueued sat behind roughly
   twenty minutes of someone else's leftovers.
2. This shared dev database holds **30,219 organizations** from months of
   runs. A subscription-sweep tick fans out one recompute per stale
   organization — thousands of jobs — saturating the nine-connection Prisma
   pool so that transactions expire before their first query runs.

### Fix

Queue state from previous runs is discarded at bootstrap. **Repeat/scheduler
keys are deliberately kept**: deleting them makes the sweep register as
brand new and tick *immediately* on every boot, which is what triggers the
fan-out above. Preserving them leaves the sweep on its real 15-minute
cadence, which no single spec file is long enough to hit.

This is test-environment isolation under the `bull-test:` prefix that
exists precisely so test queue state never touches anything real. **No
production behaviour changed and no assertion was weakened.**

```
Before: 34.5s, 1 failed, 9 passed
After:  11.8s, 10 passed
```

A garbled trailing comment in that spec (a previous edit had reversed its
lines) was also repaired.

### Honest scoping note

At production scale this failure does not occur — a handful of
organizations means a handful of jobs. But the mechanism is real: a
recompute inside an interactive transaction with a 5s ceiling, fanned out
proportionally to tenant count. At a few thousand tenants this becomes a
genuine production concern. I did not change the timeout, because doing so
on this evidence would be guessing at the right number; it is flagged in
§12 instead.

---

## 9. Issue 9 — scaffold tooling excluded from production builds

Two plugins from the project generator were running for `vite build` and
both left real traces in the shipped bundle:

- **`viteSourceLocator`** stamped every element with `data-mgx-*`
  attributes naming the **source file and line** it came from — the
  production DOM on customers' domains disclosed the codebase layout to
  anyone opening devtools.
- **`atoms()`** injected a route scanner that logged `[routes-scanner] …`
  and `postMessage`d the application's route table to `window.parent`.

Both now run only under `command === 'serve'`. They are left as
dependencies rather than uninstalled, because the dev server still uses
them, and the authoring experience in development is unchanged.

### The same pass removed the generator's other published leftovers

`index.html` was untouched boilerplate on every Academy domain:

| | Before | After |
|---|---|---|
| `<title>` | `ManualMode` | `Atlas` |
| description | "Take full control of your dev workflow…" | the product's own tagline |
| author | `Atoms` | removed |
| favicon | hotlinked to the vendor's Tencent COS CDN | `/favicon.svg` — already in this repo, simply unreferenced |
| og:image | same vendor CDN | omitted |
| `twitter:site` | `@atoms` — the generator's own handle | omitted unless configured |

No social preview image is declared: Atlas has no such asset, and pointing
at a vendor's logo or inventing a URL would both be worse than the default.

### Verified on the deployed bundle

```
routes-scanner: 0   data-mgx: 0   myqcloud: 0
ManualMode: 0       @atoms: 0     shadcnui: 0
```

…and the same, live, from `https://atlass.dpdns.org/`.

---

## 10. Issue 10 — outage and "intentionally unpublished" are never conflated

Both directions are wrong and both are now regression-tested. Calling an
outage "coming soon" hides a real incident; calling a deliberate draft an
outage libels the customer.

| Situation | State |
|---|---|
| Config 404, hostname resolved | `unpublished` |
| Config loads but `status !== 'published'` | `unpublished` |
| Config 500 | `unavailable` |
| Network failure, **no HTTP status at all** | `unavailable` |
| Hostname lookup itself fails | `unavailable` |
| Hostname belongs to no Academy | `not-found` |

**Mutation-checked in both directions.** Reverting to "every error is an
outage" fails 2 tests; changing it to "every error is coming-soon" fails a
different 2. Neither mutation passes.

---

## 11. Two defects found by real-browser verification, not by tests

This is the part of the pass I would most want read.

### 11a. The Academy's own name rendered invisible

On the deployed Coming Soon page, the Academy name came out in
`rgb(236, 242, 243)` — near-white on a white ground. The single most
important word on the page, unreadable.

**Cause:** a global `h1, h2, h3, h4, h5, h6 { color: hsl(var(--foreground)) }`
rule beats inheritance, and `--foreground` is the **Atlas dashboard's**
token, which follows the *operator's* dark-mode preference through
`<html class="dark">` — stamped app-wide and therefore present on customer
domains too.

This is exactly the hazard `.website-theme-scope` exists to neutralise for
the real site. Coming Soon deliberately renders outside `WebsiteChrome`, so
it has to defend itself; every other piece of text on it already stated its
own colour, and the heading was the one gap.

**Fixed, mutation-checked, and generalised:** the new test asserts that
*every* text element states its own colour, so the next element added
cannot quietly inherit the operator's theme either. Verified after
redeploy: `rgb(24, 28, 37)` with `html.dark` still active.

### 11b. Arabic layout wrapped around English words

The Arabic Coming Soon page rendered `dir="rtl"` correctly — and English
copy inside it.

**Cause:** the page hand-rolled its own i18next language switch instead of
using `usePublicWebsiteDocumentDirection`, the hook every other public
surface already uses for exactly this. The two looked equivalent, but the
hand-rolled effect listed `i18n` in its dependencies — and
`useTranslation()` returns a **new `i18n` identity every time the language
changes**. The effect re-ran on its own side effect, its cleanup restored
the previous language, and the page settled back on English. The shared
hook depends on `[locale]` alone, deliberately, with that disable
documented in place; that is precisely what makes it stable.

**Fixed by deleting the duplicate and using the existing hook.** Verified
after redeploy: `قريبًا`, full Arabic body copy, `dir="rtl"`, `lang="ar"`.

**The regression test for this does not actually reproduce it, and I am not
going to claim otherwise.** I added a test that starts a shared English
instance and asks for `ar` — a worthwhile assertion, and the real
production shape. But mutation-checking it against the broken code showed
it **passes either way**: under jsdom the same oscillation settles on
Arabic rather than English. The test is committed with that limitation
documented in the test file itself. This defect was found in a real
browser, and that is where a regression of it would be found again.

### 11c. The `elzozo` site was found in `draft`

Near the end of verification the public site began returning 404 on its
published configuration, server-side. The dashboard showed **مسودة**
(draft).

The site was published when this pass began — verified early on, serving
real content with a "منشور / this site is live now" badge, and still
showing that badge at the end of my dashboard session. I did not knowingly
click Unpublish; my dashboard actions were opening the page editor, adding
a section locally, opening and closing the section modal, and deleting that
section again — none of which were ever saved, and the editor was left with
its original empty composition and a disabled Save button.

**I could not establish what changed it.** I restored it to published and
confirmed it live: both public endpoints return 200, and the site renders
its real content, one footer, full viewport. Flagging it plainly rather
than quietly fixing it, because an unexplained state change on a live site
is worth your attention even though the end state is correct.

---

## 12. Test results, regression coverage, and what I left undone

### Frontend

```
typecheck   0 errors
lint        0 errors (12 pre-existing warnings, unrelated)
tests       96 passed / 96   (was 63 — 33 added)
build       clean
```

New suites, all mutation-checked against the pre-fix code rather than
trusted:

| Suite | Catches |
|---|---|
| `public-website-locale.test.tsx` | 5 of 6 fail on pre-fix code |
| `website-chrome.test.tsx` | 5 of 9 fail on pre-fix code |
| `public-website-status.test.tsx` | 2 fail per mutation, in both directions |

The four viewport/footer tests that pass either way do so correctly — the
pre-fix code also had exactly one `<footer>` element, because the
attribution was a `<div>`.

### Backend

```
unit        560 passed / 560  (50 suites)
lint        clean
e2e         906 passed / 909  (90 suites, 712s)
```

Targeted regression set — 12 suites covering provisioning, organizations,
their RLS and tenant-isolation counterparts, Phase 11 publish/unpublish,
support centre, session location/activity, public website, and the tenant
usage worker and sweep cursor: **141 passed / 141**.

### The three remaining e2e failures — none caused by this pass

I verified this by stashing my changes and re-running the same specs at the
Phase 11 baseline.

| Failure | Verdict |
|---|---|
| `platform-control-plane` › D1-D2-D3-D4 | **Deterministic and pre-existing.** Asserts `POST /academies`, an endpoint Phase 10.6 deliberately removed. Fails identically with and without my changes. |
| `media` › oversized payload (413 vs 500) | **Load-dependent flake.** Passes in isolation with my changes; failed only inside the 12-minute full run. |
| `tenant-subscription-isolation` › P4-TENANT-005 | **Load-dependent flake** (`ECONNRESET`). Same — passes in isolation. |

A fourth (`platform-control-plane` › A1) failed at the *baseline* and passed
with my changes, confirming that suite has flaky, data-dependent tests.

**Deliberately not fixed — outside the stated scope.** The
`D1-D2-D3-D4` failure is real and deterministic, and the fix is not
mechanical: the test's subject is the audit log, not academy creation, so
repointing it means choosing which audited mutation should stand in. That
is a judgement about the test's intent, and the brief named
`provisioning` and `organizations` specifically. Root cause is recorded
here so the follow-up is short.

### Also flagged, not actioned

- **`/blog/` is live in production with zero posts**, prerendering an empty
  shell. Its fallback description is still generator copy ("a flexible blog
  starter…"). Whether Atlas wants a blog is a product decision.
- **Tenant-usage recompute scaling** (§8): an interactive transaction with a
  5s ceiling, fanned out per organization every 15 minutes. Fine today;
  worth a real benchmark before the tenant count reaches the low thousands.

### Phase 11 regressions re-checked

Publish/unpublish (§11c exercised it end to end), CMS full-page preview
RTL, the un-hideable attribution, white Academy websites (`.website-theme-scope`
intact — and §11a is a *new* instance of the class it guards), support
centre, session location and activity, and the data-router features all
verified via the 141-test targeted set plus the production browser checks
above. Tenant isolation and RLS suites pass unchanged.

---

## What was not done to make anything green

No ESLint rule disabled. No TypeScript suppression. No assertion weakened
or deleted. No rate limiting disabled. No RLS bypassed. No authorization
moved to the frontend. No hardcoded viewport heights. No Academy-specific
behaviour for `elzozo`. No fabricated data. No IP-based security decisions.
No tenant isolation touched. No internal errors exposed.

One hypothesis I had — that the tenant-usage transaction timeout needed
raising — I did not act on, because the evidence pointed at contention
rather than at the ceiling, and shipping a change on a false rationale is
worse than leaving it documented.
