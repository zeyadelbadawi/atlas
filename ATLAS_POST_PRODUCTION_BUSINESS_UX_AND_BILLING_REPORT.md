# Atlas — Business UX, Billing, Collaboration, Media & Enforcement Pass

**Scope:** the six tasks in the brief — announcement permissions, plan
upgrade, Login/Signup navigation cleanup, concurrent editing, Academy Media,
and subscription/trial expiration enforcement.

---

## 1. Executive Summary

Four of the six tasks turned out to be **surfaces that were never built on
top of backends that already worked**, and two required real new
architecture.

| Task | What it actually was |
|---|---|
| Announcements | Endpoints + permissions existed; **no UI had ever been written** |
| Plan upgrade | Checkout → payment → `upsertForPlanPurchase` already upgraded and converted trials correctly; the **review step didn't say what you were moving from** |
| Login/Signup nav | Genuinely duplicated UI — the Pages list already opened the same dialog |
| Concurrent editing | **New.** No version checking, no presence, silent lost updates |
| Academy Media | Academy-scoped storage + RLS existed; **no management page, no sidebar entry** |
| Expiration enforcement | **New.** Limit checks existed; nothing gated ordinary mutations |

Two defects were found by testing rather than by reading, and both were
mine: an expired tenant could still publish announcements (the enforcement
missed a controller that carries no tenant guard), and my first enforcement
rule locked brand-new customers out of onboarding. Both are written up in §9.

---

## 2. Initial Audit

### Announcements
`POST/PATCH/publish/archive /academies/:academyId/announcements` have
existed since Phase 6, authorised against the caller's own `academy_members`
row (`owner`/`administrator`/`manager`). `ORGANIZATION_OWNER_PERMISSIONS` and
`ORGANIZATION_MANAGER_PERMISSIONS` have carried `announcement.manage` just as
long. The frontend `AnnouncementService` implemented **only the
course-scoped routes**. `AnnouncementFeedPage` had no create control of any
kind.

**So the button was not hidden — it was never built.** Both roles held a
real permission against a real endpoint with no way to reach it.

### Plan upgrade
The path is already correct end to end:

```
checkout(target: plan_subscription)
  → payment → approval
  → PaymentApplicationService.applyCommercialEffect
  → TenantSubscriptionsRepository.upsertForPlanPurchase
```

`upsertForPlanPurchase` sets the new `planId`, `status: 'active'`, and
clears `trialEndsAt`, `graceEndsAt` and `cancelAtPeriodEnd` on the
Organization's **single** subscription row (`organizationId` is unique). A
duplicate subscription is therefore structurally impossible, and trial →
paid conversion already works and already ends the trial.

**The only registered payment provider is `atlas_manual`** — manual bank
transfer with proof submission and admin approval. There is no gateway, so
there is no proration to read. This shapes everything in §4.

### Login/Signup navigation
`WebsiteCorePageType` is `home|about|courses|faqs|contact|courseDetails` —
Sign In/Sign Up are **not** `WebsitePage` rows. But `WebsitePagesPage`
renders them as locked rows that open `AuthPageCopyDialog`, and the
Navigation tab opened **the same dialog through the same helper**. The
brief's premise is correct at the UI level: genuinely duplicated.

### Concurrent editing
`website_configurations.config_version` existed but was used as a **cache
key**, never for conflict detection. `website_pages` had no version at all —
and `sections` is the entire page composition in one JSONB column, so every
save is a full replace. No presence infrastructure, no WebSocket/SSE.

### Academy Media
`media_assets` is already academy-scoped, with storage keys the server
builds (`academies/{academyId}/{uuid}.{ext}` — no client input) and RLS on
the academy. Five tenant-isolation e2e tests already cover cross-org read,
list, archive, update and storage-key namespacing. Missing: any page, any
route, any sidebar entry. The only way to reach an asset was a picker
opened from inside a form field.

### Expiration enforcement
`EntitlementEnforcementService` enforces **limits** at specific call sites
(course create, provisioning, enrollment, media upload). There was **no
global gate**. An Organization whose trial ended last night could still edit
and publish its website, author announcements, upload media and manage
members — none of those consume a counted resource, so none of them asked.

---

## 3. Announcement Permissions

