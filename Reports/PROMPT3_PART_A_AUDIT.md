# Project Summary
Atlas is a bilingual Arabic/English education single-page app built around security- and privacy-first, org-scoped learning workflows. It prevents cross-organization leakage using deterministic provider composition, fail-closed authentication/authorization guards, and strict org-scoped separation of identity/session state from server/query state. As part of the platform owner experience, Atlas provides authenticated, role-gated navigation to administrative screens (dashboard, platform settings, notifications, billing, analytics) plus a global search entry for quickly finding platform destinations. The new work adds an Academy Management surface within the same authenticated product flow, enabling orgs to create and administer independent academies (overview, members, profile, settings, and branding).

# Project Module Description
## App startup & prerender compatibility
- Conditionally hydrates/blocks React mounting over prerendered HTML using a prerender marker.
- Ensures runtime environment/config is loaded where applicable.

## Provider composition (deterministic order)
- Fixed provider sequence ensures Identity is available before any query/data access:
  - ErrorBoundary, Theme, Localization (RTL at document root), Identity, Platform, Toast, Query, Dialog, Loading, Tooltip.

## Identity (session/auth source of truth)
- Restores session and proactively refreshes tokens.
- Refresh only synchronizes token metadata (user/org context remains unchanged).
- Organization switching persists active org and broadcasts it so Platform can update org-scoped state.

## Platform state (active org & feature flags)
- Manages active organization persistence, feature flags, and user UI preferences.
- On org switch, invalidates the org-scoped React Query cache via a shared global QueryClient.

## Authorization & route guards (security boundary)
- RouteGuard enforces fail-closed authentication and role/permission requirements.
- Navigation filtering aligns with the same authorization boundary.

## HTTP / API pipeline (token refresh)
- Centralized axios-based HttpClient with auth/correlation headers.
- 401-triggered token refresh with refresh-request deduplication for concurrent requests.
- Normalized API errors (ApiError / NormalizedApiError) for consistent UI handling.

## Query infrastructure (org-scoped isolation)
- A single global QueryClient singleton is created in the query layer and shared across providers.
- Organization switching invalidates the shared cache to prevent cross-org leakage.

## Shared forms & behaviors
- useServerValidation: maps backend validation violations into react-hook-form errors.
- useUnsavedChanges: blocks navigation for dirty forms via dialog integration.
- useFileUpload: upload progress/cancellation and robust cleanup.

## Shared hooks foundation
- Identity: useAuth, useCurrentUser, useSession, usePermissions, useRoles, useSignIn, useSignOut
- Platform: usePlatform, useFeatureFlag
- Data: useApiQuery, useApiMutation, useInvalidate
- Upload/search: useFilePicker, useFileUpload, useSearch

## Localization
- i18next with namespaced bilingual bundles; RTL applied at the document root.
- Language switching persists/restores supported languages.

## Platform core UI modules (Platform Owner surface)
- PlatformDashboardPage: dashboard overview scaffolding (metrics + activity).
- SettingsPage: tabbed platform settings (general, notifications, security).
- NotificationsPage: notifications center scaffolding (tabs, empty/loading/error).
- BillingPage: billing overview scaffolding (plan/history placeholders).
- AnalyticsPage: analytics scaffolding (tabs and chart placeholders).
- Navigation wiring updated so these screens are reachable within the authenticated/authorized product surface.

## Search experience (generic global search)
- SearchPage provides the global search entry point and manages query lifecycle (debounce, min-length gating).
- SearchBar supports keyboard focus shortcut (Cmd/Ctrl+K) and accessible input labeling.
- SearchResults renders loading, error (with retry), empty, and grouped result states.
- Result navigation supports keyboard selection (↑/↓), activation (Enter), and reset/close behavior (Escape), plus clickable result items.

## Academy Management module (new)
- Academy feature pages are routed inside the authenticated product surface and use the existing shared patterns:
  - Dashboard: AcademyDashboardPage shows academy overview, metrics, and recent activity with an AcademySwitcher (query-param based).
  - Create: AcademyCreatePage provides guided academy creation with Zod + react-hook-form validation.
  - Profile: AcademyProfilePage edits core academy fields and address/localization settings.
  - Settings: AcademySettingsPage updates general settings including status, localization, contact info.
  - Branding: AcademyBrandingPage manages logo/favicon upload with client-side preview and submit mutation.
  - Members: AcademyMembersPage lists academy members with search + role filter and renders a status/role badge view.
- Academy data access is consolidated in AcademyService and consumed through dedicated TanStack Query hooks (queries + mutations), using the shared invalidation utilities to refresh org-scoped data.
- Academy nav integration is capability-aware and bilingual via the new academy namespace resources and updated navigation typing.

# Directory Tree
- app/frontend/.mgx/
  - mgx tooling configuration
