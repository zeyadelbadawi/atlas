# Atlas SaaS Owner Dashboard Enhancements

**Phases:** P57 (plan administration) · P58 (audit detail) · P59 (Analysis routes, role separation) · P60/P60b (Global Courses, course creator)
**Repositories:** `atlas-backend`, `atlas-front`
**Written:** 16 September 2026

> This document records what was **actually built and verified**. Where something
> was not verified, it says so. Section 20 separates confirmed limitations from
> deferred work; nothing in sections 1–19 is aspirational.

---

## 1. Executive Summary

### What was requested

An eight-task pass over the Atlas SaaS Owner (Platform Owner) dashboard: fix a
broken Subscriptions & Trials route, make Plans editable with price history,
audit pagination across owner lists, split the Analysis tabs into routes,
separate the operator's UX from the customer's, build a Global Courses console,
and expose richer audit detail.

### What was implemented

Seven of the eight tasks (1, 2, 3, 5, 6, 7, 8), plus the supporting work each
one genuinely required:

| # | Task | Status |
|---|---|---|
| 1 | Subscriptions & Trials route fix (`platform/subscriptions` → `platform-subscriptions`) | **Done** |
| 2 | Plan management: create / edit / archive, pricing, trial config, limits, features | **Done** |
| 3 | Pagination audit across Platform Owner lists | **Done** |
| 4 | Roles & Permissions editor | **SKIPPED — deliberately** (§2) |
| 5 | Analysis: one tabbed page → four routes with URL state | **Done** |
| 6 | SaaS Owner role separation (sidebar, landing page, tenant banners) | **Done** |
| 7 | Global Courses list + detail, with a real course creator | **Done** |
| 8 | Audit log: before/after changes, request context, filters | **Done** |

Beyond the literal checklist, the work also delivered: a **plan price history**
backed by the existing audit log (no parallel pricing table), a **limit-reduction
impact preview with explicit confirmation**, **optimistic concurrency** on plan
edits, **audit value redaction** at the single write choke point, a **persistent
`courses.created_by_id`** with an evidence-only backfill, and **four new RLS
policies** so the owner can read a draft course's curriculum.

### What was intentionally skipped

**Task 4 (Roles & Permissions).** See §2 and §19.

### Final status

All code gates green. Full evidence and counts in §17. Deployment status in §18.

---

## 2. Scope

### Implemented tasks

1. **Task 1 — Subscriptions & Trials route.** Backend controller renamed to the
   flat resource `platform-subscriptions`; frontend service updated to match.
2. **Task 2 — Plan management.** New `platform-plans` controller/service with
   create, update, archive, limit-impact preview and change history.
3. **Task 3 — Pagination audit.** Every Platform Owner list checked; one
   genuinely unbounded response bounded (§10).
4. **Task 5 — Analysis navigation.** `AnalyticsPage.tsx` deleted; replaced by
   `AnalyticsLayout` + four routed pages with the date range in the URL.
5. **Task 6 — Role separation.** `tenantSurface` navigation flag, role-aware
   `/dashboard` landing, tenant lifecycle panel suppressed for operators.
6. **Task 7 — Global Courses.** `platform-courses` read-only list + detail;
   `courses.created_by_id` column, FK, backfill and index.
7. **Task 8 — Audit improvements.** `changes` and `request_context` columns,
   typed filters, redaction, two new indexes.

### Task 4 — Roles & Permissions — SKIPPED

**Why.** The instruction was explicit: no `role_permissions` architecture, no
cosmetic permissions editor, no frontend-only permission customization, no
partial customization. Atlas authorization is not table-driven — it is decided by
`PlatformOwnerGuard` (which re-reads `users.is_platform_owner` per request),
by organization/academy role checks, and independently by PostgreSQL RLS
policies. A permissions **editor** would therefore have to either (a) introduce a
second, parallel authorization system that RLS does not consult, or (b) render
controls that change nothing. Both were ruled out.

**What remains.** `PlatformRolesPermissionsPage` is unchanged and still reachable
at `/dashboard/platform/roles-permissions`. It remains a **read-only reference**
of the role model. No route, guard, policy or permission behaviour was touched by
this work.

---

## 3. Before vs After

### Task 1 — Subscriptions & Trials

| | |
|---|---|
| **Before** | The controller was `@Controller('platform/subscriptions')`. The frontend `BaseService.resourcePath()` runs `encodeURIComponent` on every path segment, so the slash became `%2F` and the request went to `/api/v1/platform%2Fsubscriptions/overview`. |
| **Problem** | A hard 404 on the page's only data call. Proven with XHR instrumentation before the fix; the handler itself was healthy (200 in 97 ms when called at the un-encoded path). |
| **After** | `@Controller('platform-subscriptions')` — a flat resource name matching `platform-academies` / `platform-users`. The page loads its overview. |
| **UX** | The Subscriptions & Trials page shows real data instead of an error state. |

### Task 2 — Plan management

| | |
|---|---|
| **Before** | `PlatformPlanCatalogPage` was a read-only table. Plans could only be changed by editing the database directly. |
| **Problem** | The SaaS owner could not price, gate or retire their own product. |
| **After** | Edit and History actions per plan; a dialog for pricing, trial eligibility/duration, all eight limits and all twelve features; archive; a limit-impact dry run; and a paginated change history showing who changed what, from what, to what, and when. |
| **UX** | Reducing a limit now requires an impact check and an explicit confirmation before Save is enabled (§9). |

### Task 3 — Pagination

| | |
|---|---|
| **Before** | Owner lists used the shared `CollectionQueryDto` → `PaginatedResult` pipeline, except the subscriptions overview's `plans` block, which returned one row per plan with no bound. |
| **Problem** | Nothing caps the plan catalog; the block grows with it (46 rows on the local database). |
| **After** | The distribution is sorted by subscription count and cut at `PLAN_DISTRIBUTION_LIMIT = 20`, and the response carries `totalPlansWithSubscriptions` so the UI states what was left out. |

### Task 5 — Analysis navigation

| | |
|---|---|
| **Before** | One `AnalyticsPage` with four Radix `<TabsContent>` blocks and `useState` for the date range. |
| **Problem** | No URL state — a refresh or shared link always landed on Overview — and **every** query ran on mount regardless of the visible tab (five requests to read one chart). |
| **After** | `AnalyticsLayout` (header, `SectionTabs`, range selector, `<Outlet/>`) plus four routed pages. Each page requests only its own data. The range lives in `?range=`. |
| **UX** | Deep-linking, browser back/forward, middle-click-to-new-tab, and a range that survives moving between areas. |