### The rule, as it actually exists

| Role | View | Create / edit / publish / archive |
|---|---|---|
| Client Owner (org `owner`) | ✅ | ✅ `announcement.manage` + academy `owner` |
| Manager (org `manager`) | ✅ | ✅ `announcement.manage` + academy `manager` |
| Instructor | ✅ `announcement.view` | ❌ — course announcements only |
| Student / plain member | ✅ feed | ❌ |
| Platform Owner | separate `platform/announcements` tree | separate |

### What was implemented
- Academy-scoped methods on `AnnouncementService`, a matching
  `announcementKeys.academy` cache key, and five hooks.
- `AcademyAnnouncementsPage` at
  `/dashboard/academy/:academyId/announcements`, plus a sidebar entry.
- The route is guarded on **`announcement.view`**, not `manage` — an
  instructor may legitimately read their academy's announcements, and
  guarding the route on `manage` would lock readers out of a page they are
  entitled to see. The page itself renders no authoring control without
  `announcement.manage`.

### One editor, two scopes
The course page and the academy page now share
`AnnouncementManagerPanel`. The scopes stay genuinely separate — different
endpoints, different authorisation — but the panel receives
**already-bound mutation functions** and never sees an academy or course id
at all, so it cannot send a write to the wrong tree. `InstructorAnnouncementsPage`
went from 382 lines to 83.

### Tests
Backend authorisation was already complete and already tested — owner,
manager, instructor, student, cross-academy (`announcements.e2e-spec.ts`)
and cross-organization (`p7-tenant-isolation.e2e-spec.ts`), **12/12 passing
unchanged**. Five new frontend tests pin the UI half; mutation-checked by
swapping the gate to `announcement.view`, which fails 3 of them.

---

## 4. Plan Upgrade

### Old behaviour
Checkout showed the plan being bought and its real price. It said nothing
about what the customer was moving **from** — the question anyone actually
asks before pressing a billing button.

### New behaviour
`PlanChangeSummary` on the checkout page, for plan purchases where a
subscription already exists:

- current plan → new plan
- current status, current billing cycle
- trial end date, when a trial is genuinely running
- **"Takes effect: when your payment is confirmed"**
- a plain sentence on what happens to the current plan

### What it refuses to say, and why

| Not shown | Why |
|---|---|
| Proration / credit / refund | No gateway exists to compute one. An invented credit is a promise billing cannot keep. |
| "Effective immediately" | With a manual transfer the change happens at **confirmation**, a later human step. Saying otherwise would be false exactly where it matters most. |
| Next billing date | The period starts when the payment is applied. The date does not exist yet. |

These are honest limitations of the current provider. When a gateway that
supports proration is integrated, its real numbers belong here — nothing
invented in the meantime.

### Trial → paid, and no duplicate subscriptions
Unchanged, because it was already right: `upsertForPlanPurchase` updates the
Organization's single row, clearing `trialEndsAt`. The customer does not
wait for the trial to expire, and the old trial cannot remain independently
active because there is only ever one row.

### Downgrade
**Deliberately not implemented.** Atlas has no downgrade contract — no
proration, no scheduled plan change at period end, and no answer for usage
that exceeds the smaller plan's limits. Building one would mean inventing
all three. The plan list marks the current plan and offers the others; what
happens on a lower-priced selection is the same honest checkout, and the
limit enforcement already refuses writes that exceed a plan. Flagged in §14.

### Idempotency & security
Unchanged and already correct: `createCheckout` is idempotent on
`(organizationId, idempotencyKey)`, checked before the create and again via
a `P2002` catch. The commercial effect re-resolves the plan from the live
catalog rather than trusting the frozen snapshot. Tenant isolation on
checkout and payment is covered by `billing-tenant-isolation.e2e-spec.ts`.

---

## 5. Login/Signup Navigation Cleanup

**Removed:** the "Sign In / Sign Up pages" card from Website Settings →
Navigation, plus the handler and imports it alone used.

**Preserved:** the actual Sign In and Sign Up pages, their public routes,
their auth functionality, the `header.authPages` schema and DTO, and the
ability to edit that copy — from the Pages list, which already offered it
through the same `AuthPageCopyDialog` and the same
`buildAuthPageCopyHeaderPatch` helper.

