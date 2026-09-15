# Live Sessions — Frontend Status & Handoff

**State: IMPLEMENTED → VERIFIED → DEFERRED (Coming Soon) → WAITING FOR ZOOM.**
The customer-facing Live Sessions UI is built but intentionally not launched.
The pending items are EXTERNAL Zoom approvals, not frontend defects.

## 1. Purpose
Live Sessions is fully implemented on the frontend, but its customer launch is
deferred. This documents what exists, what was verified, and exactly how to
re-enable it.

## 2. Current product state
- Visible in the Add-ons Store as **Coming Soon**.
- **Not installable / not purchasable** (no Install/Purchase action).
- **Not a customer-active feature** — never shown in "Active add-ons".
- **Customer Live Sessions navigation hidden** (feature flag off).
- Student UI, instructor UI, and academy/customer Live Sessions surfaces are
  not reachable through normal navigation.
- The Platform Owner **Zoom Operations Center** is a separate, platform-owner
  area and remains fully active (it monitors, it is not a customer surface).

## 3. Frontend implementation completed (actual, in-repo)
- **Add-ons Store integration** — `features/live-sessions/pages/AddOnsCatalogPage.tsx`
  (install/enable/disable/uninstall lifecycle UX) and the tenant billing view
  `features/tenant/pages/TenantAddOnsPage.tsx` (active + available + purchase).
- **Live Sessions routes/pages** — overview, sessions list, recordings,
  connection (`features/live-sessions/pages/*`), student experience
  (`StudentLiveSessionPage`), embedded Meeting SDK (`ZoomMeetingEmbed.tsx`).
- **Course curriculum integration**, attendance UI, recordings UI,
  notifications strings, Zoom connection UI (owner-only OAuth flow).
- **Platform Owner Zoom Operations Center frontend** — `features/platform-zoom/*`
  (9 pages) — active, platform-owner only.
- **Localization** EN/AR with RTL; responsive via shared `PageContainer`/`Card`.

## 4. Frontend verification completed (actual results)
- Component tests: **66 pass** across `live-sessions`, `platform-zoom`,
  `tenant` (`vitest run`).
- Typecheck / lint / production build: clean.
- Real Chrome (dev DB, tenant org-owner `sarah.chen@acme-academy.dev`):
  - `/dashboard/add-ons` — Live Sessions shows **Coming soon** + note, **no
    Install**; other add-ons keep normal Install/Disable/Uninstall.
  - `/dashboard/tenant/add-ons` — Live Sessions appears only under **Available**
    as **Coming soon — not yet available for purchase**; it is NOT in "Active
    add-ons" even though the test org held an installed row.
  - Customer Live Sessions **nav entry hidden**.
  - **Arabic/RTL**: "قريباً" badge + Arabic note, mirrored layout, no raw i18n
    keys; English restores cleanly.
  - **Responsive** 390 mobile: single-column cards, hamburger nav, no
    page-level horizontal overflow. (768/1440 use the same primitives verified
    in the Zoom Ops Center QA.)
  - **No feature-caused console errors** on fresh load.
- Backend boundary confirmed live: install/enable → 403; status endpoint
  `addOn.usable=false, reason="coming_soon"`.

## 5. Deferred / remaining frontend work
- **Already implemented:** everything in §3, plus the Coming Soon presentation.
- **Waiting for Zoom:** nothing code-side; external approvals gate the launch.
- **Required before customer launch:** flip the flag (see §8), then re-run the
  post-approval verification (real OAuth connect UI, real embedded student
  join, attendance/recording UIs against real data).
- **Optional future:** student-Zoom-OAuth fallback UI *only if* the Anonymous
  Join Exception is refused (fallback documented in `ATLAS_HANDOVER.md` §15c);
  fix the pre-existing `AddOnEffectSummary` rendering of the live-sessions
  effect key ("Unlocks common.features.liveSessions") — cosmetic, pre-existing,
  out of this task's scope.

## 6. Zoom dependencies (no approval claimed)
- **Anonymous Join Exception:** PENDING Zoom review.
- **Domain validation** (`atlass.dpdns.org`): PENDING (manual forum request).
- **Marketplace review/publication:** PENDING as applicable.

## 7. Launch checklist
- [ ] Domain validation approved
- [ ] Anonymous Join decision resolved (exception approved, or fallback chosen)
- [ ] Production Zoom configuration confirmed
- [ ] Real OAuth connect succeeds (customer's own Zoom)
- [ ] Real meeting provisioning
- [ ] Real embedded student join
- [ ] Real webhook delivery
- [ ] Real attendance reconciliation
- [ ] Real recording import (if applicable)
- [ ] Quota verification
- [ ] EN/AR verification
- [ ] Mobile/responsive verification (390/768/1440)
- [ ] Security verification
- [ ] Customer installation verification (install/enable/purchase succeed)
- [ ] Production smoke test
- [ ] Final launch approval

## 8. Re-enable instructions (where the Coming Soon state is controlled)
As of P51 the customer-facing "Coming Soon" state is **backend-authoritative
and database-driven** — `add_ons.catalog_status` for `live-sessions` is
`coming_soon`. The old frontend/backend deferral constants
(`src/config/deferred-add-ons.ts`,
`atlas-backend/src/live-sessions/constants/deferred-add-ons.constants.ts`)
were **removed**; the store now reads `comingSoon`/`catalogStatus` straight
from the API. No secrets are involved.

1. **Publish the add-on** — set `live-sessions` to `published` from the
   SaaS Owner **Add-ons Management** page (`/dashboard/platform/add-ons`),
   or directly set `add_ons.catalog_status = 'published'`. This is the single
   authoritative switch: the store immediately shows normal Install/Purchase
   and the backend permits install/enable/purchase/use for entitled tenants.
2. **Frontend feature flag (optional nav)** — `src/config/feature-flags.config.ts`:
   set `liveSessions: true` to restore the customer Live Sessions navigation
   entry (gated on `featureFlag: 'liveSessions'`). This is independent of the
   catalog state and does not gate access.

After publishing (and, if desired, restoring the nav) and deploying, work the
Launch checklist (§7). To disable again, set the catalog status back to
`coming_soon` (or `draft`) — see `SAAS_OWNER_ADD_ONS_MANAGEMENT.md`.