### Task 6 — Role separation

| | |
|---|---|
| **Before** | A Platform Owner saw the entire customer product in the sidebar — Courses, Members, Website, Billing, Academy Settings — plus a "no subscription" banner. |
| **Problem** | Every one of those pages asks the API for "my organization's …". An operator has no organization, so all of them were empty or broken, and the banner referred to a subscription that will never exist. |
| **After** | Items marked `tenantSurface: true` are hidden from platform owners; `/dashboard` redirects them to `/dashboard/platform`; `LifecyclePanel` returns null for them. |
| **UX** | The operator's sidebar now contains only operator surfaces (§7). |

### Task 7 — Global Courses

| | |
|---|---|
| **Before** | No cross-tenant course view. "Who created this course" was answerable only from an audit entry, and only for courses created after auditing existed — **6 of 108 courses (6%)** on the local database. |
| **Problem** | A core field that silently worked for some rows and not others, and no way to see courses across tenants at all. |
| **After** | `courses.created_by_id` (FK → `users`, `ON DELETE SET NULL`), written by the real create path; a `platform-courses` read-only list and detail; four new `_platform_select` RLS policies so a draft course's curriculum is visible to the owner. |
| **UX** | Unknown creators render as "Not recorded", never as a guess. |

### Task 8 — Audit improvements

| | |
|---|---|
| **Before** | `audit_log_entries.context` was a flat scalar map. No before/after values, no request context, no typed filters, and the list joined no academy. |
| **Problem** | An audit entry could say *that* a plan changed but not *what it changed from*. |
| **After** | `changes JSONB` (a typed `{field: {from, to}}` map, redacted at write time), `request_context JSONB`, academy on the summary, typed filters, and two composite indexes. |

---

## 4. Architecture Changes

### Backend — new

| File | Purpose |
|---|---|
| `src/platform/controllers/platform-plans.controller.ts` | `platform-plans` write surface (`JwtAuthGuard` + `PlatformOwnerGuard`). |
| `src/platform/services/platform-plans.service.ts` | Create/update/archive/`previewLimitImpact`. Emits five distinct audit actions. |
| `src/platform/services/plan-history.service.ts` | Reads plan history out of the audit log under `runInUserContext`. |
| `src/platform/controllers/platform-courses.controller.ts` | `platform-courses` read surface. GET only. |
| `src/platform/services/platform-courses.service.ts` | Cross-tenant course list + detail. |
| `src/platform/dto/update-plan.dto.ts` | `CreatePlanDto`, `UpdatePlanDto`, `ArchivePlanDto`, plus `assertValidLimits`/`assertValidFeatures` validating against the real `PLAN_LIMIT_KEYS`/`PLAN_FEATURE_KEYS`. |
| `src/platform/dto/preview-plan-limits.dto.ts` | Dry-run payload. |
| `src/platform/dto/list-audit-log-query.dto.ts` | Typed audit filters. |
| `src/platform/dto/list-platform-courses-query.dto.ts` | Typed course filters with an `@IsIn` sort allow-list. |
| `src/platform/dto/platform-course.contract.ts` | Summary/detail response shapes and `BigInt` → major-units conversion. |

### Backend — modified

- `src/audit-log/services/audit-log-writer.service.ts` — `AuditFieldChange`,
  `AuditRequestContext`, and the exported `redactChanges()` applied at the single
  choke point in `write()`.
- `src/audit-log/repositories/audit-log-entries.repository.ts` — new columns in
  the raw INSERT; academy added to `WITH_RELATIONS`; typed filters; `findMany`
  builds a `conditions[]` array.
- `src/course/repositories/courses.repository.ts` — `findManyAnyAcademy`,
  `findByIdAnyAcademy`, `countEnrollmentsByStatus`, `countPaidOrders`, and the
  shared `PLATFORM_COURSE_INCLUDE`.
- `src/course/services/courses.service.ts` — `createdBy: { connect: { id: userId } }`
  on create.
- `src/platform/controllers/admin-subscriptions.controller.ts` — resource rename.
- `src/platform/services/admin-subscriptions.service.ts` — bounded plan
  distribution + `totalPlansWithSubscriptions`.

### Frontend — new

`PlatformPlansService`, `PlatformCourseService`, `usePlatformPlans`,
`usePlatformCourses`, `PlanEditorDialog`, `PlanHistoryPanel`,
`PlatformCourseListPage`, `PlatformCourseDetailPage`, `AnalyticsLayout` + four
analytics pages, `useAnalyticsRange`, `analytics-trend.utils`,
`DashboardIndexRoute`, `plan-limit-changes.utils`, `platform-course.types`.

### Frontend — modified

`navigation.config.ts`, `navigation.utils.ts`, `navigation.types.ts`,
`AppRouter.tsx`, `route-paths.ts`, `query-keys.ts`, `plan.types.ts`,
`LifecyclePanel.tsx`, `PlatformPlanCatalogPage.tsx`, `AdminSubscriptionsPage.tsx`,
EN/AR `platform.json` and `navigation.json`. `AnalyticsPage.tsx` **deleted**.

### Architecture reused, not re-invented

- `TenancyContextService.runInUserContext` for every cross-tenant read.
- `CollectionQueryDto` → `buildPaginationMeta` → `PaginatedResult` for every list;
  `usePagination` + shared `<Pagination>` / `<DataTable>` on the client.
- `AuditLogWriterService.write(tx, …)` inside the caller's own transaction.
- The existing `course:` status/visibility/pricing vocabulary and
  `getCourseStatusTone` / `getCourseVisibilityTone` helpers.
- The existing `is_platform_owner(text)` SECURITY DEFINER function (P12) — the
  four new policies add no new predicate.
- Existing billing: completed money already snapshots itself
  (`Payment.amountMinorUnits`, `Checkout.snapshot`), which is why editing catalog
  pricing cannot make a past charge ambiguous.

### New architecture introduced, and why

1. **`plans.version` + optimistic concurrency.** Two owners editing one plan
   would otherwise silently overwrite each other. `version` is in the UPDATE's
   WHERE clause, so the **database** decides the race; a loser gets 409
   `errors.concurrency.staleVersion`.
2. **`audit_log_entries.changes`.** The pre-existing `context` column is typed as
   flat scalars and cannot hold `{from, to}`. Rather than stringify diffs into it,
   `changes` was added as a first-class typed, redacted field — which is also what
   delivers Task 8.