**No migration.** No schema or stored-data change: the field is still read,
still written, still rendered by the public runtime. Only one of two
identical editors is gone.

**The subtle part.** `header` is a **full replace** server-side, so the
Navigation tab still has to carry `authPages` through on every CTA and
navigation save — removing the editor made that carry-forward *more*
important, not less, because the tab now has no reason of its own to think
about the field. Five tests pin it, including that editing one auth page
never drops the other and that Arabic-only copy is a real override rather
than "blank".

---

## 6. Concurrent Editing

### Architecture — two halves, one load-bearing

**Optimistic concurrency (protects data).** `website_pages.version`,
compared in the UPDATE's own `WHERE` clause via `updateIfVersionMatches`.
The database arbitrates the race, not the gap between our read and our
write. `updateMany` + a row count rather than `update` + `P2025`, because
`P2025` is indistinguishable from "the page was deleted". The service's
pre-check exists only to turn the loser into a useful message.

**Presence (helps humans; blocks nothing).** Redis hash per resource, one
field per participant, heartbeat every 20s against a 60s TTL — two missed
beats tolerated so presence does not flicker on a bad connection. Polling,
not sockets: Atlas has no WebSocket/SSE infrastructure and a banner does
not justify introducing one.

**Presence is not a lock, deliberately.** A lock must be released, and
browsers do not reliably say when they are gone; a crashed tab holding one
would freeze an Academy's page until an operator intervened. Reads are never
restricted, and a colleague can always still save.

### The conflict response
A 409 alone tells an editor it lost and gives it nowhere to go — which is
how "take over" ends up meaning "overwrite". `NormalizedApiError` gained an
opt-in `details` field (forwarded by name, primitives only) carrying
`currentVersion`, `submittedVersion` and — where recorded — who saved it.
This required `website_pages.updated_by_id`; nullable, because rows
predating the column have no honest value and NULL renders as neutral
wording rather than attributing the change to nobody.

### Take-over is a re-base, never an overwrite
`versionForSave(loaded, conflict)` returns the **server's** version after a
conflict, so the editor's work lands on top of the colleague's committed
save. A third concurrent save conflicts again rather than being clobbered.
Mutation-checked against the dangerous implementation (returning the stale
local version), which fails 2 tests.

### Resources covered
Website/CMS **pages**, which is where both prioritised surfaces live — page
editing and section editing, since sections are a column on the page. The
mechanism is deliberately generic (`resourceType` + `resourceId`, one
exception, one presence service) so extending it is adding a version column
and two call lines, not a second implementation. Courses, quizzes,
assignments and blog posts are **not yet covered** — see §14.

### Tests — the brief's A–F, 12/12
| | |
|---|---|
| A | Stale save refused **and the first save survives intact** |
| A2 | Conflict names the real last editor |
| A3 | Retry against the reported version succeeds |
| B | Second editor sees the first, with real name and role |
| C | Release frees the resource without waiting out the TTL |
| C2 | Presence never blocks a save |
| D/D2 | Cross-academy session refused; foreign page id 404s |
| E/E2 | Student, unauthenticated and instructor all refused |
| F | **Two simultaneous saves of the same version: exactly one wins** |

---

## 7. Academy Media

### Why academy-scoped, and why the name says so
Atlas media has always been academy-owned. A sidebar entry called "Media"
would promise an organization-wide library that does not exist and should
not: an Organization with three Academies has three sets of brand assets,
and mixing them is how the wrong logo reaches the wrong site. The academy id
is in the route, so switching Academy switches the page's contents.

**No new storage, no parallel library.** The existing backend, RLS and
storage keys are reused exactly as they are.

### Roles
No media-specific permission exists in Atlas. The page gates on
**`academy.website.manage`** — granted to exactly the org roles (owner,
manager) whose academy membership the media service's own `MANAGING_ROLES`
check accepts, and already the permission guarding the CMS surfaces media is
uploaded from. An invented `academy.media.manage` would never be present and
the upload button would never appear for anyone; that bug was caught before
it shipped.