- app/frontend/src/
  - app/
    - providers, routes, layouts, navigation config, router
    - design-system/
    - features/
      - auth/
      - profile/
      - platform/
      - settings/
      - notifications/
      - billing/
      - analytics/
      - search/
      - academy/ (new)
        - components/ (AcademySwitcher)
        - constants/
        - hooks/
        - pages/
        - schemas/
        - services/
        - index.ts
    - shared/
    - services/
      - api/ (axios client + API error normalization)
      - identity/
      - query/
      - index.ts
    - localization/
      - i18n bootstrap, resources, utilities
    - config/
    - constants/
    - routes/
    - pages/
    - types/
    - lib/
- app/frontend/prerender/
  - blog route prerender support and generators
- app/frontend/public/
  - static assets
- app/frontend/uploads/
  - documentation inputs for prompts/briefs

# File Description Inventory
## Academy Management (new)
- app/frontend/src/features/academy/components/AcademySwitcher.tsx: Switches active academy context using a query parameter while preserving the rest of the dashboard route.
- app/frontend/src/features/academy/constants/academy.constants.ts: Academy domain defaults, option lists, and file upload constraints.
- app/frontend/src/features/academy/hooks/*:
  - useAcademies.ts: Fetches academies for the active organization (paginated result wrapper).
  - useAcademy.ts: Fetches a single academy by id.
  - useCreateAcademy.ts: Creates an academy and invalidates relevant queries.
  - useUpdateAcademy.ts: Updates academy core profile and invalidates caches.
  - useUpdateAcademyBranding.ts: Updates logo/favicon branding and invalidates caches.
  - useAcademyMembers.ts: Fetches members for an academy (collection query).
  - useAcademyStats.ts: Fetches academy metrics.
  - useAcademyActivity.ts: Fetches academy activity feed (collection query).
- app/frontend/src/features/academy/pages/*:
  - AcademyDashboardPage.tsx: Overview + metrics + recent activity + quick actions.
  - AcademyCreatePage.tsx: Creation form with validation and submit feedback.
  - AcademyProfilePage.tsx: Multi-section editor for profile/address/localization fields.
  - AcademySettingsPage.tsx: Status + localization + contact/settings editor.
  - AcademyBrandingPage.tsx: Logo/favicon upload, preview, and submit mutation.
  - AcademyMembersPage.tsx: Members listing with search and role filter and badge rendering.
- app/frontend/src/features/academy/schemas/academy.schemas.ts: Zod schemas for create/profile/settings/branding validation and derived form data types.
- app/frontend/src/features/academy/services/AcademyService.ts: AcademyService wrapping API interactions via the existing BaseService abstraction.
- app/frontend/src/features/academy/index.ts: Feature entry point exports.

## Routing + navigation + localization integration
- app/frontend/src/app/routes/AppRouter.tsx: Wired Academy routes into the authenticated product surface using lazy-loaded route elements.
- app/frontend/src/app/routes/route-paths.ts: Centralized academy-related route constants used by pages and navigation.
- app/frontend/src/app/navigation/navigation.config.ts: Added academy navigation entries (and updated destination wiring).
- app/frontend/src/localization/resources/en/academy.json: Bilingual academy UI strings under the academy namespace (EN).
- app/frontend/src/localization/resources/ar/academy.json: Bilingual academy UI strings under the academy namespace (AR).
- app/frontend/src/localization/resources/en/navigation.json: Included academy section strings/labels for nav items.
- app/frontend/src/localization/resources/ar/navigation.json: Included academy section strings/labels for nav items.
- app/frontend/src/localization/resources/index.ts: Registers academy namespace resources.
- app/frontend/src/types/localization.types.ts: Adds academy namespace typing to localization registry.
- app/frontend/src/types/navigation.types.ts: Updates navigation typing to support capability requirements on nav items.
- app/frontend/src/types/index.ts: Re-exports academy types and updates type barrel.

## Types
- app/frontend/src/types/academy.types.ts: Academy domain model types (Academy, members, stats, activity, onboarding-related types).

# Technology Stack
- React + TypeScript (Vite)
- Tailwind CSS (token-driven styling via CSS custom properties)
- shadcn/ui (Radix primitives)
- Framer Motion
- react-router-dom (lazy routes + guards)
- TanStack Query (server state)
- react-hook-form + Zod
- i18next + react-i18next (namespaced bilingual bundles; RTL via dir)
- axios (centralized transport)
- lucide-react icons

# Usage
## Install / typecheck / lint / build
- From app/frontend/:
  - npm run typecheck
  - npm run lint
  - npm run build

## Prerender compatibility
- Ensure blog prerendered routes include the meta marker prerender-static-page=blog so main.tsx does not mount React over prerendered HTML.