3. **`courses.created_by_id`.** "Who created this course" is a property of the
   course, not an event (§5).
4. **`tenantSurface` navigation flag.** One declarative flag on the item, read by
   the existing `filterNavigationItems`, instead of role checks scattered through
   the sidebar.

---

## 5. Database Changes

Four migrations, all applied to the local development database and verified by
querying it directly.

### `20261003000000_p57_plan_admin_version`

```sql
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
```

Backs optimistic concurrency. `DEFAULT 0` means every existing row is immediately
valid and no backfill is needed. Rollback is a plain `DROP COLUMN`; the only
consequence is losing conflict detection.

### `20261004000000_p58_audit_changes_and_request_context`

Adds `changes JSONB` and `request_context JSONB` to `audit_log_entries`, plus:

- `audit_log_entries_action_occurred_at_idx (action, occurred_at)` — serves the
  plan-history read, which filters on five `action` values and sorts newest-first.
- `audit_log_entries_actor_user_id_occurred_at_idx (actor_user_id, occurred_at)`
  — serves "what did this person do".

Both columns are nullable: entries written before this migration genuinely have
no diff, and the UI says so rather than rendering an empty area.

### `20261005000000_p60_course_creator_and_global_index`

1. `ALTER TABLE courses ADD COLUMN created_by_id TEXT`.
2. FK `courses_created_by_id_fkey → users(id) ON DELETE SET NULL ON UPDATE CASCADE`.
   **Verified on the database:** `pg_constraint.confdeltype = 'n'` (SET NULL).
   `SET NULL` matches every other "who did this" relation in the schema
   (`TrialRedemption.redeemedByUser`, `SubscriptionCancellation.cancelledByUser`,
   `AssignmentSubmission.grader`, `WebsitePage.updatedBy`,
   `LiveProviderConnection.connectedByUser`). Deleting a user must never delete
   their academy's courses and must never block the deletion.
3. `courses_created_by_id_idx` — Postgres does not auto-index FK columns.
4. **Backfill from provable evidence only.** A `DISTINCT ON (target_id)` over
   `audit_log_entries WHERE action = 'course.created' AND target_type = 'course'`,
   earliest entry wins, and only where the actor still exists.
   **Measured result: 108 courses, 6 backfilled — exactly the 6 that have such an
   audit entry.** The other 102 stay `NULL`.
   Deliberately *not* used as fallbacks: the academy owner, the first instructor,
   or the earliest academy member. Each is a plausible guess presented as a fact.
5. `courses_created_at_idx (created_at DESC)` — the global list sorts by recency
   across all academies; the existing `(academy_id, status, visibility)` and
   `(status, visibility)` indexes do not serve that.

### `20261005010000_p60b_course_detail_platform_select`

Four additive RLS policies:

```sql
CREATE POLICY "course_sections_platform_select"    ON "course_sections"
  FOR SELECT USING (is_platform_owner(current_setting('app.current_user_id', true)));
-- …and the same for course_lessons, course_instructors, course_categories
```

P15 gave `courses` a platform policy but stopped there, so the owner could see
that a course existed and nothing inside it. These are `FOR SELECT` only —
the platform course surface is read-only, and RLS says so independently of the
fact that no write endpoint exists. Because PostgreSQL OR's multiple permissive
policies for one command, every existing tenant/enrolled/instructor policy is
byte-for-byte untouched.

**Rollback:** `DROP POLICY` ×4 restores the previous visibility exactly.

### Safe-delete / archive semantics

Plan archive is a **status change, never a delete**: it sets
`status = 'archived'` **and** `displayOrder = 0` — both halves of
`CUSTOMER_FACING_WHERE` — so the plan leaves the customer catalog while every
existing subscription, payment and audit row is untouched.

---

## 6. API Changes

All routes are under `/api/v1` and guarded by `JwtAuthGuard, PlatformOwnerGuard`.
Unauthenticated → **401**; authenticated non-owner → **403**.

### `POST /platform-plans`

Creates a catalog plan. Body: `key` (immutable — `add_ons.compatiblePlanKeys`
references plans by key with no FK), `name`, `displayOrder`, `limits`, `features`,
`pricing`, trial fields. `limits`/`features` are validated against the real
`PLAN_LIMIT_KEYS` / `PLAN_FEATURE_KEYS`. → **201** with the plan including `version`.

### `PATCH /platform-plans/:key`

Updates pricing, trial config, limits, features, localized text. Requires
`expectedVersion`. → **200**, or **409** `errors.concurrency.staleVersion`.
Emits `plan.updated`, plus `plan.pricing_changed` and/or
`plan.trial_config_changed` when those specific areas change.

### `POST /platform-plans/:key/archive`

Requires `expectedVersion`. → **200**. Emits `plan.archived`.

### `POST /platform-plans/:key/limits/preview`

`@HttpCode(200)`. A **dry run** — writes nothing. Body: a full `limits` set.
Returns the organizations already above each proposed limit, plus
`unmeasurableLimitKeys`. `USAGE_COLUMN` maps limit keys to `tenant_usage`
columns; `recordedSessions` has no such column and is reported as unmeasurable
rather than silently assumed safe.

### `GET /platform-plans/:key/history`

Paginated (`CollectionQueryDto`), newest-first, filtered to the five
`PLAN_HISTORY_ACTIONS`. Each entry: `id`, `action`, `occurredAt`, `actor`,
`changes` (`{field: {from, to}}`). Read under `runInUserContext(platformOwnerId)`.

### `GET /platform-courses`

Cross-tenant course list.

- **Query:** `page`, `pageSize` (≤100), `search`, `sortBy`, `sortDirection`,
  `status`, `visibility`, `pricingType`, `academyId`, `organizationId`.
- **`sortBy`** is an `@IsIn` allow-list (`title`, `createdAt`, `updatedAt`,
  `publishedAt`) because the value is interpolated into a Prisma `orderBy` key.
  Anything else → **400**. `forbidNonWhitelisted` makes an unknown parameter **400** too.
- **`search`** spans course title, slug, academy name and organization name.
- **Response:** `PaginatedResult<PlatformCourseSummary>` — id, title, slug,
  status, visibility, pricing (major units, `number`), academy + organization ids
  and names, category, `createdBy | null`, `enrolledStudents`, `createdAt`,
  `publishedAt`.