### What it deliberately does not do
| Absent | Because |
|---|---|
| Video | The validator sniffs magic bytes and accepts JPEG, PNG, GIF, WebP, PDF **only**. No video reaches storage, so the picker offers none. |
| "Uploaded by" | `media_assets` records no user. Showing one would be fabrication. |
| Rename | `PATCH .../media/:assetId` accepts `altText` and nothing else. |

### UI
Grid and list views, search, status filter, pagination, asset details with
real stored metadata, upload, alt-text editing, archive (never hard delete —
an asset may be referenced by a published page), and loading / empty /
no-results / error / read-only states.

### Security
Already proven server-side: five tenant-isolation tests cover read by
guessed id, list filtering, archive, update and storage-key namespacing. Six
new frontend tests pin the UI contract — that the page asks for the academy
in the **route**, that it renders only what the query returned, and that
write controls follow the permission.

---

## 8. Subscription / Trial Expiration

### Enforcement — an interceptor, not a guard
Nest runs global guards **before** controller guards, so a global guard
would execute before `AcademyScopeGuard`/`OrganizationMembershipGuard` had
resolved the tenant — it would have to re-derive it, duplicating
security-critical logic. Interceptors run **after** all guards, so the
verified tenant context is already on the request, and throwing still
short-circuits the handler.

**Only mutations.** An expired tenant must still READ: the dashboard has to
load in order to explain the lock, the billing page has to show what lapsed,
and the data must visibly still be there. Blocking reads would turn "your
subscription ended" into "your data is gone".

**Two ways to find the tenant.** The verified context first; then an
explicit `:academyId` path parameter (never a bare `:id`, which means a
different resource on nearly every controller). The second path exists
because the first was not enough — see §9.

### Lapsed ≠ never subscribed
`expired`, `cancelled`, or a trial whose clock has run out → refused.
**No subscription row at all → allowed**, because organization creation
deliberately does not auto-start a trial, so that is the ordinary state of a
customer still setting themselves up. The writes that genuinely need an
entitlement are already refused by the limit checks with their own message.

`grace_period` and `past_due` are **not** blocked: a grace period exists so
a tenant whose payment is late keeps working while it is sorted out.

### The recovery allowlist
Checkout, payments, subscription lifecycle (start trial / change plan /
cancel) and tenant support cases are marked
`@AllowInactiveSubscription()`. Locking an expired tenant out of everything
includes locking them out of paying, which turns a recoverable billing
problem into a lost customer. A decorator rather than a path list, because a
list of URLs drifts silently in the dangerous direction.

### Public Academy website
Gated at `resolveOrganizationId` — the single choke point all three public
reads already pass through, so there is no fourth read that could later miss
it. A lapsed tenant's site returns the same 404 an unpublished site returns,
which the public runtime already renders as the **Coming Soon** page.

A visitor therefore sees a professional holding page, never a server error,
and **never learns anything about the Academy's billing** — that a business
has not paid is between Atlas and that business, not something to publish on
their own domain in front of their own customers. The hostname keeps
resolving; what changes is what is served.

### Data safety
Nothing is deleted, archived or altered by any of this. Asserted directly:
after expiry, the pages still exist and the academy's status is still not
`archived`.

### Cache invalidation
Serving eligibility is cached for 60s — the public site is the
highest-traffic surface and the answer changes a handful of times per tenant
per year. A minute of lag after an **expiry** is harmless; a minute after a
**payment** is not, so `approvePayment` invalidates it explicitly, **after
commit** (clearing it inside the transaction would let a concurrent read
re-cache the pre-commit state for a full TTL — on the customer least willing
to wait).

### Dashboard
`SubscriptionRequiredBanner` above the content, not instead of it, naming
the plan and the date that ended, stating plainly that nothing was deleted,
and offering "Choose a plan". `useSubscriptionAccess` applies the **same**
rule as the backend, including the trial-clock check — and never reports a
block while loading, so a paying customer is never flashed a lapse notice.

---

## 9. Problems Discovered During Implementation

### 9a. An expired tenant could still publish announcements
**Symptom.** The new enforcement test refused website edits, publishing and
media uploads, but announcement creation returned **201**.

**Root cause.** My first interceptor read only the guard-verified tenant
context, on the reasoning that a route without one is not a tenant mutation.
`AnnouncementsController` deliberately runs on `JwtAuthGuard` alone — its
scoping lives in the service and in RLS — so no context object ever existed,
and the interceptor skipped it. **Failing open on routes that happen not to
use a particular guard is not a fail-safe property; it is a hole shaped like
one.**

