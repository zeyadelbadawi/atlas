# Atlas — SaaS Owner Add-ons Management

Platform/SaaS-Owner control surface for the **customer-store publication
state** of every add-on. This document describes the **implemented**
system (P51).

## 1. What this is for

A single place for an Atlas **platform operator** (not an academy owner) to
decide, per add-on, whether customers can **see** it in the store and
whether they can **install** it. Every registered add-on has one
authoritative catalog publication state:

| State | In the customer store? | Installable? |
|---|---|---|
| `draft` | No — hidden entirely | No |
| `coming_soon` | Yes — shown with a "Coming Soon" badge | No |
| `published` | Yes — shown normally | Yes, under the existing entitlement/access rules |

**This is deliberately distinct from a tenant's install/enable/entitlement
state.** Publishing an add-on exposes it in the store; it never installs or
enables it for any academy. The Install Count and Enabled Count columns
only *report* on the per-academy `tenant_add_ons` state — they are never
driven from this page.

It is **not** the academy-facing Add-ons Store
(`/dashboard/tenant/add-ons`, `/dashboard/add-ons`), where an academy owner
installs and enables add-ons for their own organization.

## 2. Who can see it

Platform Owners only. The route is guarded by `RouteGuard` with
`requiredRoles={['platform_owner']}`; the API by
`JwtAuthGuard + PlatformOwnerGuard`; the cross-tenant count aggregation
runs inside a platform-owner RLS context (`tenant_add_ons_platform_select`,
P50). A non-owner is refused at all three layers — an anonymous caller gets
`401`, a tenant user `403`. Hiding the menu is only a courtesy.

## 3. Navigation and route

A single entry in the existing Platform sidebar section (reusing the
existing `NavigationItem` pattern — no new navigation system):

| Page | Route |
|---|---|
| Add-ons Management | `/dashboard/platform/add-ons` |

## 4. The page

`atlas-front/src/features/platform-add-ons/pages/PlatformAddOnsPage.tsx`.
Reuses the existing Platform table/search/filter/pagination primitives
(the same ones the Zoom Operations Center uses).

Columns: **Add-on · Description · Catalog Status · Installs · Enabled ·
Updated · Actions**.

- **Search** (server-side, over name/key/description) and a **status
  filter** (`All / Draft / Coming Soon / Published`) both send their state
  to the server; changing either resets to page 1.
- **Actions** is a per-row status selector. Choosing a different state opens
  a **confirmation dialog** (`ChangeCatalogStatusDialog`) that states the
  exact customer impact of the target state before anything is sent, and
  can be cancelled. Nothing is written until the operator confirms.
- A success toast confirms the change; the list refetches so the new state
  and `Updated` timestamp are immediately visible.

## 5. Backend

- **Entity.** `add_ons.catalog_status` (`draft | coming_soon | published`,
  the `add_on_catalog_status` enum) plus `add_ons.version` (optimistic
  concurrency). Migration
  `20260929000000_p51_add_on_catalog_status`. This is the single source of
  truth — there is no second registry and no frontend constant.
- **API** (`platform-add-ons`, `PlatformOwnerGuard`):
  - `GET /platform-add-ons` — every registered add-on (auto-included from
    the existing catalog, no hardcoded list) with its status, both counts,
    version and `updatedAt`; server-side search, status filter, pagination.
  - `PATCH /platform-add-ons/:key/status` — body
    `{ catalogStatus, expectedVersion }`. Validated; version-guarded (a
    stale version is refused with `409 stale_resource_version`, reusing the
    repo-wide `StaleResourceVersionException`); writes one
    `add_on.catalog_status_changed` audit entry in the same transaction
    (actor, add-on, previous state, new state — no secrets).
- **Enforcement of the catalog state** (all backend-authoritative):
  - Customer catalog reads omit `draft` and annotate `coming_soon`:
    `GET /add-ons` (`plans.service`) and
    `GET academies/:id/add-ons/catalog` (`add-ons-lifecycle.controller`).
  - Install / enable are refused unless `published`
    (`add-ons-lifecycle.controller`); the purchase path is refused unless
    `published` at checkout creation (`checkout.service`) and again,
    defence-in-depth, before activation (`payment-application.service`).
  - `AddOnAccessService.describe` reports `coming_soon` (not usable) for any
    non-published add-on, so every access choke point agrees.

## 6. Default state (preserved by evidence)

The migration and the dev seed set the same defaults so existing behaviour
is preserved:

- **Live Sessions → `coming_soon`.** It remains implemented but unlaunched;
  it is never auto-published.
- **All other add-ons (`extra-academy`, `advanced-analytics`) →
  `published`,** matching their pre-P51 store behaviour.
- **New add-ons default to `draft`** (schema default), so a newly
  registered add-on is invisible until a Platform Owner publishes it.

## 7. Tests

- Backend: `test/platform-add-ons-management.e2e-spec.ts` (service, real
  Postgres/RLS: auto-include, counts, default preservation, search, filter,
  pagination, version bump, stale-version 409, audit, RLS isolation),
  `test/platform-add-ons-http.e2e-spec.ts` (401/403/200, validation,
  publish round-trip + stale 409),
  `src/platform/controllers/platform-add-ons.controller.spec.ts`,
  `src/platform/dto/update-add-on-catalog-status.dto.spec.ts`,
  `src/live-sessions/controllers/add-ons-lifecycle.catalog-status.spec.ts`
  (install/enable refused for coming_soon/draft; uninstall still allowed).
- Frontend: `src/features/platform-add-ons/platform-add-ons.test.tsx`,
  `src/features/platform-add-ons/ChangeCatalogStatusDialog.test.tsx`
  (render, counts, Live Sessions stays Coming Soon, impact copy per target,
  confirm/cancel, Arabic).

## 8. Verified in a real browser

Platform Owner at `/dashboard/platform/add-ons`, EN and AR (RTL), at 1440 /
768 / 390: the table, search, status filter and per-row selector render;
the confirmation dialog states the correct customer impact per target;
a real Published→Draft change persists (toast + `Updated` bump) and the
customer `GET /add-ons` then hides the draft, keeps the `coming_soon` flag,
and lists published normally; Live Sessions was confirmed to stay
`coming_soon` throughout.