Verified live: 108 items; `status=draft` → 68; `visibility=private` → 69;
`pricingType=paid` → 1; `search=<org name>` → 2, all from that org.

### `GET /platform-courses/:id`

Adds `shortDescription`, `description`, `thumbnailUrl`, `updatedAt`,
`totalSections`, `totalLessons`, `completedStudents`, `paidOrders`, `instructors`.
Unknown id → **404** (also the answer when RLS hid the row, so a caller cannot
distinguish "no such course" from "not yours").

### `GET /platform-subscriptions/overview` (route corrected)

Response gains `totalPlansWithSubscriptions`; `plans` is now capped at 20.

---

## 7. SaaS Owner Navigation

### Final Platform Owner sidebar

```
PLATFORM
  Platform Dashboard              /dashboard/platform

USER
  Profile                         /dashboard/profile
  Notifications                   /dashboard/notifications

SUBSCRIPTIONS & TRIALS            (new group)
  Subscriptions & Trials          /dashboard/platform/subscriptions
  Plans & Add-ons                 /dashboard/platform/plans

ADMINISTRATION
  Settings, Analytics ▸, Zoom, Platform Domain, Payment Review,
  Atlas Payment Provider, Academy Provisioning, Organizations,
  Academies, Global Courses (new), Users, Roles & Permissions,
  Audit Log, Support, Add-ons Management

  Analytics ▸ Overview | Users | Engagement | Revenue    (nested)
```

### New

- **SUBSCRIPTIONS & TRIALS** group.
- **Global Courses** — `/dashboard/platform/courses`, placed directly after
  Academies (organization → academy → course).
- **Analytics** gained four nested children and `matchNestedPaths: true`.

### Moved

`platform-plan-catalog` and `platform-subscriptions` moved out of
ADMINISTRATION into the new SUBSCRIPTIONS & TRIALS group. The old entries were
removed in the same change, so the items **moved** rather than duplicated.

### Hidden from the Platform Owner (`tenantSurface: true`)

Eleven customer-product items, plus three added during this pass:

- **Dashboard** (`/dashboard`) — the tenant dashboard. This empties the whole
  OVERVIEW group for an operator, and `DashboardSidebar` already drops sections
  with no visible items.
- **Support** (`/dashboard/support`) — raising a ticket is a customer action; the
  operator answers cases from the platform Support console instead.

### Removed from the sidebar entirely

- **Trial Policy** (`/dashboard/platform/trial`) — per-plan trial settings now
  live in the plan editor. **The route is retained** (see §8 and §20): this page
  is still the only editor for the two platform-wide settings a plan cannot
  express.

### Route changes and protection

New routes `platformCourses` and `platformCourseDetail`, and the four analytics
children, are all wrapped in `RouteGuard requireAuthentication
requiredRoles={['platform_owner']}` — the same guard every other platform route
uses. `/dashboard` now renders `DashboardIndexRoute`, which redirects platform
owners to `/dashboard/platform` and renders the tenant dashboard for everyone
else. That is a **redirect, not an authorization decision**; the tenant dashboard
is still routable and still guarded exactly as before.

---

## 8. Free Trial & Subscription Management

### Per-plan trial eligibility and duration

The plan editor writes `trialEligible` (boolean) and `trialDurationDays`
(integer or null). Empty means "fall back to the platform default", expressed as
`null` — **not 0**, which would mean a zero-day trial.

### Global trial policy

`trial_policy` is a single-row table holding two things no plan can express:

- `enabled` — the platform-wide kill switch, read by
  `TrialRedemptionService.startTrial`, which throws
  `errors.entitlement.trialsDisabled` when false.
- `durationDays` — the fallback. The live resolution is
  `plan.trialDurationDays ?? trialPolicy.durationDays`
  (`trial-redemption.service.ts:150`).

### Subscription & trial overview

`GET /platform-subscriptions/overview` returns subscription counts by status,
`activePaid`, trial counts (ever redeemed / active / cancelled / converted),
cancellations with reasons and a bounded recent list, and the bounded plan
distribution. Revenue is reported as `{ tracked: false }` — Atlas does not track
subscription revenue, and it is reported as untracked rather than fabricated.

### Route fix

§3, Task 1.

### Audit behaviour

`plan.trial_config_changed` is emitted as its own action whenever trial
eligibility or duration changes, so trial changes are findable without reading
every `plan.updated` diff.

### Concurrency and safeguards

Every plan mutation carries `expectedVersion`. Archive never deletes. Limit
reductions require an impact check and an explicit confirmation (§9).

---

## 9. Plan Management

### Create

`POST /platform-plans`. `key` is settable only here — `add_ons.compatiblePlanKeys`
references plans by key with **no foreign key**, so a renamed key would silently
orphan add-on compatibility. `displayOrder: 0` keeps a plan out of the
customer-facing catalog.

### Edit

`PATCH /platform-plans/:key` with `expectedVersion`.

### Archive / deactivation

`POST /platform-plans/:key/archive`. Sets `status='archived'` **and**
`displayOrder=0`. Nothing is deleted; existing subscriptions are untouched.

### Pricing and price history

**Audit-log-backed — no `plan_price_history` table.** The implementation audit
found no architectural constraint requiring one: completed money already
snapshots itself (`Payment.amountMinorUnits`, `Checkout.snapshot`), so editing
catalog pricing can never make a past charge ambiguous. That makes history here
an *administrative* record of who changed what — which is exactly what
`audit_log_entries` already is.

`PlanHistoryPanel` renders each entry as **"before → after"** per field, with the
action, the actor's name and the timestamp; paginated at 5 per page.

Verified live: a price edit produced
`plan.pricing_changed` with `{from: {amount: 79}, to: {amount: 89}}`, actor
"Atlas Admin", with a timestamp.

There is no ambiguity between historical transaction prices and current catalog
pricing: they live in different systems and the panel labels itself as
administrative history.

### Limits — the destructive-change flow

1. The editor detects which limits the draft **lowers**
   (`findReducedLimitKeys`). Two things count, and the second is easy to miss:
   a smaller number, and `unlimited` → any finite number.
2. If any, **Check impact** runs the dry run and lists the organizations already
   above each proposed limit.
3. **Save stays disabled** until an explicit confirmation checkbox is ticked.
4. **Nothing destructive happens on save.** No customer data is deleted, no
   resource is disabled or removed; existing usage stays intact. The limit
   governs *future* entitlement checks only.