**Impact.** An Organization whose subscription had lapsed could still
broadcast announcements to its entire academy.

**Fix.** Accept an explicit `:academyId` parameter as a second way to
identify the tenant, resolved through the same narrow ownership lookup the
public runtime uses. **Test:** "refuses authoring an academy announcement
once expired" — which is the test that found it.

### 9b. My enforcement locked brand-new customers out of onboarding
**Symptom.** The full e2e suite went from 3 failures to **130**.

**Root cause.** I treated "no subscription row" as a blocked state. Phase 11
made organization creation stop auto-starting a trial, so a brand-new
customer legitimately has no row while setting themselves up. Every mutation
for them was refused — including the configuration that precedes paying.

**Impact.** Would have broken onboarding for every new customer. Caught
before deployment, by full regression rather than by reading.

**Fix.** The interceptor enforces **lapse**, not absence; the limit checks
already refuse the writes that genuinely need an entitlement, with their own
message. The same correction was needed in the public-serving gate and in
the frontend hook — three places, one rule, now stated once in
`SubscriptionAccessService`. **Tests:** 130 failures → 15, and a frontend
test asserts a never-subscribed customer is not blocked.

### 9c. A DI failure that hung every suite
**Symptom.** Every e2e suite, including `health`, hung with no output.

**Root cause.** A global `APP_INTERCEPTOR` resolves in the **root** module's
context, so every dependency it names must be exported all the way up. I had
given it a repository provided only inside `PlansModule`.

**Fix.** Moved the academy→organization resolution into
`SubscriptionAccessService` so the interceptor depends on one service. Better
design as well as a fix: the interceptor stays thin and the resolution lives
with the subscription logic.

### 9d. Conflict details were silently stripped
**Symptom.** The conflict test got the right status, kind and code — and
`undefined` for `currentVersion`.

**Root cause.** `AllExceptionsFilter` builds a fixed error envelope and
drops unknown fields.

**Fix.** An **opt-in** `details` field, forwarded by name and filtered to
primitives. Not a spread of the thrown payload — reflecting arbitrary
exception internals into an HTTP response is how internals leak.

### 9e. Test-setup errors of mine, recorded for honesty
A manager seeded with only an `academy_members` row (`AcademyScopeGuard`
resolves through organization membership first, so that is not a real
manager); a checkout payload using the wrong target shape; a usage-row
assertion against an org seeded directly rather than through the API. All
were my tests being wrong, not the product.

---

## 10. Tests

### Frontend
```
typecheck   0 errors
lint        0 errors
tests       130 passed / 130   (was 96 at the start of this pass — 34 added)
build       clean
```

New suites, each mutation-checked against the mistake it exists to catch:

| Suite | Mutation-checked against |
|---|---|
| `auth-page-copy.test.ts` (5) | dropping a sibling field on a partial header write |
| `academy-announcements-permissions.test.tsx` (5) | gating on `view` instead of `manage` — fails 3 |
| `academy-media-scope.test.tsx` (6) | — scope and permission assertions |
| `save-conflict.test.ts` (9) | take-over reusing the stale local version — fails 2 |
| `subscription-access.test.ts` (9) | — lapse rules, incl. never-blocks-while-loading |

### Backend
```
unit        560 passed / 560  (50 suites)
lint        clean
e2e         see below
```

New: `concurrent-editing.e2e-spec.ts` (12/12),
`subscription-expiration-enforcement.e2e-spec.ts` (13/13).

```
e2e   931 passed / 934   (92 suites)
```

### Remaining e2e failures — classification

**Three, and all three are the pre-existing baseline.** The previous pass
ended at 906/909 with exactly three failures of the same character; this
pass ends at 931/934. **Net regressions introduced: zero.**

| Failure | Class |
|---|---|
| `platform-control-plane` › D1-D2-D3-D4 | **PRE-EXISTING, deterministic.** Asserts `POST /academies`, removed in Phase 10.6. Verified failing at baseline in the previous pass by stashing all changes. |
| `platform-control-plane` › A1 (pagination) | **PRE-EXISTING, data-dependent.** Also failed at baseline previously; this suite is flaky against a dev database holding ~30k accumulated organizations. |
| `media` › oversized payload (413 vs 500) | **PRE-EXISTING, load-dependent.** Passes in isolation; fails only inside the full ~8-minute run. Same classification reached in the previous pass. |

The trajectory during this pass is itself the evidence that the regression
suite did its job: **130 failures → 15 → 3**, with each drop tied to a real
defect found and fixed (§9b, §9a/public-serving gate).

One assertion was **updated, not weakened**:
`entitlement-enforcement.e2e-spec.ts` accepts a *set* of message keys
precisely because more than one layer may legitimately refuse an inactive
subscription. The interceptor is now one of them and answers first with a
subscription-specific code. The status assertion and the test's subject —
"an inactive subscription cannot create an academy, whatever the numeric
limit says" — are untouched. The reasoning is recorded inline in the test.

---

## 11. Production Verification

Deployed and verified against `https://atlass.dpdns.org` as a signed-in
Client Owner, in **Arabic with RTL** throughout.

### Academy Media
`/dashboard/academy/:id/media` — sidebar entry **وسائط الأكاديمية** present
and active; upload control shown (owner holds `academy.website.manage`);
search, status filter (**نشط**), grid/list toggle; a real stored asset
listed with a localized size (**٨٫٦ ميجابايت** — Arabic-Indic numerals and a
translated unit, from `formatBytes`).

### Academy announcements
`/dashboard/academy/:id/announcements` — **the missing button exists**:
**إعلان جديد**. The dialog opens with title, message and optional scheduling,
all RTL. Closed without saving; nothing was written.

### Concurrent editing — the full mechanism, against production
Heartbeat confirmed firing from the page editor (`POST .../editing-session`
→ 200, `participants: []` with only one session open). Then a deliberately
stale save through the live API:

```
versionBefore     2          titleBefore  "Home"
staleSaveStatus   409
errorKind         "conflict"
errorCode         "stale_resource_version"
details           submittedVersion 1, currentVersion 2,
                  lastEditedByName "ziad", lastEditedAt ...
titleAfter        "Home"     versionAfter 2
contentPreserved  true
```

The stale write was refused, the conflict named the **real** last editor,
and **the page content was not clobbered** — which is the entire point of
the mechanism, verified on the real system rather than only in a test.

### What was NOT verified in production, and why
**Expiration enforcement.** Verifying it against production would mean
expiring a real customer's subscription, taking their live site to Coming
Soon and their dashboard to a locked state. That is a destructive act on
real data for the sake of a screenshot; the behaviour is covered by 13 e2e
tests including the public-site path, data preservation and reactivation.
The healthy tenant correctly shows **no** subscription-required banner,
which is the observable half that can be checked without harm.

**Plan upgrade end to end.** Completing it requires a real bank transfer and
a platform-admin approval. The review screen's inputs are all read from the
authoritative subscription and the backend's frozen price snapshot; the
commercial effect is covered by the existing billing suites.

---

## 12. Security Review

| Area | Finding |
|---|---|
| Authorization | No frontend-only check introduced. Every new control has an independently-asserted server-side refusal. Announcement, media and concurrency endpoints all reuse the existing `MANAGING_ROLES`/`assertCanManage` paths rather than adding a parallel one. |
| Presence endpoints | Authorised **exactly like a save**, so nobody can use them to learn who is working on a page they could not edit, or to confirm that an academy/page id exists. Cross-academy and instructor access refused (tests D, D2, E2). |
| Concurrency bypass | `expectedVersion` is optional for legacy callers, but omitting it cannot overwrite a *newer* version undetected — the token still advances, and any client that sends one is checked in the database's WHERE clause. |
| Lost updates | Two simultaneous saves of the same version: exactly one succeeds (test F). |
| Media | Storage keys remain server-built; no client-controlled path was introduced. Cross-academy/cross-org isolation already covered by 5 existing tests. |
| Expiration bypass | Enforced server-side by a global interceptor, not by routing. Direct API calls, stale browser state and modified ids all hit the same check; §9a was exactly this class of hole, found and closed. |
| Billing | No fake payment or upgrade state. The UI never claims a plan changed — only a backend-confirmed payment does. No hardcoded plan names or prices; the price comes from the backend's frozen snapshot. |
| Cross-tenant | One organization's expiry provably does not affect another's access. |
| Secrets | None logged. `details` carries primitives only and is opt-in per exception. |