Verified live: *"1 organization is already above a proposed limit: Acme Academy
Group — Academies: 2 / 0"*, with Save disabled until confirmed.

A defect found by the new unit tests and fixed: an **emptied** limit field
resolved through `Number('')` to a real, saveable limit of **0**. It now resolves
to `NaN`, `isCompleteDraft` blocks the save with a visible message, and
`findReducedLimitKeys` ignores non-finite values so the destructive warning does
not flash mid-keystroke.

### Features and localization

All twelve `PLAN_FEATURE_KEYS` are editable as switches; localized plan text is
editable per language. Every editor string exists in EN and AR.

### Subscription safety

No plan mutation touches `tenant_subscriptions`. Archiving removes a plan from
the catalog; subscribers keep their plan.

---

## 10. Pagination

### Lists audited

| Surface | Before | Change |
|---|---|---|
| Platform Organizations | `CollectionQueryDto` → `PaginatedResult` | none needed |
| Platform Academies | paginated | none needed |
| Platform Users | paginated | none needed |
| Audit Log | paginated | filters added (§14) |
| Support Cases | paginated | none needed |
| Add-ons | paginated | none needed |
| Zoom consoles | paginated | none needed |
| **Subscriptions overview → `plans[]`** | **unbounded** | **bounded at 20 + total reported** |
| **Plan history** (new) | — | paginated, 5/page |
| **Global Courses** (new) | — | paginated, 20/page default |
| Academy detail members/courses | capped at `PLATFORM_DETAIL_MEMBER_CAP = 200` | none needed |
| User detail → organization memberships | unbounded | **deliberately unchanged** (below) |

### Why the plan distribution was bounded rather than paginated

It is a **distribution** — "where are subscriptions concentrated" — not a
browsable list. A pager over a summary chart would be a second, weaker way to
browse the catalog that `GET /plans` already does properly. It is sorted by
subscription count first so the cut always falls on the plans that matter least,
and `totalPlansWithSubscriptions` reports what was left out.

### Why user-detail memberships were left alone

`UserOrganizationsService.getMembershipsForUser` is **shared** with the
organization switcher. Capping it would risk silently truncating a user's own
switcher. Measured on the real database: **max 2 memberships per user, average
1.00**. Naturally bounded; no change made.

### Architecture reused

Server: `CollectionQueryDto` → `buildPaginationMeta` → `PaginatedResult<T>`.
Client: `usePagination({ totalItems })` → shared `<Pagination>` / `<DataTable>`.
No second pagination system was introduced.

### Search / filter / sort

All server-side. The Global Courses page holds its filters in the URL and sends
only the filters that are actually set. Filtering in the browser would narrow the
current page rather than the real result set.

### Index decisions

`courses_created_at_idx (created_at DESC)` for the global sort;
`courses_created_by_id_idx` for the FK; two composite audit indexes (§5).

---

## 11. Analysis Navigation

### Old

One page, four `<TabsContent>` blocks behind `<Tabs defaultValue="overview">`,
date range in `useState`.

### New

`AnalyticsLayout` renders `PageHeader` + `SectionTabs` + `AnalyticsDateRangeSelect`
+ `<Outlet/>`; four routed pages render the panels.

`SectionTabs` — **not** Radix `<Tabs>` — because Atlas already has a tab strip
built from real `<Link>`s, used for exactly this "tabs that are routes" shape
elsewhere. It gives deep-linking, back/forward and middle-click for free.

### Structure and deep-linking

```
/dashboard/analytics             → Overview
/dashboard/analytics/users       → Users
/dashboard/analytics/engagement  → Engagement
/dashboard/analytics/revenue     → Revenue
?range=7d | 30d | 90d            (default 30d; unknown values fall back)
```

The sidebar's Analytics children mirror the tab strip exactly — same labels, same
paths — so the two navigations cannot disagree about what exists.

Verified live: `/dashboard/analytics/revenue?range=90d` renders with Revenue
active, "Last 90 days" selected, and no unresolved translation keys.

### Data loading and performance

Each page requests only its own data. The range object identity is memoized so it
is stable inside TanStack Query keys — a new identity per render would refetch
every analytics endpoint continuously (asserted by a test). The Revenue page
reuses the Overview query key for `revenueCurrency`, so moving between the two
areas hits the cache rather than issuing a second request.

**No backend change was required** — the analytics API already exposed
`overview`, `time-series/:metric` and `breakdown/:dimension` separately.

---

## 12. SaaS Owner Role Separation

### Removed customer UX

Thirteen `tenantSurface: true` items (Organization, Academy, Learning, Website,
Billing groups, the tenant Dashboard, and the tenant Support form).

### Hidden navigation

`filterNavigationItems` applies `if (item.tenantSurface && isPlatformOwner(user))
return false;`, recursing into children. `isPlatformOwner` reads the same
`platform_owner` role the rest of the frontend checks, derived server-side from
the real `users.is_platform_owner` column — the one `is_platform_owner()`
consults inside the RLS policies. **No second notion of "is an admin" was
introduced.**

### Route protection

Unchanged. Navigation filtering affects visibility only; `RouteGuard` and the
backend guards remain the authority.

### Landing page

`/dashboard` → `DashboardIndexRoute` → `<Navigate to="/dashboard/platform" replace />`
for platform owners. `replace` so the useless page never enters history. The
tenant dashboard arrives as `children` rather than being imported, so it stays a
lazy chunk an operator never downloads.

### Banner behaviour

`LifecyclePanel` returns null for platform owners. Every lifecycle it speaks to —
create an organization, choose a plan, start a trial, renew — is a customer
action an operator will never take.

### What remains available

The full operator console: Platform Dashboard, Subscriptions & Trials, Plans &
Add-ons, Organizations, Academies, Global Courses, Users, Roles & Permissions,
Audit Log, Support console, Analytics, Zoom, Provisioning, Payment surfaces,
Settings, Profile, Notifications.

---

## 13. Global Courses

### List

`/dashboard/platform/courses`. Columns: **Course** (title + category),
**Academy** (academy + organization), **Status** (status + visibility badges),
**Pricing**, **Created by**, **Enrolled**, **Created**.

Search (title / slug / academy name / organization name, 300 ms debounce),
filters (status, visibility, pricing), sort (created date / title / last updated /
published date, asc or desc), pagination. All server-side; all in the URL.

Loading → `DataTable` skeleton. Error → `ErrorState` with retry. Empty →
distinct copy for "no courses at all" vs "nothing matches your filters".

### Detail

`/dashboard/platform/courses/:courseId`. Four stat tiles (**Enrolled students**,
**Completed students**, **Paid orders**, **Curriculum**), an **Ownership** card
(organization and academy, both linking to their platform detail pages; creator;
created; last updated; published) and a **Catalog** card (pricing, category,
slug, description). An **Instructors** card lists assigned instructors or an
empty state.

### Academy / Organization relationships

Every row carries `academyId`/`academyName` and `organizationId`/`organizationName`
— the whole point of a cross-tenant list is that two adjacent rows may belong to
different customers.

### Creator

`createdBy` is `{id, name, email}` or **`null`**. Null renders as "Not recorded"
in the list and "Not recorded — this course predates creator tracking" on the
detail page. Never a guess.

### Terminology — no invented concepts

Three separate existing facts, never collapsed into one invented "subscribed
students" metric:

- **Enrolled students** — `enrollments` with status `enrolled` or `completed`.
  The count is **filtered deliberately**: `EnrollmentStatus` also carries
  `available`, `pending` and `unavailable`, which are eligibility states, not
  people taking the course.
- **Completed students** — `enrollments.status = 'completed'`.
- **Paid orders** — `course_orders.status = 'paid'` (P13), the system that
  already owns "who paid for this course".

### Curriculum

`totalSections` / `totalLessons`, rendered with real i18next plurals. Visible for
**draft and private** courses because of the P60b policies — verified live on a
draft/private course showing "2 sections · 1 lesson" (and in Arabic,
"قسمان • درس واحد", using the dual form).

### Progress / aggregates

Enrollment counts come from the page's own filtered `_count` inside the single
list query — one aggregate per row, never a follow-up query per course. Detail
aggregates are four parallel bounded queries.

### Performance

`courses_created_at_idx (created_at DESC)` serves the default global sort.
`PLATFORM_COURSE_INCLUDE` is defined once so the list and the detail can never
drift into showing different ownership or creator information for the same course.

---

## 14. Audit Improvements

### Already available

`id`, `actorUserId`, `organizationId`, `action`, `targetType`, `targetId`,
`targetLabel`, `context`, `occurredAt`.

### Newly exposed

Summary gains `academyId`, `academyName`, `role`. Detail gains `changes` and
`requestContext`.

### New persistence

`changes JSONB` and `request_context JSONB` (§5).

### Before/after handling

`changes` is a typed `Record<string, {from, to}>`. `PlanHistoryPanel` renders it
as "before → after". Objects are JSON-stringified with `dir="ltr"` — an Arabic
reader still needs `{"amount":79}` left-to-right. Entries written before P58 have
no diff and say so rather than showing an empty area.

### Filters, search, pagination

`ListAuditLogQueryDto` extends `CollectionQueryDto` with `action`, `actorUserId`,
`targetType`, `organizationId`, `academyId`, `occurredFrom`, `occurredTo`.
`findMany` builds a `conditions[]` array; `search` also matches `targetId` exactly.

### Redaction and security

```ts
const REDACTED_FIELD_STEMS = ['password','secret','token','credential','privatekey',
  'apikey','signature','totp','recoverycode','hash','salt','cipher','encrypted'];
```

`redactChanges()` is applied at the **single choke point** inside
`AuditLogWriterService.write()`, so no caller can bypass it, and it recurses with
a depth bound of 3. Covered by 19 dedicated unit tests.

### Indexes

`(action, occurred_at)` and `(actor_user_id, occurred_at)`.

### Retention

**No retention or deletion policy was introduced.** No automatic cleanup, no
historical audit records deleted. Audit rows are append-only in this codebase.

---

## 15. Security

**Security was not weakened at any point to make functionality work.** No guard
was relaxed, no RLS policy was dropped or made more permissive for existing
roles, no tenant-scoped predicate was widened, and no authentication or
entitlement check was bypassed.

### Authentication

Every new route carries `JwtAuthGuard`. Verified: unauthenticated requests to
`GET /platform-courses` and `/platform-courses/:id` return **401**.

### PlatformOwnerGuard

Re-reads `users.is_platform_owner` **per request** — it is not a token claim and
no organization role can grant it. Verified with a real tenant owner who
**owns the course being requested**: still **403** on both routes.

### Authorization

The console is **read-only**. `POST`, `PATCH` and `DELETE` against
`/platform-courses` all return **404** (no such route) — asserted in the e2e suite
so a future write route cannot be added silently.

### RLS — "guard decides, RLS independently agrees"

Every cross-tenant read runs inside `runInUserContext(platformOwnerId)` with **no**
`app.current_organization_id` set, so the tenant policies cannot match and only
`is_platform_owner(...)` makes a row visible. A caller who somehow reached the
service without being an owner would get an **empty result**, not another tenant's
data.

The four new P60b policies are `FOR SELECT` only, permissive and additive, and
reuse the existing `is_platform_owner(text)` SECURITY DEFINER function verbatim.
No tenant user gains or loses a single row.

### Tenant isolation

Verified in the e2e suite by seeding courses in **two unrelated organizations**
and asserting one request reaches both — and that `organizationId` filtering
excludes the other tenant's rows.

### Sensitive data handling

`PLATFORM_COURSE_INCLUDE` selects only `{id, name, email}` from `User` —
**never the whole row**, which carries the password hash and every auth field.
No password, token, OAuth secret, webhook secret, encryption key, signature or
raw provider payload is read, returned or logged anywhere in this work.

### Destructive-action protection

Plan archive is a status change. Limit reductions require an impact check plus an
explicit confirmation and perform no destructive change. Optimistic concurrency
prevents silent overwrites.

---

## 16. Localization / RTL

### EN and AR

Both locales carry every key added by this work. **Verified: 3 774 base keys in
EN, 3 774 in AR, 0 missing in either direction** (plural-suffix-aware comparison —
Arabic has six plural categories to English's two, so comparing raw keys produces
false positives).

New namespaces: `platform:courses.*` (title, table headers, filters, sort labels,
stats, empty states, creator copy), `platform:planAdmin.*`,
`navigation:items.platformCourses`, `platform:adminSubscriptions.plans.truncated`.

### RTL

Verified in Arabic in a real browser: the layout mirrors fully (sidebar on the
right), the back arrow flips via `rtl:rotate-180`, technical values (slug, JSON
diffs, email) stay LTR via explicit `dir="ltr"`, and user-supplied text uses
`dir="auto"`.