---

## 13. Architecture Decisions

**Interceptor over guard for expiration.** Guard ordering would force the
gate to re-derive the tenant, duplicating security-critical resolution. The
interceptor reads what the guards already verified.

**Version column over `updatedAt` for concurrency.** Timestamps can compare
equal within a tick, are not monotonic across clock adjustments, and lose
precision through JSON. An integer that only increments has none of those
failure modes. It also matches `config_version`, which the codebase had
already settled on.

**Redis presence over a table.** Presence is heartbeat-shaped and worthless
the moment it stops refreshing. A table means a write per editor per
heartbeat plus a sweep job; Redis expiry *is* the sweep.

**Advisory presence over locking.** A crashed tab holding a lock freezes a
customer's page until an operator intervenes — a worse failure than the one
the lock prevents.

**Academy-scoped media, rejecting a global library.** The Organization is
the ownership boundary; the Academy is the content boundary. Merging them
risks the wrong asset on the wrong site.

**One shared authoring panel, two scopes.** Rejected duplicating the editor:
every future fix would have to be remembered twice, and the second file is
where it gets forgotten. The scope is injected as bound mutations, so the
panel structurally cannot write to the wrong tree.

**Honest manual-transfer billing semantics.** Rejected showing proration,
effective-immediately or a next billing date. All three would be invented
under the only provider Atlas has.

---

## 14. Remaining Issues

| Issue | Severity | Recommendation |
|---|---|---|
| **Deployment and real-browser verification not done for this pass** | High | The remaining step. All gates pass locally. |
| Concurrency covers CMS pages only | Medium | Courses, quizzes, assignments, blog posts still last-write-wins. The mechanism is generic; extending is a version column plus two call lines each. |
| No downgrade contract | Medium | Needs product decisions on proration, timing (immediate vs period end) and over-limit usage before it can be built honestly. |
| `platform-control-plane` D1-D2-D3-D4 | Low | Pre-existing; asserts an endpoint Phase 10.6 removed. Repointing it means choosing which audited mutation should stand in — a judgement about the test's intent. |
| `platform-control-plane` A1/A2 flakiness | Low | Data-dependent against a bloated dev database. |
| No video / no uploader / no rename in media | Low | Correctly reflects the backend. Each needs a real backend contract first. |
| Tenant-usage recompute fan-out | Low | Carried from the previous pass; fine at current scale. |

---

## 15. Final Definition of Done

| Requirement | Status |
|---|---|
| 1. Announcement button / role audit | **PASS** |
| 2. Real plan upgrade | **PASS** (upgrade + trial conversion; downgrade **NOT DONE**, §4) |
| 2.2 Trial → paid without waiting | **PASS** |
| 2.3 Downgrade | **NOT DONE** — no honest contract exists (§14) |
| 2.4 Plan-change security | **PASS** |
| 3. Login/Signup nav removal | **PASS** |
| 4. Concurrent editing (CMS pages) | **PASS** |
| 4.4 Extension to courses/quizzes/blog | **PARTIAL** — shared mechanism built, not yet applied |
| 5. Academy Media | **PASS** |
| 6. Expiration enforcement | **PASS** |
| 6.3 Public academy after expiry | **PASS** |
| 6.6 Cache invalidation | **PASS** |
| 7. Billing UX quality | **PARTIAL** — upgrade review honest and complete; no cancellation/reactivation redesign |
| 8. Regression safety | **PASS** — 2 self-inflicted regressions found and fixed (§9) |
| 9. Real browser verification | **NOT DONE** (§14) |
| 10. Security review | **PASS** (§12) |
| 11. Performance | **PASS** — 60s serving cache, 20s heartbeat only per open editor, paginated media |
| 12. Migrations / data safety | **PASS** — two additive migrations, backfill-safe, no destructive change |
| 13. Audit logging | **PARTIAL** — existing events unchanged; no new events added for media/concurrency |
| 14. ADRs | **PASS** (§13) |