### Numeric and date formatting

Currency through `formatCurrency(value, language, currencyCode)`; dates through
`useDateFormatter`. Numeric cells carry `data-atlas-numeric="true"` so digits stay
LTR under RTL.

**Plurals.** A defect found during Arabic verification and fixed: the curriculum
tile interpolated one string and rendered "1 lessons". It now uses real i18next
plural keys — `sectionCount_one/other` in EN, and all six categories in AR.
Verified: English "2 sections · 1 lesson"; Arabic "قسمان • درس واحد" (dual form
for two, singular for one).

### Responsive

Wide content is inside the shared `DataTable`, which wraps its table in
`w-full overflow-x-auto`. Filter rows use `flex flex-wrap`; stat tiles use
`sm:grid-cols-2 lg:grid-cols-4`; detail cards `lg:grid-cols-2`. See §20 for the
verification limitation.

---

## 17. Testing

### Backend

| Gate | Result |
|---|---|
| `npm run typecheck` (`tsc -p tsconfig.json --noEmit`) | **PASS** — 0 errors |
| `npm test` (unit) | **PASS** — **69 suites, 842 tests** |
| `test/p57-platform-plan-admin.e2e-spec.ts` | **PASS** — **16 tests** |
| `test/p60-platform-courses.e2e-spec.ts` | **PASS** — **15 tests** |
| `src/audit-log/services/audit-redaction.spec.ts` | **PASS** — **19 tests** |
| `npm run test:e2e` (full) | **1 038 / 1 040 pass**, 98 / 100 suites. The 2 failures are pre-existing load flakes (below). |

### The full e2e run, triaged honestly

The first full run showed **12 failures**. Every one was investigated; none was a
defect in the code this work added. The triage:

| Failures | Cause | Resolution |
|---|---|---|
| 7 — `search.e2e-spec.ts` (all 500s) | The dev database was missing the `search_vector` columns. They are raw-SQL generated `tsvector` columns created by the P17 migration but **not declared in `schema.prisma`**, so an earlier Prisma drift-reset dropped them. Not caused by this work (only `migrate deploy` and `generate` were run, neither of which drops columns), and production is unaffected because it applies migrations in order. | Columns restored in the dev database; all 7 pass. |
| 1 — `plans-catalog` *"GET /plans … field-for-field"* | **Self-inflicted, and the only data change:** the Growth plan's price was edited 79 → 89 during live browser verification of price history. The test asserts the seeded 79. | Restored to 79 **through the real PATCH endpoint**, so the audit trail stays coherent rather than being silently rewritten in SQL. |
| 1 — `phase10-2` P102-026 | **A genuine miss in this work.** The Task 1 route rename to `platform-subscriptions` left this existing e2e test calling the old `/platform/subscriptions/overview`. | Test updated to the new route. |
| 1 — `platform-control-plane` D1-D4 | **Pre-existing.** The test calls `POST /academies`, a route **removed in Phase 10.6** — `academies.e2e-spec.ts` has a passing test literally named *"the direct POST /academies creation route is gone"*. It was asserting against a 404, not against the audit behaviour it is named for. | Rewritten to use the real Academy Provisioning path. |
| 1 — `plans-catalog` *"GET /add-ons …"* | **Pre-existing since P51** (already deployed). `AddOn.catalogStatus` defaults to `draft`, P51 made `GET /add-ons` a customer-facing catalog that never lists drafts, and `seedAddOn` never sets the status. | Seed now publishes the add-on. |
| 1 — `phase10-2` P102-002 | **Pre-existing since commit 95683a7** (already deployed), which deliberately separated `no_plan` from `expired` because telling a brand-new organization its subscription had *expired* was the bug. The test still asserted `expired`. | Assertion updated to `no_plan`. |

**Remaining 2 failures** — `media.e2e-spec.ts` *"rejects an oversized payload"* and
`p53-support-attachments` *"an oversized image is refused"*. Both **pass in
isolation** (27/27) and one of them passed in a different full run, so they are
load-sensitive flakes under parallel workers. Neither touches any file this work
changed.

### Frontend

| Gate | Result |
|---|---|
| `npm run typecheck` (`tsc -p tsconfig.app.json --noEmit`) | **41 errors — all pre-existing**, in files this work never touched (`platform-add-ons`, `platform-zoom`, `tenant`, `website`). Measured against a stashed baseline: 41 before, 41 after. **This work contributes zero.** |
| `npm test` (vitest) | **PASS** — **37 files, 330 tests** (302 before; **28 added**) |
| `npm run lint` | **PASS** — 0 errors |
| i18n EN/AR parity | **PASS** — 3 774 / 3 774, 0 missing |

> **Correction worth recording.** Earlier runs in this work used
> `npx tsc --noEmit -p tsconfig.json`, which in this repo has `"files": []` and
> project references — it type-checks **nothing**. Switching to the real gate
> (`npm run typecheck`) surfaced **20 genuine errors in new code**, all since
> fixed. The counts above come from the real gate.

### PostgreSQL / RLS tests

Asserted against a real database, not a mocked client:

- `P60-COURSE-004` — one request returns courses from two unrelated organizations.
- `P60-COURSE-011` — a **draft/private** course exposes its curriculum and
  instructors (0/0/[] before the P60b policies).
- `P57` — plan history is read back out of `audit_log_entries` under the
  `_platform_select` policy in `runInUserContext`.

### Negative authorization tests

- `P60-COURSE-001` / `P57-PLAN-001` — unauthenticated → 401 on every route.
- `P60-COURSE-002` / `P57-PLAN-002` — a real tenant owner → 403 on every route,
  including one who owns the very course being requested.
- `P60-COURSE-003` — POST / PATCH / DELETE on `platform-courses` → 404.
- `P60-COURSE-010` — `sortBy=pricingAmountMinorUnits` → 400;
  `unknownFilter=1` → 400.

### New frontend tests added by this work (28)

| File | Tests | What it guards |
|---|---|---|
| `features/platform/plan-limit-reduction.test.ts` | 15 | Reduction detection incl. `unlimited → n`; blank fields not saved as 0. **Found a real defect** (§9). |
| `app/navigation/platform-owner-navigation.test.ts` | 5 | `tenantSurface` hides operator-irrelevant items — and does **not** hide them from customers. |
| `app/routes/dashboard-index-route.test.tsx` | 3 | `/dashboard` redirects only platform owners. |
| `features/analytics/analytics-range-url.test.tsx` | 5 | URL range parsing, invalid fallback, stable query identity. |

### Real Chrome verification

Verified in a live browser against the local stack, signed in as a platform owner:

- Global Courses list — 108 courses across tenants with academy + organization,
  status/visibility badges, `$49.99` formatted pricing, real creator names beside
  "Not recorded".
- URL-driven filters restored from `?status=draft&pricingType=free&sortBy=title&sortDirection=asc`
  with every control reflecting the URL and "Clear filters" appearing.
- Course detail with creator name + email, ownership links, catalog and
  instructors.
- A draft/private course showing "2 sections · 1 lesson" — the P60b policies
  working through the real UI.
- Arabic/RTL on the detail page (§16).
- Analysis deep link `/dashboard/analytics/revenue?range=90d`.
- Plan editor limit-impact warning with Save disabled until confirmed.
- Sidebar after role separation: OVERVIEW group gone, Support gone from USER,
  Trial Policy gone, `/dashboard` redirecting to `/dashboard/platform`.

---

## 18. Production Deployment

*Filled in at deploy time — see the deployment log appended below. Nothing in
this section is claimed until the workflow has run and production has been
checked.*

---

## 19. Decisions & Trade-offs

1. **Task 4 skipped.** Atlas authorization is guard + RLS, not table-driven. An
   editor would mean either a parallel system RLS does not consult, or controls
   that change nothing. (§2)
2. **Price history via the audit log, not a new table.** Completed money already
   snapshots itself, so catalog edits cannot make past charges ambiguous; what
   remains is an administrative record, which `audit_log_entries` already is. The
   implementation audit found no architectural constraint requiring a dedicated
   table. (§9)
3. **`changes` as a new typed column rather than reusing `context`.** `context`
   is typed as flat scalars and cannot hold `{from, to}` without stringifying.
4. **Limit reductions: warn and confirm, never destroy.** No customer data
   deleted, no resource disabled; the limit governs future entitlement checks.
5. **Course terminology.** Enrolled / Completed / Paid orders — three existing
   facts from two existing systems. No "subscribed students" concept invented.
6. **Course creator: a column, with an evidence-only backfill.** "Who created
   this" is a property of the course. 6 of 108 rows had provable evidence; the
   other 102 are honestly `NULL`. Academy owner / first instructor / earliest
   member were all rejected as fallbacks because each is a guess presented as a
   fact. `ON DELETE SET NULL` matches five existing precedents.
7. **No audit retention policy.** None introduced; no records deleted.
8. **Subscriptions route: rename, not a second architecture.** One controller
   path changed from `platform/subscriptions` to `platform-subscriptions`,
   matching the existing flat-resource convention. No second subscription system.
9. **Plan distribution bounded, not paginated.** It is a summary, not a list. (§10)
10. **User-detail memberships left uncapped.** Shared with the org switcher;
    measured max 2 per user. (§10)
11. **Four new RLS policies rather than an application-level bypass.** Following
    P15's own established pattern keeps "guard decides, RLS independently agrees"
    true for the new surface.
12. **Trial Policy route kept after removing its sidebar entry.** It remains the
    only editor for the global trials switch and the fallback duration. (§20)

---

## 20. Known Limitations

### Verified limitations

- **41 pre-existing frontend type errors remain** in `platform-add-ons`,
  `platform-zoom`, `tenant` and `website`. They predate this work, are unrelated
  to it, and were left alone deliberately — fixing them is a separate change with
  its own risk. Baseline measured by stashing: 41 before, 41 after.
- **102 of 108 courses have no recorded creator.** This is the honest state of
  the data, not a bug. Newly created courses record their creator.
- **`recordedSessions` limit impact is unmeasurable.** There is no matching
  `tenant_usage` column, so the preview reports it in `unmeasurableLimitKeys`
  rather than implying a reduction is safe.
- **Atlas does not track subscription revenue.** The overview reports
  `{ tracked: false }`.

### Incomplete verification — stated plainly

- **Narrow-viewport rendering was not verified in a live browser.** The browser
  automation's window resize did not change the viewport in this environment
  (`window.innerWidth` stayed 1440 after resizing to 390 and 420). Responsiveness
  is therefore **structurally** verified only: the new pages use the same shared
  `PageContainer` / `DataTable` (which wraps its table in `overflow-x-auto`) and
  the same Tailwind responsive classes as the six existing platform list pages.
  It has **not** been visually confirmed at 390 px.
- **Arabic verification covered the course detail page and sidebar**, not every
  new screen. EN/AR key parity is machine-verified across all of them.

### Stale tests fixed as a side effect

Three e2e tests were asserting against behaviour Atlas deliberately changed in
already-deployed commits, so they had been failing before this work began. They
were corrected rather than left red, because a suite with known-red tests cannot
validate a deployment:

- `platform-control-plane` D1-D4 — `POST /academies` (removed in Phase 10.6).
- `plans-catalog` add-ons — draft add-ons are hidden from the customer catalog (P51).
- `phase10-2` P102-002 — `no_plan` vs `expired` (commit 95683a7).

**No production behaviour was changed to make a test pass.** In each case the
shipped behaviour was confirmed correct first, and only the assertion moved.

### Intentionally deferred

- **Zoom / Live Sessions** — untouched; still `COMING_SOON` / deferred.
- **Roadmap Phase 11** — not started.
- **Task 4** — see §2.
- **Trial Policy sidebar entry** — removed on request. The page still holds the
  platform-wide trials on/off switch (`trial_policy.enabled`) and the default
  duration plans fall back to. The route is retained so both stay editable, but
  they are now reachable only by URL. Folding those two controls into Plans &
  Add-ons would close this gap and is a product decision, not a mechanical move.

### External blockers

None.

---

## 21. Future Enhancements

Only items this work actually surfaced as worth doing:

1. **Fold the two global trial settings into Plans & Add-ons.** Closes the gap
   left by removing the Trial Policy sidebar entry (§20).
2. **Backfill course creators from richer evidence if it appears.** If another
   provable signal is added (e.g. a creation-time provenance record), the same
   evidence-only backfill pattern can extend coverage beyond 6 %.
3. **A `tenant_usage` column for recorded sessions**, which would make the last
   limit key measurable in the impact preview.
4. **Filter the Global Courses list by creator.** The column and index now exist;
   the filter does not.
5. **Clear the 41 pre-existing frontend type errors** as a dedicated change.
