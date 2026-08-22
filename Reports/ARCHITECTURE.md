---
last_updated: 2026-08-24T00:00:00Z
---

# Architecture Design

## System Overview

Atlas Platform Core - extending Prompt 1 & 2 foundation with user-facing interfaces
Layer architecture preserved: Component → Hook → Service → API Client → Backend abstraction
No duplicate infrastructure: reusing existing Identity, Query, Platform, Localization providers
Feature organization: Platform Core features under src/features/ following established patterns

## Tech Stack

Frontend: React 18 + TypeScript + Vite
UI: shadcn/ui + Tailwind CSS + Radix UI
Routing: React Router v6
State: TanStack Query + Context API
Forms: React Hook Form + Zod
i18n: react-i18next (English + Arabic, LTR + RTL)
Theme: next-themes (Light + Dark mode)
Icons: lucide-react
Charts: Recharts
Animation: Framer Motion

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Authentication | Sign in, registration, password reset UI | features/auth/pages/, features/auth/components/ |
| Profile | User profile view/edit | features/profile/pages/, features/profile/components/ |
| Platform Dashboard | Platform Owner overview with metrics | features/platform/pages/PlatformDashboardPage.tsx |
| Settings | Platform-level configuration | features/settings/pages/, features/settings/components/ |
| Notifications | Notification center and list | features/notifications/pages/, features/notifications/components/ |
| Billing | Subscription and invoice UI | features/billing/pages/, features/billing/components/ |
| Analytics | Platform metrics and charts | features/analytics/components/, shared/components/charts/ |
| Search | Global search experience | features/search/components/, shared/components/search/ |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Reuse Prompt 2 auth infrastructure | Use existing IdentityProvider, SessionService | No duplicate auth systems - foundation already exists |
| Backend-agnostic services | All new services extend BaseService | Backend integration deferred to future prompts |
| Feature-based organization | Place new features under src/features/ | Maintain established folder structure |
| Translation-first UI | All text via i18next keys | Bilingual requirement (EN/AR, LTR/RTL) |
| Shared component reuse | Extend existing PageContainer, MetricCard, etc. | Avoid duplication, maintain consistency |

## File Tree Plan

src/features/
  auth/
    pages/
      SignInPage.tsx
      RegistrationPage.tsx
      ForgotPasswordPage.tsx
      ResetPasswordPage.tsx
    components/
      SignInForm.tsx
      RegistrationForm.tsx
      PasswordResetForm.tsx
  profile/
    pages/
      ProfilePage.tsx
    components/
      ProfileHeader.tsx
      ProfileEditForm.tsx
      ProfileSections.tsx
  platform/
    pages/
      PlatformDashboardPage.tsx
    components/
      PlatformMetrics.tsx
      PlatformActivity.tsx
  settings/
    pages/
      SettingsPage.tsx
    components/
      SettingsSidebar.tsx
      GeneralSettings.tsx
      NotificationSettings.tsx
  notifications/
    pages/
      NotificationsPage.tsx
    components/
      NotificationCenter.tsx
      NotificationList.tsx
      NotificationItem.tsx
  billing/
    pages/
      BillingPage.tsx
    components/
      CurrentPlan.tsx
      InvoiceList.tsx
      BillingHistory.tsx
  analytics/
    components/
      AnalyticsCharts.tsx
      KPICards.tsx
      DateRangeFilter.tsx
  search/
    components/
      SearchBar.tsx
      SearchResults.tsx
      SearchResultItem.tsx

src/types/
  billing.types.ts
  notifications.types.ts
  analytics.types.ts
  profile.types.ts

src/localization/resources/
  en/
    profile.json
    settings.json
    notifications.json
    billing.json
    analytics.json
  ar/
    profile.json
    settings.json
    notifications.json
    billing.json
    analytics.json

## Implementation Guide

Phase 1: Foundation & Types
- Create new type definitions (billing, notifications, analytics, profile)
- Add translation keys for all new features (EN + AR)
- Update route paths registry

Phase 2: Authentication UI
- Create auth pages using existing SessionService, AuthenticationService
- Implement forms with react-hook-form + zod validation
- Add error handling via existing ApiError utilities

Phase 3: Profile & Settings
- Build profile page consuming existing CurrentUserService
- Create settings sections with form persistence
- Support theme and language preferences

Phase 4: Platform Owner Features
- Build Platform Dashboard with mock metrics
- Implement navigation extensions for role-based display
- Create billing UI (view-only, no real integration)

Phase 5: Notifications & Search
- Build notification center using existing notification infrastructure
- Implement search UI with keyboard navigation
- Add analytics charts using Recharts

Phase 6: Integration & Validation
- Wire all routes in AppRouter
- Test responsive design (mobile, tablet, desktop)
- Verify accessibility (keyboard nav, ARIA labels)
- Validate bilingual support (EN/AR, LTR/RTL)
- Ensure Light/Dark mode compatibility
- Run typecheck, lint, build validation

---

## Academy Management (Prompt 3 Part B)

Academy Management extends Platform Core without introducing any parallel
infrastructure: `AcademyService` extends `BaseService`; Academy queries use
the same `useApiQuery`/`useApiMutation`; the Academy sidebar section is
data appended to the existing `navigation.config.ts`, filtered by the same
`filterNavigationItems`/`RouteGuard`/`AuthorizationService` every other
module uses. `PlatformProvider` gained one field, `activeAcademyId`
(mirroring the existing `activeOrganizationId`), so the sidebar can resolve
academy-scoped nav links without a new global store. Academy query keys
embed the organization id so switching organizations can never surface
stale academy data. A 4-step client-side onboarding checklist (no backend
contract exists for onboarding state) guides a new academy through
Branding and Settings after creation.

## Course Management (Prompt 3 Part C)

Course Management is the final module of Prompt 3. It extends Academy
Management the same way Academy Management extended Platform Core: no new
API client, QueryClient, authorization system, organization/academy
context, upload system, form system, localization system, or table
implementation.

### Module Design
| Area | Responsibility | Key Files |
|------|-----------------|-----------|
| Domain types | Course, status/visibility/pricing, category, section, lesson, payloads | `src/types/course.types.ts` |
| Constants | Status/visibility/pricing options, field limits, thumbnail constraints | `src/features/course/constants/course.constants.ts` |
| Validation | Zod schemas for course/section/lesson create+update | `src/features/course/schemas/course.schemas.ts` |
| Service | `CourseService extends BaseService`, nested under `academies/:academyId/courses/...` | `src/features/course/services/CourseService.ts` |
| Query keys | `courseKeys` factory, every key embeds `academyId` | `src/services/query/query-keys.ts` |
| Hooks | 5 queries + 12 mutations (courses, categories, sections, lessons, publish/unpublish, reorder) | `src/features/course/hooks/` |
| Pages | List, Create, Edit, Builder, Settings | `src/features/course/pages/` |
| Components | Section/Lesson create-edit dialogs | `src/features/course/components/` |
| Utils | Status→tone mapping, pricing display formatting, move-item reordering | `src/features/course/utils/` |
| Localization | `course` namespace, EN/AR, 186/186 keys | `src/localization/resources/{en,ar}/course.json` |
| Routing | 5 routes nested under the existing academy path, each behind its own `RouteGuard` | `src/app/routes/route-paths.ts`, `AppRouter.tsx` |
| Navigation | "Courses" entry appended to the existing Academy sidebar section | `src/app/navigation/navigation.config.ts` |

### Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Nesting | Every course endpoint is nested under a specific academy (`academies/:academyId/courses/...`) | Mirrors `AcademyService`'s own existing sub-resource pattern (members/stats/activity/branding); avoids inventing a second multi-tenancy convention |
| Multi-tenancy | `courseKeys.*` embeds `academyId` in every query key | Switching academies produces different keys automatically; the previous academy's courses are simply unaddressed by the new keys, so no manual invalidation and no cross-academy leak is possible |
| Thumbnail upload | Reuses `useFilePicker` + real client-side validation against declared size/type constants; final value stays a base64 string through the existing PATCH contract | No "upload file, get URL" endpoint exists anywhere in the codebase (verified before building); inventing one would misrepresent a contract that isn't there |
| Curriculum reordering | Explicit move-up/move-down buttons, not drag-and-drop | No drag-and-drop library exists in the project; explicit buttons are real `<button>` elements — keyboard-accessible and RTL-safe with zero new dependencies |
| Authorization | New permission strings (`course.view`, `course.create`, `course.update`, `course.manage`, `course.configure`, ...) through the existing `requiredPermissions`/`RouteGuard`/`AuthorizationService` | Same mechanism as Academy's `academy.*` permissions; no second authorization system |
| Toasts | Course mutation hooks set `showSuccessToast: false, showErrorToast: false` | Pages already show their own contextual success/error toast and map validation errors to fields via `useServerValidation`; avoids the double-toast that existed before this pattern was adopted |

### Scope Boundary
Course Management stops at content authoring. Explicitly not implemented:
student learning/portal, enrollment, orders/checkout/payments, coupons,
subscriptions, certificates, website builder, CMS, media library. These
remain future modules; the domain types and service contracts were kept
abstract enough not to block them, but nothing here assumes their shape.

---

## Student Learning & Assessment (Prompt 4)

Prompt 4 is the student-facing consumption layer on top of Academy +
Course Management. It introduces no new API client, QueryClient,
authorization system, organization/academy context, upload system, form
system, localization system, or table implementation — every new resource
extends `BaseService`, every new hook wraps `useApiQuery`/`useApiMutation`,
every new route sits behind the existing `RouteGuard`.

### Two service trees over one Course

Course Management (Prompt 3C) nests every endpoint under a specific
academy: `academies/:academyId/courses/...`. Student Learning introduces a
second, flat tree rooted at `courses/:courseId/...` — `ProgressService`,
`QuizService` and `AssignmentService` all live there, because a student
reaches a course by id alone (learned from their own `Enrollment`, which
carries the course's `academyId`), never from an academy id in the URL.
Two role-specific API shapes over the same underlying course is a normal
REST pattern, not duplicate infrastructure — both trees are still plain
`BaseService` subclasses using the same `client`/`path()` mechanism.

The one genuinely new *shape* in this prompt is `CourseService.discoverCourses`
/ `discoverCourse` — a flat, cross-academy `courses` resource. It was added
because Course Management's owner-facing tree cannot express "list every
published course across every academy," which Student Course Discovery
needs and no other contract in the codebase provided.

### Module Design
| Area | Responsibility | Key Files |
|------|-----------------|-----------|
| Domain types | Enrollment, Progress (lesson/section/course + certificate status), Quiz/QuizQuestion/QuizAttempt, Assignment/AssignmentSubmission | `src/types/{enrollment,progress,quiz,assignment}.types.ts` |
| Services | `EnrollmentService` (flat `enrollments`, always the current user), `ProgressService`/`QuizService`/`AssignmentService` (flat `courses/:courseId/...`) | `src/features/learning/services/` |
| Query keys | `courseDiscoveryKeys`, `enrollmentKeys`, `progressKeys`, `quizKeys`, `assignmentKeys` — every key embeds the current student's id | `src/services/query/query-keys.ts` |
| Hooks | 8 queries + 7 mutations | `src/features/learning/hooks/` |
| Pages | Discovery, Course Details, Learn-redirect, Lesson, Quiz, Assignment | `src/features/learning/pages/` |
| Components | `LearningLayout` (responsive shell), `CurriculumNav` (sections/lessons tree with per-lesson status) | `src/features/learning/components/` |
| Localization | `learning` namespace, EN/AR, 121/121 keys | `src/localization/resources/{en,ar}/learning.json` |
| Routing | 7 routes under `/dashboard/learning/...`, each with its own `RouteGuard` | `route-paths.ts`, `AppRouter.tsx` |
| Navigation | New top-level "Learning" section (not nested under Academy) | `navigation.config.ts` |

### Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cross-student isolation | `studentId` is never an explicit parameter anywhere in a hook or service call — always read from `useAuth().user.id` internally | No code path can be constructed that addresses another student's enrollment/progress/attempt/submission |
| Cache isolation | Every Student Learning query key embeds the current student's id | Signing in as a different student in the same session can never surface the previous student's cached data, the same technique `academyKeys`/`courseKeys` use for organization/academy id |
| Quiz correctness | `QuizQuestionOption` has no correctness field at the type level | Guarantees answers can't leak to the client before submission — enforced structurally, not by convention |
| Quiz/assignment submission | Answers/response held in local form state; one mutation fires on final submit | No per-answer autosave contract is specified anywhere; scoring and grading stay entirely behind the service abstraction |
| Curriculum lock state | `LessonProgressStatus` is a value the (abstract) progress contract returns, never computed client-side | Same "the UI displays state, it never invents the rule" principle Course Management already established for publishing |
| Assignment attachments | Reuse `useFilePicker` + base64, same as Course thumbnails | No upload endpoint exists anywhere in the codebase (re-verified for this prompt) |
| Responsive curriculum nav | Desktop: persistent sidebar. Tablet/mobile: `Sheet` drawer via `useBreakpoint`/`useDisclosure` | The exact mechanism `DashboardLayout` already uses for its own navigation — no second responsive-navigation pattern |
| Navigation placement | New "Learning" section, not nested under the Academy sidebar section | A student's enrollments span academies; Academy's sidebar items are scoped to one active academy, which doesn't apply here |

### Scope Boundary
Explicitly not implemented in Prompt 4: instructor management/grading
dashboards, real certificate generation/PDF/verification, payments/
checkout/orders/subscriptions/coupons, website builder/CMS, marketplace,
messaging, live classes, video streaming infrastructure, discussion
forums, AI features, and any real backend. These remain future modules.

---

## Instructor / Teaching Operations + Communication & Knowledge Modules (Prompt 5)

Prompt 5 introduces no new API client, QueryClient, authorization system,
form system, upload system, localization system, or table implementation.
Every new resource extends `BaseService`; every new hook wraps
`useApiQuery`/`useApiMutation`; every new route sits behind the existing
`RouteGuard`, and every one of the 40 `RouteGuard` instances across the
whole router (verified by grep after this prompt) explicitly sets
`requireAuthentication`.

### Three service trees over one Course

Course Management (3C) nests every endpoint under a specific academy:
`academies/:academyId/courses/...`. Student Learning (4) introduced a flat
`courses/:courseId/...` tree for the student's own view. Prompt 5 adds a
*third* tree — `instructor/courses/:courseId/...` (`InstructorService`) —
because the authorization shape differs from both existing trees: an
instructor's teaching scope is resolved server-side from `Course.instructors`
(the pre-existing authorization anchor from 3C), never trusted from a
client-supplied id, and it is neither "I own this academy" (3C) nor "I am
enrolled in this course" (4). Three role-specific API shapes over one
shared Course entity is a normal REST/authorization pattern, not duplicate
infrastructure — all three are still plain `BaseService` subclasses using
the same `client`/`path()` mechanism.

Wherever an existing contract already covers the need — quiz/assignment
*definitions* (not results), course status/visibility tone helpers — the
Instructor pages call the unmodified `QuizService`/`AssignmentService`/
`course` utilities directly instead of re-declaring them. Only genuinely
instructor-scoped shapes (dashboard metrics, roster, cross-student
progress/attempts/submissions, grading) got new types and a new service.

### A pre-existing, unrelated static blog

The repository already has a static, unauthenticated, build-time Markdown
blog for the public marketing site (`src/pages/blog/`, `src/lib/blog.ts`,
`src/blog-routes.tsx`, wired outside `AppRouter`). Prompt 5's Knowledge
Blog is a different system: dynamic, permission-gated, dashboard-embedded,
backed by a real service contract (`BlogService`, resource `blog-posts`).
The two share a name and nothing else — documented explicitly here to
preempt an audit misreading them as duplicate infrastructure.

### Module Design
| Area | Responsibility | Key Files |
|------|-----------------|-----------|
| Instructor domain types | Dashboard metrics, teaching course summary, course overview, student roster/progress, grading types (`QuizAttemptSummary`/`AssignmentSubmissionReview` extend the existing student-facing `QuizAttempt`/`AssignmentSubmission`) | `src/types/instructor.types.ts` |
| Instructor service | `InstructorService extends BaseService`, flat `instructor/courses/:courseId/...` | `src/features/instructor/services/InstructorService.ts` |
| Instructor hooks/pages | 9 hooks, 9 pages (Dashboard, My Courses, Course Overview, Students, Student Progress, Assessments, Quiz Results, Submissions, Submission Review/Grading) | `src/features/instructor/` |
| Announcement domain | Platform/academy/course-scoped announcements; authoring is always course-scoped | `src/types/announcement.types.ts`, `src/features/announcements/` |
| Blog domain | Dynamic Knowledge Blog, distinct from the static marketing blog | `src/types/blog.types.ts`, `src/features/blog/` |
| Forum domain | One Forum per course; Thread/Reply nested under it | `src/types/forum.types.ts`, `src/features/forum/` |
| Query keys | `instructorKeys` (embeds instructor's user id), `announcementKeys` (embeds user id for feed/detail; `course` scoped by courseId alone), `blogKeys` (embeds user id), `forumKeys` (rooted in courseId alone — a forum's visibility is enforced server-side, not by cache scoping) | `src/services/query/query-keys.ts` |
| Localization | 4 new namespaces: `instructor` (111/111), `announcements` (43/43), `blog` (35/35), `forum` (28/28) keys, EN/AR parity verified programmatically; small additive keys in the pre-existing `navigation`/`learning` namespaces | `src/localization/resources/{en,ar}/{instructor,announcements,blog,forum}.json` |
| Routing | 26 new routes; Forum's thread-list/thread-detail pages are mounted, completely unmodified, under both the student (`/dashboard/learning/courses/:courseId/discussions...`) and instructor (`/dashboard/instructor/courses/:courseId/discussions...`) route trees | `route-paths.ts`, `AppRouter.tsx` |
| Navigation | New "Teaching" section (Dashboard, My Courses) and "Community" section (Announcements, Knowledge Blog); a "Discussions" entry point added to the existing Student Course Details page and the new Instructor Course Overview page, since Forum/Students/Assessments are course-scoped actions, not global nav items | `navigation.config.ts`, `StudentCourseDetailsPage.tsx`, `InstructorCourseOverviewPage.tsx` |

### Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Third service tree | `InstructorService` under a flat `instructor/courses/:courseId/...` path | Authorization scope (instructor-authorized) differs from both the academy-owner tree and the student-self tree, even though the Course entity is shared |
| Reuse over re-declaration | Instructor pages call the existing `QuizService.getQuizzes`/`AssignmentService.getAssignments` and `course` status/visibility utilities directly | Listing a quiz/assignment *definition*, or mapping a status to a tone, is not a role-specific contract — only cross-student *results* needed a new service |
| Grading permission separation | `instructor.submission.view` (route-level) vs. `instructor.assignment.grade` (page-level, gates the grading form itself) | Viewing a submission and being authorized to grade it are different capabilities; a viewer without grading rights sees a read-only notice instead of a non-functional form |
| No correctness leak (carried forward) | `QuizQuestionOption` still has no correctness field; the new `QuizAttemptSummary` only adds `studentName` | The Prompt 4 guarantee is structural, not conventional, and nothing in Prompt 5 weakens it |
| Forum as one service | Single `ForumService` for Forum/Thread/Reply | The domain is too small to fragment across three files/services without fragmenting one course's conversation |
| Forum pages shared across roles | The exact same `CourseForumPage`/`ForumThreadPage` components are mounted at both the student and instructor routes | The page is role-agnostic; create/moderate actions are gated inline via `usePermissions().hasPermission(...)`, and the backend enforces the rest — building two near-identical page components would be the actual duplication |
| Blog distinct from the static blog | New `BlogService`/`BlogPost` domain, explicitly documented as unrelated to `src/lib/blog.ts` | The existing blog is a build-time, unauthenticated SEO surface; Knowledge Blog is dynamic, permission-gated, and dashboard-embedded — conflating them would have been the actual architectural error |
| Featured image / attachments | `useFilePicker` + base64, same pattern as Course thumbnails and Academy branding | No "upload file, get URL" endpoint exists anywhere in the codebase (re-verified for this prompt) |
| Nav placement for course-scoped features | Students/Assessments/Submissions/Discussions are reached via in-page quick links (Course Overview, Course Details), not global sidebar items | These pages all require a specific `courseId`; there is no "active teaching course" global state (unlike `activeAcademyId`), and inventing one just to add more sidebar entries would be over-engineering beyond what any workflow needs |

### Scope Boundary
Explicitly not implemented in Prompt 5: real grading algorithms or
auto-grading (the frontend only forwards the score/feedback an instructor
enters), payments/checkout/subscriptions, live classes/video streaming,
AI features, a rich-text editor (Blog `content` is authored as plain text
by design — the type comment notes a future editor can replace this
without changing the contract), and any real backend. These remain future
modules.

---

## Atlas SaaS Foundation, Tenancy, Subscriptions, Plans, Entitlements, Usage & Platform Admin (Prompt 6)

This prompt turns Atlas from a single-tenant-shaped education app into the
frontend foundation for a real multi-tenant SaaS product. It resumed a
session that was interrupted mid-build; the recovery audit (see
`Reports/PROGRESS.md`) confirmed the foundation layer already in the
repository — every domain type, the entitlement/subscription-status utils,
both services, and the query-key roots — was complete and architecturally
correct, and none of it was recreated. This section documents the whole
Tenant domain, not only what this continuation added.

### Tenant = Organization (no parallel identity)

Atlas already has `Organization`/`OrganizationContext`/`activeOrganizationId`
as the boundary a user's Academies, courses and permissions are scoped by.
Prompt 6 does not introduce a `Tenant` entity, a `tenantId` field, a
`TenantContext`, or a second organization-switching mechanism. Every
Tenant-scoped type (`TenantSubscription`, `TenantUsage`, `TenantAddOn`,
`EffectiveEntitlements`) carries `organizationId` — the same identifier
`IdentityProvider`/`PlatformProvider` already use — and "Tenant" is a SaaS
business term used in UI copy and this document only. Using "Tenant" would
have been the actual architectural error.

### Tenant Owner ≠ Academy Owner

The two are expressed as disjoint permission namespaces, never as a role
enum invented by the frontend: `tenant.dashboard.view` /
`tenant.subscription.view` / `tenant.usage.view` / `tenant.addon.view`
control the SaaS pages this prompt adds, while `academy.view` /
`academy.configure` / etc. (Prompt 3B) remain entirely separate strings.
Nothing in this prompt assumes both are granted to the same organization
member, and nothing in `RouteGuard`/`AuthorizationService` changed to make
that assumption true. Whether a given org member holds both sets of
permissions is a backend authorization decision Atlas does not need to
know about on the frontend.

### Platform Owner administration is a structurally different gate

Tenant Owner pages are gated by the four `tenant.*.view` permissions above
(organization-scoped, checked against `organization.permissions`). The one
Platform Owner page this prompt adds — Trial Policy — is gated by
`requiredRoles: ['platform_owner']`, the exact same mechanism the
pre-existing Settings/Billing/Analytics platform pages already use (global
`user.roles`, unrelated to any organization's permission list). These are
two different fields on two different objects, checked by two different
branches of the same `RouteGuard` — there is no code path by which holding
Tenant Owner permissions grants the Platform Owner role, or vice versa.

### Three catalog resources, cleanly separated from Tenant-owned resources

| Resource | Scope | Service |
|---|---|---|
| `Plan` (limits + features) | Platform catalog — same for every Tenant | `PlanService.getPlans`/`getPlan` |
| `AddOn` (catalog) | Platform catalog — same for every Tenant | `PlanService.getAddOns`/`getAddOn` |
| `TrialPolicy` | Platform configuration — Platform-Owner-writable | `PlanService.getTrialPolicy`/`updateTrialPolicy` |
| `TenantSubscription` | Tenant-owned (`organizationId`) | `TenantService.getSubscription` |
| `TenantUsage` | Tenant-owned (`organizationId`) | `TenantService.getUsage` |
| `TenantAddOn` (active add-ons) | Tenant-owned (`organizationId`) | `TenantService.getActiveAddOns` |
| `EffectiveEntitlements` | Tenant-**derived** — never its own source of truth | computed client-side by `computeEffectiveEntitlements`, never stored/fetched |

`PlanService` deliberately owns Plans, Add-ons, *and* Trial Policy — a
fourth service (`AddOnService`, or a `PlatformConfigService` for one
settings resource) would exist only to hold two or three methods each,
the same "don't fragment a small domain" reasoning already used for
`ForumService` in Prompt 5. `updateTrialPolicy` is the **only** write
method anywhere in the Tenant domain: it configures Atlas-wide policy, not
a purchase, so it does not fall under `TenantService`'s deliberate
read-only boundary below.

### `TenantService` is read-only by design

No write method exists on `TenantService` — no `requestUpgrade`, no
`requestAddOn`, no subscription mutation of any kind. There is no payment
provider in this codebase, so a mutation that "changed the plan" would
have to fake success. Instead, every "I've hit a limit" or "this feature
needs a plan I don't have" surface (`TenantUsagePage`, `TenantSubscriptionPage`,
`TenantAddOnsPage`) offers the read-only `PlanComparisonDialog` and static
guidance text ("Plan changes are handled by your Atlas representative")
— honest about what exists, never a fake "Upgrade" button that pretends to
process anything.

### The centralized entitlement-gap decision

`getLimitGapAction`/`getFeatureGapAction` (`entitlement.utils.ts`) are the
single place that decides whether a reached limit or missing feature needs
a plan upgrade or is covered by a catalog Add-on compatible with the
Tenant's current plan. Every page reads the result; none re-derives it
from `plan.key`/`plan.name` conditionals — the "no hardcoded plan
behavior" rule this prompt's spec calls out explicitly (`plan.key` is only
ever compared for *display* — marking which plan card is "current" in
`PlanComparisonDialog` — never for branching logic).

### Query-key scope and organization-switch cache isolation

`tenantKeys.subscription/usage/addOns` all embed `organizationId` as a
literal key segment — the same technique `academyKeys`/`courseKeys`
already use. `PlatformProvider`'s existing `atlas:organization-switched`
handler invalidates every cached query whose key contains the newly
active organization id; because Tenant keys already contain it, switching
organizations invalidates Tenant subscription/usage/add-ons data with **no
new invalidation wiring** — the same "just embed the id" pattern this
codebase has used since Prompt 3B, not a new mechanism. `planKeys` (catalog
+ trial policy) are deliberately **not** organization-scoped: the catalog
and the platform's trial policy are the same for every Tenant.

### Configurable trial policy (not a hardcoded 7-day rule)

`TrialPolicy { enabled, durationDays }` is a real backend-read contract
(`PlanService.getTrialPolicy`), editable by the Platform Owner through
`PlatformTrialPolicyPage` → `PlanService.updateTrialPolicy`. The `7` that
appears in code exists exactly once, as `DEFAULT_TRIAL_POLICY` in
`tenant.constants.ts`, explicitly documented as an **initial/default**
value — consumed only as `useTrialPolicy`'s TanStack Query `initialData`
(marked stale via `initialDataUpdatedAt: 0`), so the admin form renders
immediately instead of flashing a loading skeleton, then silently updates
once the real, backend-configured policy resolves. No subscription-state
countdown anywhere reads this constant — `TenantDashboardPage`/
`TenantSubscriptionPage` compute "days remaining" from the subscription's
own `trialEndsAt`/`graceEndsAt` via `getDaysRemaining`, which is real
backend data, not a re-derivation of the default. Disabling the trial
(`enabled: false`, `durationDays: 0`) is a fully supported policy value,
not a special case.

### Module Design
| Area | Responsibility | Key Files |
|------|-----------------|-----------|
| Plan/Add-on/Trial domain types | Catalog Plan, resource limits, feature entitlements, Add-on + its limit/feature effect, Trial Policy | `src/types/plan.types.ts` |
| Tenant domain types | Tenant subscription + lifecycle status, usage metrics, active Add-ons, derived effective entitlements, entitlement-gap action | `src/types/tenant.types.ts` |
| Entitlement/usage/status utils | `computeEffectiveEntitlements`, `hasFeature`, `getResourceLimitStatus`/`getUsageMetricStatus`/`getUsagePercentage`, `getDaysRemaining`, `formatLimitValue`, `getLimitGapAction`/`getFeatureGapAction`, subscription-status → tone mapping | `src/features/tenant/utils/` |
| Services | `TenantService` (read-only, organization-scoped), `PlanService` (catalog + Trial Policy, unscoped, one write method) | `src/features/tenant/services/` |
| Hooks | 8 hooks: `useTenantSubscription`/`useTenantUsage`/`useTenantAddOns` (organization-scoped), `usePlanCatalog`/`useAddOnCatalog`/`useTrialPolicy`/`useUpdateTrialPolicy` (catalog-scoped), `useEffectiveEntitlements` (composes two queries, no independent cache entry) | `src/features/tenant/hooks/` |
| Pages | Tenant Dashboard/Subscription/Usage/Add-ons (Tenant Owner), Platform Trial Policy (Platform Owner) | `src/features/tenant/pages/` |
| Shared component | `PlanComparisonDialog` — read-only plan/limit/feature comparison, reused from 3 pages | `src/features/tenant/components/` |
| Query keys | `tenantKeys` (organization-scoped), `planKeys` (catalog-scoped) | `src/services/query/query-keys.ts` |
| Localization | 1 new namespace: `tenant` (92/92 keys, EN/AR parity verified programmatically) | `src/localization/resources/{en,ar}/tenant.json` |
| Routing | 5 new routes, all `RouteGuard`s explicitly setting `requireAuthentication` | `route-paths.ts`, `AppRouter.tsx` |
| Navigation | New "SaaS" section (Tenant Owner, 4 items) + one item appended to the existing platform-owner-gated "Administration" section (Trial Policy) | `navigation.config.ts` |

### Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| No parallel Tenant identity | `organizationId` throughout; "Tenant" is UI/doc terminology only | The existing Organization boundary already is the Tenant boundary; a second identity would be the actual duplication |
| Trial Policy lives on `PlanService`, not a 4th service | One extra read + one write method, same file | Mirrors the existing "Add-on catalog on `PlanService`, not `AddOnService`" reasoning; a `PlatformConfigService` would hold nothing else |
| `TenantService` stays read-only | No upgrade/add-on-purchase mutation added | No payment provider exists; a fake-success mutation would violate "never claim a plan change happened" |
| `updateTrialPolicy` is the one exception | A real, backend-read/write config mutation | Platform configuration, not a purchase — the read-only boundary above is specifically about payment-shaped operations |
| Centralized gap-action helpers | `getLimitGapAction`/`getFeatureGapAction`, single source of "upgrade vs. add-on" | Prevents every page from re-deriving the same decision via ad hoc `plan.key`/`plan.name` conditionals |
| `EffectiveEntitlements` never cached as its own query | Derived in `useEffectiveEntitlements` from two already-cached queries | Caching a pure function's output a second time is a second source of truth to keep in sync, not a simplification |
| `DEFAULT_TRIAL_POLICY` used only as query `initialData` | `useTrialPolicy({ initialData, initialDataUpdatedAt: 0 })` | Makes the "initial default, not a business rule" doc comment literally true instead of aspirational; avoids inventing an unused constant |
| Two structurally different admin gates | `requiredPermissions: ['tenant.*.view']` vs. `requiredRoles: ['platform_owner']` | Matches Prompt 3A's existing Settings/Billing/Analytics precedent exactly; guarantees no code path conflates Tenant Owner with Platform Owner |
| No fake checkout/upgrade UI | `PlanComparisonDialog` is read-only; static "contact your Atlas representative" copy | No payment provider exists in this codebase; a functional-looking Upgrade button would misrepresent what the frontend can actually do |

### Backend Contracts To Document (frontend-defined, backend TBD)
1. **Plan catalog** — `GET /plans`, `GET /plans/:key` → `Plan[]`/`Plan`. Public/authenticated read; no mutation exists.
2. **Add-on catalog** — `GET /add-ons`, `GET /add-ons/:key` → `AddOn[]`/`AddOn`. Same scope as Plans.
3. **Trial Policy** — `GET /trial-policy` (any authenticated read), `PATCH /trial-policy` (Platform Owner only) → `TrialPolicy`. The backend is the authority on the write permission; the frontend gate is UX only.
4. **Tenant subscription** — `GET /organizations/:organizationId/subscription` → `TenantSubscription`. Must 403 for a caller not authorized on that organization; the frontend never trusts a UI-supplied `organizationId` as authorization.
5. **Tenant usage** — `GET /organizations/:organizationId/usage` → `TenantUsage`. Authoritative counts; the frontend never computes usage from local state.
6. **Tenant active Add-ons** — `GET /organizations/:organizationId/add-ons` → `TenantAddOn[]`.
7. **Upgrade/Add-on intent** — **not implemented**. No `POST` exists for "upgrade my plan" or "activate this add-on" — deliberately, since no payment provider exists. A future prompt introducing real billing must add this endpoint and the corresponding mutation; until then the frontend only describes what an upgrade/add-on would unlock.
8. **Organization-scoped authorization** — every Tenant-scoped GET above must independently re-verify the caller belongs to `organizationId` server-side; `RouteGuard`'s `requiredPermissions` check is UX, not enforcement.
9. **Idempotency** — `updateTrialPolicy` is a plain `PATCH`; not payment-shaped, so no idempotency-key contract is needed. If a future prompt adds upgrade/add-on-purchase mutations, those *do* need an idempotency-key contract — explicitly out of scope here since no such mutation exists yet.

### Security / Tenancy Verification
- **Cross-tenant leakage**: every Tenant query key embeds `organizationId`; switching organizations produces different keys, and `PlatformProvider`'s existing invalidation additionally purges the old ones. Manually verified no `tenantKeys.*` call site omits `organization?.id`.
- **Fail-closed authorization**: all 5 new routes go through the unmodified `RouteGuard`, whose permission/role checks already fail closed (missing user/organization ⇒ redirect to `/403`); nothing in this prompt touched `RouteGuard`/`AuthorizationService`.
- **No Tenant Owner → Platform Owner escalation**: Platform Trial Policy is gated by `requiredRoles`, an entirely different check (`user.roles`/`organization.role`) from every Tenant page's `requiredPermissions` (`organization.permissions`). No permission string implies the role.
- **No arbitrary `organizationId` trust**: every Tenant hook sources `organizationId` from `useAuth().organization` (the session's real active organization, the same source `useAcademies` already uses) — never from a route param or user-editable field.
- **Frontend limit checks are UX, not enforcement**: documented explicitly on `TenantUsagePage` (`tenant:usage.enforcementNote`) and in the backend contracts above; the future backend remains the actual authority.

### What Is Frontend-Only (No Real Backend Behind It Yet)
Everything in this prompt is a real, callable service contract against
endpoints that do not yet exist on a running backend — consistent with
every prior prompt in this codebase. Nothing here is mocked data
pretending to be real: `TenantService`/`PlanService` issue real HTTP calls
through the existing `apiClient`; there is simply no server listening yet.

### Scope Boundary
Explicitly not implemented in Prompt 6: real payment/checkout/billing
integration (Stripe/Paymob/etc.), an upgrade or add-on-purchase mutation
(no such endpoint is defined — see Backend Contracts #7), a public
`/pricing` marketing page, a full Plan/Add-on/Subscription CRUD admin UI
(only Trial Policy — the one thing the spec required to be
Platform-Owner-configurable — got an admin page), real DNS/custom-domain
provisioning, real theme provisioning, real storage/video/backup
infrastructure (only the entitlement/usage *boundary* is modeled), and the
full tenant-provisioning/onboarding journey (choose name → theme → domain
→ provision). These remain explicitly future modules, matching the
Prompt 6 specification's own scope boundary.

---

## Atlas Enterprise Billing & Payment Platform (Prompt 7)

The complete payment engine on top of Prompt 6's SaaS foundation. The
governing principle: **the payment engine, the Checkout UI, the Payment
UI, payment history, and the Subscription/Add-on/Entitlement domains are
all provider-agnostic.** Manual Bank/Wallet Transfer is today's only
available provider; a real gateway is a future *adapter*, never a
redesign. No real gateway is connected, no gateway SDK is installed, no
card data is collected, and no webhook is faked — every "gateway-ready"
piece introduced here is a real, typed, callable contract with zero
concrete implementation behind it.

### A same-named, unrelated Prompt 3A feature — caught and preserved

`src/features/billing/` already contained a Prompt 3A feature
(`BillingPage.tsx`, user-scoped `Subscription`/`Invoice`/`PaymentMethod`
types in `billing.types.ts`, and `en/ar billing.json`) before this prompt
started. Prompt 7's new payment engine was built inside the same
directory (a defensible choice — it *is* the billing feature, and the
legacy page is one page among many now-siblings), which meant the two
localization files briefly collided under one Write call mid-session.
This was caught before finalizing: the two legacy JSON files were
restored via `git checkout`, and every Prompt 7 translation key was
re-registered under a **new `payments` namespace**, never `billing`. Four
distinct type names also collided with Prompt 3A's existing
`billing.types.ts` exports (`PaymentMethod`, `PaymentStatus`,
`BillingCycle`, `Invoice`) and were renamed to `CheckoutPaymentMethod`,
`PaymentLifecycleStatus`, `SubscriptionBillingCycle`, and `TenantInvoice`
respectively — the same "prefix with the owning domain" convention
`TenantSubscriptionStatus` already established over the same file's
`SubscriptionStatus` in Prompt 6. `BillingPage.tsx`/`billing.types.ts`/
`en/ar billing.json` remain byte-for-byte untouched.

### Payment is not Subscription

This is the single most load-bearing rule in this prompt. Creating a
Checkout, creating a Payment, uploading proof, or a customer returning
from a redirect NEVER, by itself, changes `TenantSubscription` or
`TenantAddOn` (Prompt 6). The ONLY trigger anywhere in the frontend that
treats a purchase as real is `usePaymentDetails` observing
`Payment.status` transition INTO `'succeeded'` — at which point it
invalidates Prompt 6's `tenantKeys` (subscription/usage/add-ons) so
`useEffectiveEntitlements` picks up the change on its next read. The
actual subscription/add-on mutation happens server-side; the frontend
never performs it and never claims it happened from anything less than
that one authoritative signal.

### One Payment shape for manual and gateway

`Payment`/`PaymentAttempt`/`PaymentIntent` are not manual-specific or
gateway-specific types with a duplicate pair — they are the SAME shape,
distinguished by `methodType`/`provider` and which optional,
capability-gated fields are populated (`proof` for manual,
`providerReference`/`nextAction.type: 'redirect'` for gateway). Every UI
surface (`PaymentHistoryPage`, `PaymentDetailsPage`) branches on
`PaymentMethodCapabilities`/`status`/`reviewStatus`/`nextAction`, never on
`methodType === 'gateway'` as a proxy for "this needs different UI." This
was verified explicitly during the CTO audit: an early draft of
`usePaymentDetails`'s polling gate and `PaymentDetailsPage`'s
"awaiting review" branch both checked `methodType !== 'gateway'` in
addition to `reviewStatus === 'pending'` — removed in favor of the
`reviewStatus` check alone, since manual review is a capability, not a
method-type fact (a future gateway method could, per the spec, also
require manual review; the check needed to be correct for that case too).

### The provider abstraction

`PaymentProviderAdapter` (base) / `GatewayPaymentProviderAdapter`
(adds `createPaymentIntent`/`handleProviderReturn`/`verifyPayment`) /
`ManualReviewPaymentProviderAdapter` (adds `submitProof`) — interfaces
segregated by capability, not one god-interface every adapter must fully
implement. Every method on every adapter still calls Atlas's own
`PaymentService`/`CheckoutService` (plain `BaseService` subclasses) —
never a real provider's SDK or API directly. What the abstraction buys is
architectural: the Checkout/Payment UI resolves an adapter by
`PaymentMethod.provider` through `PaymentProviderRegistry` and reads its
`capabilities` — it never has a `switch (provider)` anywhere.
`ManualTransferProvider` is the one concrete adapter registered today,
under the key `'atlas_manual'`, backing both `manual_bank_transfer` and
`manual_wallet_transfer` (they differ only in which
`ManualPaymentInstructions` variant the catalog publishes for a given
method, not in how the Payment itself is created/checked/proven).
Connecting a real gateway later means: implement a concrete
`GatewayPaymentProviderAdapter` (a `StripeAdapter`, etc.), register it in
`PaymentProviderRegistry` under its provider key, and have the backend
start returning a `CheckoutPaymentMethod` with `type: 'gateway'` and that
provider key. Nothing in `CheckoutPage`/`PaymentDetailsPage`/
`PaymentHistoryPage`/the Subscription/Add-on/Entitlement domains would
need to change.

### Checkout snapshot, idempotency, and money

`Checkout.snapshot` is captured once, at creation, and never recomputed
from live catalog data — if a Plan's price changes tomorrow, every
Checkout created today keeps yesterday's price, by construction (nothing
re-reads `Plan.pricing` after `createCheckout` returns).
`CreateCheckoutPayload.idempotencyKey` is generated once per checkout
attempt client-side (`generateIdempotencyKey`, `crypto.randomUUID()`) and
replayed verbatim on any retry within that attempt — the frontend's half
of idempotency; the backend remains the authority on actually deduplicating
by that key. `Money{amountMinorUnits, currency}` is the one monetary
representation in this prompt: an integer in the currency's smallest unit,
a plain ISO `currency` string never assumed to be one platform currency,
and `formatMoney` the single place minor-units-to-display conversion
happens (documented 2-decimal-exponent assumption, with a named seam to
extend if a future currency needs otherwise).

### Payment methods and manual review are capability-driven, not name-driven

`PaymentMethodCapabilities` (9 boolean flags) is what every UI decision is
actually keyed on. `ManualReviewStatus` is a state SEPARATE from
`PaymentLifecycleStatus` — it only exists meaningfully when
`capabilities.supportsManualReview` is true, and a gateway method's
`reviewStatus` is `'not_required'` by default, never forced through a
proof-upload flow it has no `manualInstructions` to render.

### Two structurally different review gates (again)

Platform payment review routes are gated by `requiredRoles: ['platform_owner']`
— the exact Prompt 6 Trial Policy precedent. The Approve/Reject actions
inside `PlatformPaymentReviewDetailPage` are gated a second, finer time by
`usePermissions().hasPermission('platform.payment.approve'|'reject')` —
the same "route-level view vs. page-level action permission" split Prompt
5 established for instructor grading (`instructor.submission.view` vs.
`instructor.assignment.grade`). A reviewer holding the role but not the
specific action permission sees a read-only notice instead of a
disabled-looking form. A UX-layer guard additionally blocks a reviewer
from approving/rejecting their own organization's payment
(`payment.organizationId === organization?.id`) — explicitly documented as
UX-only; the backend remains the actual authority (see Security section
below).

### Never trust the redirect

`PaymentDetailsPage` is deliberately the SAME page a gateway's
`returnUrl`/`cancelUrl` would point at. Whatever query string the
customer's browser carries back is never read as proof of anything — the
page always re-derives truth through `usePaymentDetails`, which re-fetches
`Payment` from `PaymentService.getPayment` and polls while genuinely
non-terminal. `PaymentReturnParams` exists only to know WHICH payment to
re-check (a `paymentId`), never to decide the outcome.

### Module Design
| Area | Responsibility | Key Files |
|------|-----------------|-----------|
| Money/Billing-cycle types | `Money`, `SubscriptionBillingCycle` | `src/types/money.types.ts` |
| Checkout domain types | `CheckoutTarget`, `CheckoutSnapshot`, `Checkout`, `CreateCheckoutPayload` | `src/types/checkout.types.ts` |
| Payment domain types | `Payment`, `PaymentIntent`, `PaymentAttempt`, `PaymentLifecycleStatus`, `ManualReviewStatus`, `CheckoutPaymentMethod`, `PaymentMethodCapabilities`, `ManualPaymentInstructions`, `PaymentNextAction`, `TenantInvoice`, `PaymentWebhookEvent` (documented contract only) | `src/types/payment.types.ts` |
| Provider abstraction | `PaymentProviderAdapter`/`GatewayPaymentProviderAdapter`/`ManualReviewPaymentProviderAdapter`, `ManualTransferProvider`, `PaymentProviderRegistry` | `src/features/billing/providers/` |
| Services | `CheckoutService`/`PaymentService` (tenant-scoped), `PlatformPaymentService` (flat, cross-tenant) | `src/features/billing/services/` |
| Hooks | 8 tenant hooks + 5 platform-review hooks | `src/features/billing/hooks/` |
| Pages | Billing Overview, Checkout, Payment History, Payment Details, Invoices (tenant); Payment Review List/Detail (platform) | `src/features/billing/pages/` |
| Query keys | `checkoutKeys`/`paymentKeys`/`invoiceKeys` (organization-scoped), `paymentMethodKeys`/`platformPaymentKeys` (unscoped) | `src/services/query/query-keys.ts` |
| Localization | 1 new namespace: `payments` (126/126 keys, EN/AR parity verified programmatically) — deliberately NOT `billing`, which remains Prompt 3A's | `src/localization/resources/{en,ar}/payments.json` |
| Routing | 7 new routes, all `RouteGuard`s explicitly `requireAuthentication` | `route-paths.ts`, `AppRouter.tsx` |
| Navigation | "Billing" appended to the existing Prompt 6 SaaS section; "Payment Review" appended to the existing Administration section | `navigation.config.ts` |
| Cross-feature barrel | `src/features/tenant/index.ts` (new) — lets `features/billing` depend on Prompt 6's `useTenantSubscription` without violating the `no-restricted-imports` feature-isolation ESLint rule | `src/features/tenant/index.ts` |

### Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| One Payment shape, capability-driven | `PaymentMethodCapabilities` flags decide UI branching, never `methodType`/`provider` string checks | A future gateway method that also required manual review must render correctly without a rewrite; verified by removing a `methodType === 'gateway'` check found during audit |
| Provider abstraction still calls Atlas's own backend | Every adapter method calls `PaymentService`/`CheckoutService`, never a real provider SDK/API | No real gateway is connected in this prompt; the abstraction is an architectural seam, not a networking one |
| `ManualTransferProvider` backs both bank and wallet transfer | One adapter, two `PaymentMethodType`s | They differ only in which `ManualPaymentInstructions` variant is published, not in payment lifecycle behavior |
| `PaymentProviderRegistry` starts with exactly one entry | No placeholder/fake gateway adapter registered | An unregistered provider key must mean "not available yet," rendered explicitly in `CheckoutPage`, never silently assumed to work |
| Checkout snapshot never recomputed | `snapshot.price`/`snapshot.displayName` fixed at creation | Historical checkout values must not silently change because catalog data changed afterward |
| `PlatformPaymentService` is a third, flat service tree | Not nested under `organizations/:organizationId` | Mirrors Prompt 5's `InstructorService` reasoning exactly: platform review's authorization scope is genuinely different from a Tenant's own view of its payments |
| Two-layer platform review gate | Route: `requiredRoles: ['platform_owner']`; Approve/Reject buttons: inline `platform.payment.approve`/`reject` permission check | Mirrors Prompt 5's instructor-grading permission split; a role holder without the specific action permission gets a read-only view, not a broken form |
| Self-review UX guard | `payment.organizationId === organization?.id` disables Approve/Reject with an explanatory notice | Defense in depth; explicitly documented as UX-only since the frontend cannot be the authority on this |
| `usePaymentDetails` polls only while genuinely in progress | Stops at any terminal status AND at `reviewStatus: 'pending'` | Nothing external is happening during manual review for polling to observe — a human has to act, not a backend process |
| Financial mutations never auto-retry | `showSuccessToast`/`showErrorToast: false` on every billing mutation, page-owned feedback, explicit user-triggered retry only | A network retry on `createPayment`/`approvePayment`/etc. could double-charge or double-approve if blindly repeated |
| New `payments` i18n namespace, not `billing` | Discovered mid-session that `billing` was already Prompt 3A's | Reusing it would have silently overwritten unrelated legacy translations — caught and corrected before finalizing |
| `src/features/tenant/index.ts` added | Public barrel, same `@features/<name>` pattern as `@features/course` | `features/billing` legitimately needs Prompt 6's `useTenantSubscription`; the ESLint feature-isolation rule requires reaching through a feature's root barrel, not its internals — fixed correctly rather than suppressing the rule |

### Backend Contracts To Document (frontend-defined, backend TBD)
1. **Checkout** — `POST /organizations/:organizationId/checkouts` (idempotent on `idempotencyKey`), `GET .../checkouts/:checkoutId` → `Checkout`. Snapshot is computed and frozen server-side at creation.
2. **Payment** — `POST .../payments` (`{checkoutId, methodKey}`) → `Payment`; `GET .../payments`, `GET .../payments/:paymentId`; `POST .../payments/:paymentId/cancel`. Every GET/POST re-verifies the caller's organization membership server-side — `RouteGuard`'s check is UX only.
3. **PaymentIntent** (gateway-ready, currently unused by any adapter) — `POST .../payments/intents` (`{checkoutId}`) → `PaymentIntent{checkoutUrl, providerReference, expiresAt, ...}`. Backend-supplied `checkoutUrl` only; the frontend never constructs one.
4. **Payment method catalog** — `GET /payment-methods` → `CheckoutPaymentMethod[]`, including `manualInstructions` for manual methods. Not organization-scoped.
5. **Payment proof** — `PATCH .../payments/:paymentId/proof` (`{fileData, fileName, mimeType, note}`, base64) → `Payment` with `reviewStatus: 'pending'`. Never a success signal by itself.
6. **Payment review** (platform-scoped, flat) — `GET /payments`, `GET /payments/:paymentId`, `POST /payments/:paymentId/approve` (`{notes?}`), `POST /payments/:paymentId/reject` (`{notes}`, required). Backend MUST reject a reviewer approving/rejecting their own organization's payment — the frontend guard is UX only.
7. **Invoices** — `GET .../invoices` → `TenantInvoice[]`. Read-only; no invoice-generation endpoint defined here.
8. **Webhook** (not implemented in this prompt; documented for the future backend) — Gateway → backend webhook endpoint → signature verification → event-source validation → provider event ID → idempotency check → normalize into `PaymentWebhookEvent` (`payment.*`/`refund.*`) → update `Payment`/`PaymentAttempt` → mutate `TenantSubscription`/`TenantAddOn` where applicable → audit event. The frontend never receives or trusts a webhook payload directly.
9. **Idempotency** — `createCheckout`/`createPayment`/a future `createPaymentIntent`/`approvePayment`/`rejectPayment` are all financial or state-changing mutations; the backend is the authority on deduplicating `createCheckout` by `idempotencyKey` and on making the others safe to retry deliberately (not automatically) from the frontend.
10. **Refunds** (not implemented) — `Payment`/`PaymentAttempt` already carry stable ids a future `Refund` record could reference (`paymentId`); no refund endpoint or UI exists yet.
11. **Reconciliation** (not implemented) — `Payment.providerReference` ↔ `Payment.id` ↔ `Checkout.id` ↔ (future) `TenantSubscription`/`TenantAddOn` change is the traceable chain a future reconciliation process would walk; no reconciliation logic exists on the frontend.

### Security / Tenancy Verification
- **Cross-tenant leakage**: `checkoutKeys`/`paymentKeys`/`invoiceKeys` all embed `organizationId`, sourced from `useAuth().organization` — never a route param or user-editable field. `platformPaymentKeys` is intentionally unscoped (cross-tenant by design, gated by role instead).
- **Self-approval**: UX-layer guard in `PlatformPaymentReviewDetailPage`; documented explicitly as non-authoritative — the backend contract (#6 above) states the actual requirement.
- **Card data**: no `cardNumber`/`cvv`/`expiry` field exists anywhere in this prompt's types or forms — verified by grep during the CTO audit.
- **Secrets**: no API key/secret/webhook-secret/merchant-secret/private-key string appears anywhere in the frontend — provider configuration is explicitly a backend/server-side concern (Backend Contracts above).
- **Fail-closed authorization**: all 7 new routes go through the unmodified `RouteGuard`; nothing in this prompt touched `RouteGuard`/`AuthorizationService`.
- **No fake success**: grepped for any hardcoded `status: 'succeeded'` assignment — none exists; every `Payment` the frontend renders came from a `PaymentService`/`PlatformPaymentService` response.
- **Frontend checks are UX, not enforcement**: documented on every capability check and permission gate in this prompt, consistent with Prompt 6's identical framing for usage limits.

### What Is Frontend-Only (No Real Backend Behind It Yet)
Every service/adapter method in this prompt issues a real HTTP call
through the existing `apiClient` against an endpoint shape documented
above — consistent with every prior prompt. Nothing is mocked data
presented as real; there is simply no server listening yet, and no
gateway is connected on purpose.

### Scope Boundary
Explicitly not implemented in Prompt 7: any real payment gateway
connection, gateway SDK installation, card-data collection, a working
webhook receiver (server-to-server, out of frontend scope entirely), real
refund processing, real reconciliation/accounting, real recurring/
automatic billing (saved cards, card vaults, automatic retries), and a
public checkout/pricing page for unauthenticated visitors (Checkout here
is reached only from an authenticated Tenant's Subscription/Add-ons
pages). These remain explicitly future modules — the point of this
prompt's architecture is that adding them later is adapter/configuration
work, not a redesign of Checkout, Payment, Subscription, Add-on, or
Entitlement.

---

## Atlas Provisioning + Academy Lifecycle (Prompt 8)

The orchestration domain that turns an eligible request into a ready
Academy: Tenant → Academy → Theme → Branding → Subdomain → Domain →
Provisioning → Ready. Prompt 8 does not rebuild Prompt 6's tenancy or
Prompt 7's commerce — it consumes both, and owns exactly one new
responsibility: the lifecycle/state-machine/idempotency/retry contract
that coordinates them into "a ready Academy." Nothing here knows about
databases, containers, DNS providers, or deployment mechanics — the
domain speaks only in business capabilities (create academy, apply theme,
apply branding, allocate subdomain, connect domain, provision, complete).

### Two layers of state, deliberately

A `ProvisioningRequest` carries a coarse `ProvisioningStatus` (the 12-value
canonical milestone: `payment_success → tenant_created → academy_created →
theme_applied → branding_applied → subdomain_assigned →
custom_domain_pending/connected → provisioning → ready`, plus `failed`/
`cancelled`) AND true step-level detail (`steps: ProvisioningStep[]`, each
one of 7 named steps carrying its own `pending`/`running`/`completed`/
`failed`/`skipped` status, `attemptNumber`, timestamps, and a safe error).
The coarse status is what a list/history view reads; the step array is
what the checklist UI and retry logic actually reason about. This
two-layer design is what makes "retry never recreates a completed step"
possible: the frontend never infers step completion from the coarse
status — it reads `ProvisioningStep.status` directly, and a step already
reported `'completed'` (or `'skipped'`) by the backend is rendered as
such, never re-attempted.

### The `tenant` step exists for observability, not because Prompt 8 creates Tenants

Prompt 8 does NOT implement tenant creation. A `ProvisioningRequest` is
always created within an already-authenticated Tenant context
(`organizationId` sourced from `useAuth().organization`, exactly like
every Prompt 6/7 hook) — you cannot call `createProvisioningRequest`
without one. The `tenant` step exists in the model purely so a future
backend orchestration that DOES create a Tenant and an Academy atomically
in one combined signup flow has somewhere to report that fact; from the
frontend's perspective it is always `'completed'` or `'skipped'`, never
something a component triggers. Actual Organization/registration
creation remains owned by the existing auth/registration flow
(Prompt 2/3A) — Prompt 8 does not duplicate it.

### The `theme` step exists for observability, not because Prompt 8 implements a Theme Engine

Prompt 9 owns the Theme Engine. Prompt 8's `ProvisioningStepKey` includes
`'theme'` and `CreateProvisioningRequestPayload` structurally allows a
future `themeId`, but there is no theme picker UI, no theme registry, no
theme rendering — this step is reported `'skipped'` by the backend today
and the frontend renders that faithfully. When Prompt 9 lands, this step
starts being exercised without any change to `ProvisioningRequest`'s
shape or `ProvisioningStatusPage`'s rendering logic.

### `retryProvisioning` covers both retry and resume

Section 11 of the Prompt 8 spec lists `retryProvisioning` and
`resumeProvisioning` as separate potential contracts. They were
deliberately consolidated into one: from the frontend's perspective,
"retry a failed step" and "resume an interrupted request" are the same
instruction — "please continue this request from where it stands" — and
the backend is what actually decides whether that means re-running a
failed step or picking a stalled one back up. Exposing two near-identical
methods for the same customer action would have been the
unnecessary-abstraction the spec itself warns against (section 51, "CTO
Audit... unnecessary abstractions").

### Two service trees, mirroring Prompt 7 exactly

`ProvisioningService` (tenant-scoped, nested
`organizations/:organizationId/provisioning-requests/...`) and
`PlatformProvisioningService` (flat, cross-tenant `provisioning-requests`
resource) are the same "third service tree over one entity" split
`CheckoutService`/`PlatformPaymentService` (Prompt 7) and
`InstructorService` (Prompt 5) already established: a Platform Owner's
provisioning console genuinely needs a different authorization shape
(cross-tenant) than a Tenant's own view of their own requests. Subdomain
availability is exposed as a third, unscoped shape (a subdomain is unique
across all of Atlas, not per-Tenant) — the same pattern `PlanService`
uses for its catalog, `PaymentService` for its payment-method catalog.

### Plan-limit enforcement is 100% reused, not reimplemented

`ProvisioningStartPage` calls Prompt 6's `useTenantUsage`,
`getUsageMetricStatus`, and `getLimitGapAction` completely unchanged — no
new entitlement calculation exists anywhere in this prompt, and no
`plan.key`/`plan.name` string comparison appears in the feature (verified
by grep during the CTO audit). "Academy limit reached" renders the exact
same `EntitlementGapAction` (`'upgradePlan'` | `'addOn'` | `'none'`)
concept Prompt 6/7 already use for Usage/Subscription pages, linking back
to `TenantSubscriptionPage` rather than inventing a parallel upgrade flow.

### Subdomain and Custom Domain are display-state contracts, not infrastructure

`SubdomainAllocation`/`DomainConnection` model only what a customer needs
to see (`status`, `fullHost`/`hostname`, `verificationRecords` as opaque
display data) — there is no DNS API call, no SSL logic, no record
creation anywhere in this prompt. `checkSubdomainAvailability` hits a
real (backend-undefined) endpoint through `ProvisioningService`, exactly
like every other Atlas service call; it does not simulate availability.

### Never simulated progress

`ProvisioningStatusPage`/`PlatformProvisioningDetailPage` render
`ProvisioningStep.status` exactly as `useProvisioningRequest`/
`usePlatformProvisioningRequest` report it — there is no `setTimeout`, no
locally-incrementing progress percentage, no automatic status
advancement anywhere in the feature (verified by grep during the CTO
audit). `useProvisioningRequest` polls only while the request is
non-terminal (mirrors Prompt 7's `usePaymentDetails` exactly) and stops
the instant a terminal status (`ready`/`failed`/`cancelled`) is reached.
Refreshing the page, or opening it in a second tab, re-runs the same
read-only query against the same backend-authoritative record — never two
provisioning operations, and never a state restored from `localStorage`
or component memory.

### `READY` is not a public website

The `ProvisioningStatusPage` success state offers exactly one action —
"Go to Academy Dashboard" (only when `academyId` is present) — and
deliberately no "Visit Website." `ready` means the provisioning contract
reports the Academy is ready; it says nothing about whether Prompt 9's
Theme Engine or a future Prompt 10 public website/CMS exists. Leaking
that assumption into this prompt's UI would have been exactly the
scope-creep section 48 of the spec warns against.

### Module Design
| Area | Responsibility | Key Files |
|------|-----------------|-----------|
| Provisioning domain types | `ProvisioningStatus`/`ProvisioningStep`/`ProvisioningError`/`ProvisioningRequest`, `SubdomainAllocation`, `DomainConnection`, documented `ProvisioningEvent` contract | `src/types/provisioning.types.ts` |
| Services | `ProvisioningService` (tenant-scoped), `PlatformProvisioningService` (flat, cross-tenant) | `src/features/provisioning/services/` |
| Hooks | 5 tenant hooks + 4 platform-console hooks | `src/features/provisioning/hooks/` |
| Pages | Provisioning Start/Status/History (tenant), Platform Provisioning List/Detail | `src/features/provisioning/pages/` |
| Query keys | `provisioningKeys`/`subdomainKeys` (organization-scoped / unscoped respectively), `platformProvisioningKeys` (unscoped, cross-tenant) | `src/services/query/query-keys.ts` |
| Localization | 1 new namespace: `provisioning` (80/80 keys, EN/AR parity verified programmatically) | `src/localization/resources/{en,ar}/provisioning.json` |
| Routing | 5 new routes, all `RouteGuard`s explicitly `requireAuthentication` | `route-paths.ts`, `AppRouter.tsx` |
| Navigation | "New Academy" appended to the existing Academy nav section; "Academy Provisioning" appended to the existing Administration section | `navigation.config.ts` |

### Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Two-layer state (coarse status + step array) | `ProvisioningRequest.status` for summaries, `steps[]` for the real checklist/retry logic | Lets retry logic read step completion directly, never infer it from the coarse milestone |
| `tenant`/`theme` steps are observability-only | Frontend never triggers either; both render `'skipped'` until their owning system exists | Prompt 8 doesn't duplicate Tenant creation (Prompt 2/3A) or the Theme Engine (Prompt 9) |
| `retryProvisioning` covers resume too | One contract, not two | The frontend action is identical either way; the backend decides what "continue" means |
| Two provisioning service trees | `ProvisioningService` (tenant-scoped) / `PlatformProvisioningService` (flat, cross-tenant) | Mirrors Prompt 7's `CheckoutService`/`PlatformPaymentService` split for the same authorization-shape reason |
| Plan-limit gate reuses Prompt 6 verbatim | `useTenantUsage`/`getUsageMetricStatus`/`getLimitGapAction`, zero new logic | The exact "no hardcoded plan behavior" rule every prompt since Prompt 6 has enforced |
| Subdomain/Domain are display-state only | No DNS/SSL logic anywhere | Matches the explicit Prompt 8 boundary; real infrastructure is future backend work |
| No simulated progress | Every status/step comes from `useProvisioningRequest`'s polled query, never a timer | The entire point of "no fake backend" — verified by grep for `setTimeout`/`setInterval` |
| `READY` offers only "Go to Academy Dashboard" | No "Visit Website" action | Provisioning readiness and public-website existence are different, later-owned concerns |

### Backend Contracts To Document (frontend-defined, backend TBD)
1. **Create provisioning request** — `POST /organizations/:organizationId/provisioning-requests` (idempotent on `idempotencyKey`) → `ProvisioningRequest`. Backend independently re-verifies the Tenant's Academy-limit entitlement — the frontend's pre-check is UX only.
2. **Get/list provisioning requests** — `GET .../provisioning-requests/:id`, `GET .../provisioning-requests` (history). Every response re-scoped to the caller's organization server-side.
3. **Retry/resume** — `POST .../provisioning-requests/:id/retry`. Must not re-execute a step already reported `completed`/`skipped`; the backend is the authority on what "continue" means for the current failure.
4. **Cancel** — `POST .../provisioning-requests/:id/cancel`. Only valid while non-terminal; backend rejects otherwise.
5. **Subdomain availability** — `GET /subdomains/availability?subdomain=...` → `SubdomainAllocation`. Global uniqueness check, not organization-scoped.
6. **Platform console** (flat, cross-tenant) — `GET /provisioning-requests`, `GET /provisioning-requests/:id`, `POST .../retry`, `POST .../cancel`. Backend must independently verify the caller holds Platform Owner / `platform.provisioning.manage`-equivalent authorization — the frontend's role/permission gates are UX only.
7. **Provisioning events** (not implemented; documented for a future observability backend) — `provisioning.request_created`/`step_started`/`step_completed`/`step_failed`/`retry_requested`/`resumed`/`completed`/`cancelled`. The frontend never receives these directly; all progress reaches the UI through polling the `ProvisioningRequest` record.
8. **Idempotency** — `createProvisioningRequest` must deduplicate on `idempotencyKey`; `retryProvisioning`/`cancelProvisioning` must be safe against duplicate clicks/multi-tab submission (the backend, not the frontend, is the authority here).

### Security / Tenancy Verification
- **Cross-tenant leakage**: `provisioningKeys` embeds `organizationId`, sourced exclusively from `useAuth().organization` — grepped every provisioning page and confirmed only `requestId` is ever read from `useParams`, never `organizationId`.
- **Fail-closed authorization**: all 5 new routes go through the unmodified `RouteGuard`; nothing in this prompt touched `RouteGuard`/`AuthorizationService`.
- **Platform console gating**: two layers, matching Prompt 7's payment-review precedent — route-level `requiredRoles: ['platform_owner']`, action-level `usePermissions().hasPermission('platform.provisioning.manage')` on Retry/Cancel specifically.
- **No infrastructure leakage**: grepped for Docker/Kubernetes/MySQL/Postgres/Redis/Nginx/Apache/AWS/DigitalOcean/Cloudflare — none found anywhere in the feature.
- **No fake backend**: grepped for `setTimeout`/`setInterval` used for progress simulation — none found; every status shown comes from a real service response.
- **Frontend checks are UX, not enforcement**: documented explicitly on the plan-limit gate and every permission check in this prompt, consistent with Prompt 6/7's identical framing.

### What Is Frontend-Only (No Real Backend Behind It Yet)
Every service method in this prompt issues a real HTTP call through the
existing `apiClient` against a documented endpoint shape — consistent
with every prior prompt. There is no real provisioning engine behind any
of it: no database/server/container/storage creation, no DNS/SSL, no
queues or workers. The frontend's job — representing the lifecycle
faithfully and never pretending it completed something it didn't — is
done; the actual provisioning work remains entirely a future backend's.

### Scope Boundary
Explicitly not implemented in Prompt 8: any real infrastructure
provisioning (database/server/container/storage/deployment), real DNS
configuration or record creation, real SSL issuance or certificate
verification, real background workers/queues, a Theme Engine (Prompt 9),
a public Academy website/CMS (Prompt 9/10), tenant/academy cloning,
provisioning templates or versioning beyond the minimum step model
already described, and real observability/audit infrastructure (only the
`ProvisioningEvent` contract is documented, not implemented). These
remain explicitly future modules — the point of this prompt's
architecture is that a future backend can implement real provisioning
engines behind these exact contracts without the frontend needing a
rewrite.

---

## Atlas Theme Engine + Website Experience Platform (Prompt 9)

The system that lets an Academy Owner configure and operate a professional
public-facing Academy website — theme, branding, pages, sections,
navigation, SEO, draft/publish — without a developer, on top of Prompt
3B's Academy domain and Prompt 3C's Course domain. Prompt 9 does not
rebuild either — it renders a live view of an Academy's existing courses
and consumes the existing branding/upload infrastructure. It owns exactly
one new responsibility: presentation configuration (theme + content
composition), kept strictly separate from the content it presents.

### The `Website`/`Theme` naming-collision decision

Atlas already ships an unrelated dashboard light/dark preference system —
`Theme`/`ThemePreference`/`ThemeProvider` — controlling the SPA's own
chrome. Every new type, file, and hook in this prompt is deliberately
prefixed `Website*` (`WebsiteThemeDefinition`, `WebsiteThemeRegistry`,
`WebsiteThemeScope`, `useWebsiteConfiguration`, …), never bare `Theme*`,
so the two systems can never be confused by name, import, or IDE
autocomplete. Verified by grep: no new symbol in `src/features/website/`
or `src/types/website-theme.types.ts` collides with the existing
`src/providers/ThemeProvider.tsx` or `theme.types.ts` exports.

### Academy-scoping decision

A website belongs to exactly one Academy, not to the Tenant/Organization.
`WebsiteConfigurationService` is nested under
`academies/:academyId/website/...`, and `websiteKeys` embeds `academyId`
directly — the same pattern `courseKeys` already established in Prompt
3C. This is a deliberate departure from Prompt 6/7/8's
`organizationId`-scoped keys: an Academy website has no reason to
invalidate on a Tenant/organization switch (a Tenant Owner switching
organizations is switching Tenants, not Academies within one), so no new
`atlas:organization-switched` wiring was needed — switching the active
Academy simply produces different query keys.

### Content vs. presentation, enforced by the data model

`WebsiteConfiguration` and `WebsitePage` model presentation (theme choice,
tokens, section instances, visibility, navigation, SEO) as data entirely
separate from the Course/Academy content they reference. A `Section`
never stores a copy of course data — `FeaturedCoursesSection` stores a
`mode` (`'latest'` | `'selected'`) and, when `'selected'`, an array of
course ids; the actual course records are always fetched live through
`@features/course`'s existing hooks at render time. This is what makes
theme switching content-safe: switching `WebsiteConfiguration.themeKey`
changes zero bytes of any `WebsitePage.sections`, and republishing after a
theme switch cannot silently drop or corrupt page content, because the
theme was never coupled to it in the first place.

### The token + structural-variant theme strategy

Building 5 *genuinely* distinct themes without either writing ~60
bespoke per-theme section components (unrealistic scope) or shipping 5
shallow color-only reskins (explicitly forbidden by the spec) required a
bounded middle design: a shared token system (`radius`/`shadow`/
`spacing`/`containerWidth`/heading `weight`/`tracking`/`case`/
`cardVariant`) combined with structural variants for the three
highest-visual-impact, highest-leverage elements — Hero (4 layout
variants), Header (3), and Footer (3) — plus distinct default brand
colors per theme. Every other section (About, Statistics, Features, …)
renders through the same component across all 5 themes, but with a
visibly different look, because it reads its spacing/radius/shadow/
typography entirely from the active `ResolvedWebsiteDesignSystem`, never
a hardcoded class. This is documented here explicitly as a deliberate
engineering trade-off, not an oversight: it is what makes a 6th theme
addable as one new `WebsiteThemeDefinition` registry entry, not a new set
of section components.

### The font-reuse decision

No new web font was loaded. Every theme reuses Atlas's already-loaded
`--font-sans`/`--font-display` (Rubik/Readex Pro — both RTL-safe, already
covering Arabic and Latin scripts). Typographic personality is
differentiated through the heading weight/tracking/case token triplet
instead of typeface, avoiding a new font-loading dependency, a new
FOUC/CLS risk, and an Arabic-script gap a Latin-only decorative font would
have introduced.

### The descriptor-driven Section Editor decision

Building 11 fully bespoke section-editor forms (one per `SectionType`)
was rejected as unnecessary duplication of the same
label/input/validation wiring 11 times. Instead, `section-field.types.ts`
defines a small, properly-discriminated `SectionFieldDescriptor` union
(`TextFieldDescriptor`/`BooleanFieldDescriptor`/`NumberFieldDescriptor`/
`SelectFieldDescriptor`), and `section-fields.registry.ts` maps each
`SectionType` to its field list; one shared `SectionConfigForm` renders
whichever descriptor list is active. The generic internal draft state is
typed `Record<string, unknown>`, a narrow and explicitly commented
exception to the "no `any`" rule — real type safety is enforced at the
Zod-schema validation boundary the moment a save is attempted, which is
the point at which type correctness actually matters. Adding a 12th
section type means adding one metadata entry, one config type, one Zod
schema, and one field-descriptor list — never touching the editor itself.

### The Course-domain-reuse decision

`FeaturedCoursesSection`, `InstructorsSection`, and
`CourseDetailsTemplate` consume `@features/course`'s existing
`useCourses`/`useCourse`/`formatCoursePricing` directly through its
public barrel — zero new Course-adjacent service, hook, or type was
written. `InstructorsSection` in particular has no Instructor
service/entity of its own; it derives its instructor list by
deduplicating instructors across the courses already fetched for the
Academy. This guarantees a Course Details page rendered inside the
website always reflects the same live, authoritative Course Management
data every other part of Atlas sees — never a duplicated or stale
projection (the exact requirement of US-60).

### The public-routing-boundary decision

Section 31 of the spec scoped public routing conditionally ("if the
existing application architecture supports them"). It does not: Prompt 8
allocates a subdomain record but there is no infrastructure anywhere in
the repository that serves a request against a Tenant's subdomain, and
building that is real infrastructure work explicitly out of scope (spec
section 43). `WebsitePreviewPage` is the honest, explicitly-scoped
substitute — an authenticated, in-dashboard, permission-gated page that
renders a website's draft configuration through the exact same
`WebsiteRenderer` a real public site would eventually use, at
selectable desktop/tablet/mobile breakpoints. `WebsiteHeader`/
`WebsiteFooter` take an `onNavigate(pageId)` callback rather than
real `<a href>` navigation, because there is no public URL space to
navigate within yet; when public routing is built, this callback becomes
the one integration seam that needs to change.

### Module Design
| Area | Responsibility | Key Files |
|------|-----------------|-----------|
| Theme domain types + registry | `WebsiteThemeTokens`/`WebsiteThemeDefinition`/`ResolvedWebsiteDesignSystem`; 5 theme definitions; `getWebsiteTheme`/`listWebsiteThemes` | `src/types/website-theme.types.ts`, `src/features/website/themes/` |
| Section domain types + registry | `SectionType`/`SectionInstance` (discriminated union)/`ResponsiveVisibility`; `SECTION_METADATA`, descriptor-driven field registry | `src/types/website-section.types.ts`, `src/features/website/sections/` |
| Website domain types | `WebsiteConfiguration`, `WebsitePage`, `WebsiteBrandConfig`/`SeoConfig`/`HeaderConfig`/`FooterConfig`, publish status/error | `src/types/website.types.ts` |
| Renderer | `WebsiteThemeScope` (CSS var scoping), `WebsiteRenderer`, `WebsiteHeader`/`WebsiteFooter`, `CourseDetailsTemplate`, 11 section components | `src/features/website/renderer/`, `src/features/website/sections/` |
| Services | `WebsiteConfigurationService` (academy-scoped, config + pages + publish + section-reorder) | `src/features/website/services/` |
| Hooks | 9 hooks covering configuration/publish/pages/section-reorder | `src/features/website/hooks/` |
| Pages | Website Settings (Theme/Brand/SEO/Navigation tabs), Pages list, Page Editor (Composer), Preview | `src/features/website/pages/` |
| Query keys | `websiteKeys` (academy-scoped, no extra invalidation wiring needed) | `src/services/query/query-keys.ts` |
| Localization | 1 new namespace: `website` (176/176 keys, EN/AR parity verified programmatically); incidental `invalidColor`/`academyWebsite` keys added to `validation`/`navigation` | `src/localization/resources/{en,ar}/website.json` |
| Routing | 4 new routes, all `RouteGuard`s explicitly `requireAuthentication requiredPermissions={['academy.website.view']}` | `route-paths.ts`, `AppRouter.tsx` |
| Navigation | "Academy Website" appended to the existing Academy nav section | `navigation.config.ts` |

### Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| `Website*` naming prefix everywhere | Never bare `Theme*` | Avoids collision with the pre-existing dashboard light/dark theme system |
| Academy-scoped, not organization-scoped | `websiteKeys`/`WebsiteConfigurationService` keyed by `academyId` | A website belongs to one Academy; matches `courseKeys`'s precedent, no org-switch wiring needed |
| Content/presentation separation | Sections reference course ids, never copy course data | Theme switching and republishing can never corrupt or duplicate content |
| Token + structural-variant themes | 5 shared tokens + Hero/Header/Footer structural variants, not per-theme components | Genuinely distinct themes without ~60 bespoke components or shallow color reskins |
| No new font | Reuse `--font-sans`/`--font-display` | Avoids new FOUC/CLS risk and an Arabic-script typeface gap |
| Descriptor-driven Section Editor | One `SectionConfigForm` + field-descriptor registry, not 11 bespoke forms | Adding a 12th section type never requires editor changes; type safety enforced at the Zod boundary |
| Course domain reuse | `FeaturedCoursesSection`/`InstructorsSection`/`CourseDetailsTemplate` call `@features/course` directly | Zero duplication; website Course Details is always the live, authoritative record |
| No public routing | `WebsitePreviewPage` (authenticated, in-dashboard) instead | No subdomain-serving infrastructure exists yet; building it is out of scope |
| Brand tab scoped to colors + dark logo only | Primary logo/favicon stay on the existing Academy Branding page | Avoids duplicating upload infrastructure Prompt 3B already owns |

### Backend Contracts To Document (frontend-defined, backend TBD)
1. **Get/update website configuration** — `GET/PATCH /academies/:academyId/website` → `WebsiteConfiguration`. Always the Academy's draft state; publishing is a separate action.
2. **Publish website** — `POST /academies/:academyId/website/publish`. Backend copies draft → published atomically; frontend never assumes success before the response confirms it.
3. **List/get/create/update/delete pages** — `GET/POST /academies/:academyId/website/pages`, `GET/PATCH/DELETE .../pages/:pageId`. Core pages are never deletable (frontend-enforced via `TOGGLEABLE_CORE_PAGE_TYPES`, backend must independently enforce this).
4. **Reorder page sections** — `PATCH .../pages/:pageId/sections/reorder`. Body carries the full ordered section-id list; backend is authoritative on validity.
5. **Theme catalog** — theme definitions are frontend-bundled (`WebsiteThemeRegistry`), not backend-fetched; only the *selected* `themeKey` round-trips through `WebsiteConfiguration`.
6. **Brand/SEO/Navigation** — all persisted as sub-objects of the same `WebsiteConfiguration` resource via the same update endpoint; no separate sub-resource contracts.
7. **Idempotency** — `updateWebsiteConfiguration`/`updateWebsitePage` are plain PATCH-style saves (no create-with-retry-risk mutation exists in this prompt, unlike Prompt 7/8's `idempotencyKey` pattern); `publishWebsite` should be safe against duplicate-click/multi-tab submission on the backend.

### Security / Tenancy Verification
- **Cross-academy leakage**: `websiteKeys`/`WebsiteConfigurationService` calls are grepped to confirm `academyId` is always sourced from the active Academy context (`useAuth`/`PlatformProvider`), never trusted from an unvalidated route param alone.
- **Fail-closed authorization**: all 4 new routes go through the unmodified `RouteGuard`; nothing in this prompt touched `RouteGuard`/`AuthorizationService`. Minimal permission set: `academy.website.view`/`manage`/`publish`.
- **No client-executable configuration**: grepped the entire feature for `dangerouslySetInnerHTML`, `eval`, `new Function`, and raw `<script>` — none found. Every section config is a bounded, typed data shape (`SectionConfigMap`); there is no "custom HTML" or "custom code" section type.
- **No fake backend**: grepped for `setTimeout`/`setInterval` used to simulate save/publish latency, and for any `localStorage`-as-persistence pattern — none found; every read/write goes through `WebsiteConfigurationService` → `apiClient`.
- **No hardcoded business rules**: theme/section catalogs are legitimately frontend-bundled (equivalent to Prompt 7's `PaymentProviderRegistry`), but no color/price/limit value is hardcoded outside of it; brand colors and content are always the Academy's own configured data.

### What Is Frontend-Only (No Real Backend Behind It Yet)
Every service method in this prompt issues a real HTTP call through the
existing `apiClient` against a documented endpoint shape, consistent with
every prior prompt. There is no real public website hosting behind any of
it: no DNS, no SSL, no CDN, no server-side rendering, no actual subdomain
serving. The Theme Registry and Section Registry are legitimately
frontend-bundled catalogs (the same pattern Prompt 7's
`PaymentProviderRegistry` established) — only the *selection* the Academy
makes from them is backend-persisted. `WebsitePreviewPage` is a real,
honest render of the draft configuration; it is not, and does not claim
to be, the public website.

### Scope Boundary
Explicitly not implemented in Prompt 9: real DNS/SSL/CDN or any
subdomain-serving infrastructure, a public (unauthenticated,
multi-tenant-routed) website — `WebsitePreviewPage` is its authenticated
in-dashboard substitute — payment/checkout logic of any kind, any rewrite
of Course Management (only consumption via `@features/course`'s public
barrel), arbitrary client-executable HTML/CSS/JS in the section or page
model, primary logo/favicon management (stays on the existing Academy
Branding page), undo/redo beyond the unsaved-changes-protection already
built, and page/content versioning or revision history. These remain
explicitly future modules — the point of this prompt's architecture is
that a future backend and a future public-routing layer can be built
behind these exact contracts without the frontend needing a rewrite.

---

## Atlas CMS + SEO Platform (Prompt 10)

Structured Website Content Management and an independent SEO domain,
built on top of Prompt 9's Theme Engine and Page Composer. CMS and SEO
are two separate architectural domains implemented in one prompt — Theme
owns HOW content looks, CMS owns WHAT content exists, SEO owns HOW
content is represented to search engines/crawlers, and none of the three
is allowed to reach into either of the other two's responsibility.

### CMS vs. Page Composer

Prompt 9 already owns page composition: `WebsitePage`, `SectionInstance`,
the Section Registry, the Page Composer, and `WebsiteRenderer`. Prompt 10
does not build a second page builder, a second Section Editor, or a
second renderer — it adds a durable, reusable CONTENT layer
(`WebsiteFaqEntry`/`WebsiteTestimonialEntry`) that a page's existing FAQ/
Testimonials sections can reference by id, and it extends the existing,
single `SectionConfigForm` with a small picker rather than forking it.
`WebsiteContentPage` (the new CMS surface) manages standalone library
content; it is deliberately NOT another place to compose a page.

### The `LocalizedText` decision — narrow, not retroactive

Atlas's localization system (`react-i18next`) translates UI chrome; it
has never translated user-generated content — a Course title, an Academy
name, and every Prompt 9 page/section content string are single-locale,
tenant-authored strings ("real content, not a translation key"). Prompt
10 needed genuine content localization for the CMS library (a FAQ
question written once must still work for an Arabic-reading visitor), so
it introduces `LocalizedText` (`{ en: string; ar: string }`, both
required — an entry only written in one language would silently vanish
for the other locale). This primitive is used ONLY by
`WebsiteFaqEntry`/`WebsiteTestimonialEntry` — every existing Prompt 9
content string (`WebsitePage.title`, `HeroSectionConfig.title`, inline
`FaqItem.question`, etc.) is deliberately left untouched and
single-locale. This is a documented, bounded inconsistency, not an
oversight: retrofitting `LocalizedText` onto Prompt 9's already-shipped,
already-validated content model would have been exactly the "rebuild
Prompt 9" the spec forbids, for a benefit (bilingual inline section
content) no user story in this prompt actually asked for.

### One shared CMS content shape, not a generic content framework

Section 3 of the spec explicitly warns against introducing an abstract
`ContentType`/`ContentEntry` framework "merely for abstraction's sake."
`WebsiteFaqEntry` and `WebsiteTestimonialEntry` are two concrete types
sharing one deliberate shape (localized fields + `order` + `visible` +
`status`) and one deliberate service/hook pattern
(`WebsiteContentService`, list/get/create/update/publish/archive). The
extension point for a future content type (Events, Partners, Team
Members) is "add a third file that follows this same shape and pattern,"
not "extend a generic framework" — the two existing types together ARE
the documented pattern a third would copy.

### Additive, backward-compatible section wiring

`FaqSectionConfig`/`TestimonialsSectionConfig` each gained exactly one
new optional field, `libraryEntryIds?: readonly string[]`. A page saved
before this prompt has no such field and renders identically — its
`FaqSection`/`TestimonialsSection` resolves an empty library list and
falls straight through to the existing inline `items`. When
`libraryEntryIds` IS present, the resolved library entries (published
only, in the given order) render ADDITIVELY, ahead of `items` — never a
silent replace, so a page mixing library references and inline items has
a well-defined, visible order. Resolution happens inside the section
components themselves (`useWebsiteFaqEntries`/`useWebsiteTestimonialEntries`,
`enabled` only when `libraryEntryIds.length > 0`), the same pattern
`FeaturedCoursesSection`/`InstructorsSection` already established in
Prompt 9 for section-owned data fetching.

### Publish/Archive mirrors the existing Blog precedent, minus hard delete

`WebsiteContentService`'s publish/archive actions are dedicated `POST`
endpoints, never implicit in a field edit — the exact shape
`BlogService.publishPost`/`archivePost` (Prompt 5) already established.
There is deliberately no `deleteEntry`: Archive is the one, terminal,
non-destructive removal action for CMS content (section 12 of the spec:
"Do not silently hard-delete published business content"). Publish/
Archive on an entry are gated by `academy.website.publish` — the exact
same permission that already gates the website's own publish action —
distinct from `academy.website.manage`, which covers ordinary field
edits. Zero new permission strings were introduced anywhere in this
prompt.

### Blog/Announcements: reuse, not rebuild

`@features/blog` (Knowledge Blog, Prompt 5) and `@features/announcements`
(Prompt 5) already provide full draft/published/archived content
management with their own services, hooks, and pages. `WebsiteContentPage`'s
Blog & Announcements tab links out to those existing surfaces rather than
rebuilding either — the same "reuse, don't duplicate" decision Prompt 9's
Brand tab made for Academy Branding. Dynamic SEO for a Blog post
(`resolveBlogPostSeo`) reads `BlogPost`'s existing `title`/`excerpt`/
`featuredImage`/`status` fields directly; no new Blog content model, and
no new localized-content fields, were added to `BlogPost`.

### SEO is architecturally independent of Theme

`resolvePageSeo`/`resolveCourseSeo`/`resolveBlogPostSeo` and the
structured-data/sitemap builders are pure functions: they read
`WebsiteConfiguration.seo`/`WebsitePage.seo`/`Course`/`BlogPost`/`Academy`
and nothing else. None of them import from `themes/`, read a
`WebsiteThemeKey`, or touch a `--website-*` CSS token — verified by grep
across the whole `utils/` directory. Switching an Academy's theme changes
zero SEO values, by construction, not by convention.

### SEO resolution hierarchy

`resolvePageSeo` implements a deterministic three-tier hierarchy — Page
Override (`WebsitePage.seo`) → Website Global Default
(`WebsiteConfiguration.seo`) → Atlas System Fallback (caller-supplied,
e.g. the Academy's own name) — returning both the resolved value and
which tier it came from (`titleSource`/`descriptionSource`), so the UI
can show an Academy Owner exactly why a value is what it is.
`resolveCourseSeo`/`resolveBlogPostSeo` apply the same shape to dynamic
entities, reading the entity's own fields as the "override" tier (a
Course's `title` IS its SEO title unless a future dedicated Course SEO
field is added) before falling through to the website's global default
and the same system fallback. `WebsitePageSeoDialog` (new — Prompt 9 had
typed `WebsitePageSeo` with no editing surface anywhere) shows this
resolution live: "if you leave this blank, this page currently falls
back to X."

### Structured data and sitemap are documented contracts, not served output

`buildOrganizationJsonLd`/`buildCourseJsonLd`/`buildArticleJsonLd`/
`buildBreadcrumbJsonLd` are pure builders producing plain schema.org
fragments from real, typed Atlas data. `buildSitemapEntries` filters to
published, visible, indexable content only. Neither is wired into the DOM
via `dangerouslySetInnerHTML` or any script injection anywhere in this
prompt (verified absent by grep) — there is no public runtime yet to
crawl them. Both are shown as plain, read-only `<pre>`/list previews
(`WebsiteSeoTab`'s structured-data preview, `WebsiteOverviewPage`'s
sitemap preview) so an Academy Owner can see exactly what a future public
runtime would emit, without this prompt claiming to emit it.

### A second real naming collision, caught the same way as the first

Prompt 9 discovered and worked around a `Theme` collision with the
pre-existing dashboard light/dark theme system. This prompt hit a second,
independent collision: the new SEO breadcrumb shape was initially named
`BreadcrumbItem`, which already exists in `navigation.types.ts` (the
dashboard's own UI breadcrumb trail, an unrelated concept). `npx tsc`
caught the resulting type error immediately after the file was written,
before it ever reached lint or build; the SEO shape was renamed to
`SeoBreadcrumbItem`. Documented here because it reinforces the same
lesson Prompt 9 already recorded: grep for an existing symbol before
introducing a common, generic-sounding type name.

### Website Management information architecture

Added `WebsiteOverviewPage` as the new landing at the website's base
route (publish status, quick links into Pages/Content/Settings/Preview,
a read-only sitemap preview) and `WebsiteContentPage` (FAQs/Testimonials/
Blog & Announcements tabs) at a new `/website/content` route. The
existing `WebsiteSettingsPage` moved from the base route to
`/website/settings` to make room — its internal Theme/Brand/SEO/
Navigation tabs are unchanged. The Academy nav item now points at the
Overview landing instead of Settings directly.

### Module Design
| Area | Responsibility | Key Files |
|------|-----------------|-----------|
| CMS content types | `LocalizedText`, `WebsiteContentStatus`, `WebsiteFaqEntry`/`WebsiteTestimonialEntry` + create/update payloads | `src/types/website-content.types.ts` |
| SEO types | `ResolvedSeoMetadata`, `SeoResolutionSource`, `OrganizationJsonLd`/`CourseJsonLd`/`ArticleJsonLd`/`BreadcrumbJsonLd`, `SeoBreadcrumbItem`, `SitemapEntry`/`SitemapChangeFrequency` | `src/types/website-seo.types.ts` |
| SEO field extensions | `WebsiteSeoConfig`/`WebsitePageSeo` additive fields | `src/types/website.types.ts` |
| Section wiring | `FaqSectionConfig`/`TestimonialsSectionConfig.libraryEntryIds` | `src/types/website-section.types.ts` |
| Content service | `WebsiteContentService` — FAQ/Testimonial CRUD + publish/archive, academy-scoped | `src/features/website/services/WebsiteContentService.ts` |
| Content hooks | 12 hooks (list/get/create/update/publish/archive × 2 entities) | `src/features/website/hooks/` |
| SEO utilities | `resolvePageSeo`/`resolveCourseSeo`/`resolveBlogPostSeo`, structured-data builders, `buildSitemapEntries` | `src/features/website/utils/` |
| Content management UI | `WebsiteContentPage`, `WebsiteFaqContentTab`, `WebsiteTestimonialContentTab`, `WebsiteBlogContentTab` | `src/features/website/pages/`, `src/features/website/components/` |
| SEO editing UI | `WebsiteSeoTab` (extended), `WebsitePageSeoDialog` (new) | `src/features/website/components/` |
| Overview | `WebsiteOverviewPage` — new IA landing | `src/features/website/pages/WebsiteOverviewPage.tsx` |
| Query keys | `websiteKeys.faqEntries`/`faqEntry`/`testimonialEntries`/`testimonialEntry` (academy-scoped) | `src/services/query/query-keys.ts` |
| Routing | `websiteOverview` (new base path), `websiteSettings` (moved to `/settings`), `websiteContent` (new) | `route-paths.ts`, `AppRouter.tsx` |
| Localization | `website` namespace extended (240/240 keys, EN/AR parity verified programmatically) — no new namespace | `src/localization/resources/{en,ar}/website.json` |

### Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| CMS extends, doesn't replace, the Page Composer | `libraryEntryIds` is one additive field per config; `SectionConfigForm` gets a small picker, not a fork | Prompt 9's Page Composer, Section Registry and Renderer stay the single source of truth |
| `LocalizedText` scoped to CMS entries only | Prompt 9's existing content strings remain single-locale, unchanged | Real bilingual content need vs. not rewriting a shipped, validated content model for a benefit nobody asked for |
| One shared shape for FAQ/Testimonial entries, no generic content framework | Two concrete types + one pattern, not an abstract `ContentType`/`ContentEntry` system | Matches the spec's own warning against unnecessary abstraction |
| Archive, never hard-delete, for CMS content | `WebsiteContentService` has no `deleteEntry` | "Do not silently hard-delete published business content" |
| Blog/Announcements reused, not duplicated | `WebsiteContentPage`'s Blog tab links out to `@features/blog`/`@features/announcements` | Both already provide full lifecycle management; rebuilding either is the actual architectural error |
| SEO reads Theme never | Zero imports from `themes/`, zero token reads, in every SEO util | "SEO / Theme Independence" as a checked property, not only a stated intention |
| SEO resolution hierarchy is a pure function | `resolvePageSeo`/`resolveCourseSeo`/`resolveBlogPostSeo`, no service calls | Deterministic, testable, and same-shaped across every entity |
| Structured data / sitemap shown, never injected | Read-only `<pre>`/list previews, no `dangerouslySetInnerHTML` anywhere | No public runtime exists yet to crawl real JSON-LD/sitemap output |
| `SeoBreadcrumbItem`, not bare `BreadcrumbItem` | Renamed after a real collision with `navigation.types.ts` | Same naming discipline Prompt 9 established for `Website*` vs. `Theme*` |
| Website base route now `WebsiteOverviewPage` | Settings moved to `/website/settings` | One coherent Website Management surface per spec section 33, not scattered controls |

### Backend Contracts To Document (frontend-defined, backend TBD)
1. **FAQ/Testimonial entries** — `GET/POST /academies/:academyId/website/faq-entries`, `GET/PATCH .../faq-entries/:id`, `POST .../faq-entries/:id/publish`, `POST .../faq-entries/:id/archive`; identical shape under `testimonial-entries`. No delete endpoint is called by the frontend.
2. **Global/Page SEO** — persisted as sub-objects of the existing `WebsiteConfiguration`/`WebsitePage` resources via their existing update endpoints (Prompt 9) — no new SEO-specific endpoint was introduced.
3. **Structured data / sitemap** — not served by any endpoint in this prompt; documented here as the exact shape (`OrganizationJsonLd`/`CourseJsonLd`/`ArticleJsonLd`/`BreadcrumbJsonLd`, `SitemapEntry[]`) a future public-runtime backend should be able to produce from the same underlying Academy/Course/BlogPost/WebsitePage data this frontend already reads.
4. **Robots** — `WebsiteSeoConfig.robotsIndexable`/`WebsitePageSeo.indexable` are the frontend-owned configuration inputs; an actual `robots.txt` response is a future public-runtime concern, not implemented here.

### Security / Tenancy Verification
- **Cross-Academy leakage**: every new hook (`useWebsiteFaqEntries`, etc.) requires an explicit `academyId` argument with no default; every new query key (`websiteKeys.faqEntries`, etc.) embeds it; every new service call passes it as a URL path segment, never in a request body — verified by grep across the entire feature.
- **Fail-closed authorization**: all 6 website routes (2 new, 4 pre-existing) go through the unmodified `RouteGuard`; grep confirms 63/63 `RouteGuard` instances across the whole router still explicitly set `requireAuthentication`.
- **No new permission vocabulary**: grep across the feature, its routes, and its nav config confirms only the 3 pre-existing `academy.website.view`/`manage`/`publish` strings appear anywhere.
- **No client-executable configuration**: grepped the entire feature for `dangerouslySetInnerHTML`, `eval`, `new Function`, and raw `<script>` — none found (including the new structured-data preview, which renders as plain text).
- **No fake backend**: grepped for `setTimeout`/`setInterval` used to simulate save/publish/fetch latency, and for any `localStorage`-as-persistence pattern — none found.
- **Draft never leaks**: `FaqSection`/`TestimonialsSection` only ever resolve library entries with `status: 'published'`; the management UI (`WebsiteContentPage`) intentionally shows all statuses, gated behind the same `academy.website.view`/`manage` permissions the rest of the feature already requires.

### What Is Frontend-Only (No Real Backend Behind It Yet)
Every new service method issues a real HTTP call through the existing
`apiClient` against a documented endpoint shape, consistent with every
prior prompt. There is no real search-engine indexing, no real sitemap/
robots serving, and no real structured-data crawling behind any of it —
the SEO domain's job in this prompt is to model the data and resolution
rules correctly and show what a future public runtime would produce,
never to produce it.

### Scope Boundary
Explicitly not implemented in Prompt 10: any public website
runtime/serving of `robots.txt` or `sitemap.xml`, real DNS/SSL/CDN,
custom-domain provisioning, a rewrite or duplication of the Course/
Instructor/Blog/Announcement/Academy Branding domains, a generic
`ContentType`/`ContentEntry` CMS framework, hard delete of CMS content,
new content types beyond FAQ/Testimonial entries (Events/Partners/Team
Members remain a documented future extension, not built now), bilingual
localization of Prompt 9's existing page/section content strings, and any
new permission beyond the 3 that already existed. These remain explicitly
future work — the point of this prompt's architecture is that a future
public-runtime backend can serve real search-engine-facing output
directly from the CMS/SEO contracts built here, without the frontend
needing a rewrite.

---

## Atlas Public Website Runtime + Full Website CMS + Domain/Cloudflare Readiness (Prompt 11)

Four objectives, all built as extensions of Prompt 9's Theme Engine/Page
Composer/Renderer and Prompt 10's CMS/SEO — never a rewrite of either.
(A) closes real content-editing gaps found by auditing the Section
Registry; (B) turns the authenticated `WebsitePreviewPage` architecture
into an actual public website runtime; (C) wires Prompt 10's SEO/
structured-data/sitemap/robots contracts into real runtime behavior; (D)
builds a complete, honest Domain/DNS/SSL/CDN/Cloudflare readiness layer
that stays truthfully "not configured" until a real Atlas domain and
Cloudflare account exist.

### CMS audit findings, not invented fields

Section 4 of the spec explicitly warned against inventing fields a
section doesn't need. The audit (inspecting every `SectionConfigMap`
type, every renderer, every editor field) found the real gaps were
narrow: no image anywhere carried alt text, `HeroSectionConfig` had no
`eyebrow`, and — the single most significant finding — `CtaFieldEditor`
(the one generic CTA editor `SectionConfigForm` reuses for every Hero/
CTA-banner button) only ever exposed a page picker. `WebsiteCta.url` had
existed as a typed field since Prompt 9 with **no way to reach it from
the UI at all**. Everything else the spec's Hero example lists (title,
subtitle, description, button labels) was already fully editable via the
existing Prompt 9 `SectionConfigForm` — confirmed by inspection, not
rebuilt. `mobileImage`/`backgroundImage` from the spec's example were
deliberately NOT added: no responsive art-direction infrastructure
exists anywhere else in Atlas's image handling (`WebsiteImageField` is a
single-image picker throughout), and building a second image slot per
breakpoint for a capability no user story asked for would have been the
over-engineering the spec itself warns against elsewhere.

### `WebsiteCta` extended, never replaced

`WebsiteCta` gained one new optional field, `courseId`, alongside its
existing `label`/`pageId`/`url` — additive, every page saved before this
prompt renders identically. Precedence when resolving
(`resolveWebsiteCtaHref`) is `courseId` → `pageId` → `url`; the CTA
editor's Link Type selector keeps exactly one of them populated at a
time, but the resolver degrades safely regardless. Blog Post and
Announcement were deliberately **not** added as link-target types: an
audit found neither has a public rendering surface today (Blog is an
authenticated dashboard feature gated by `blog.view`; Announcements by
`announcement.view`) — offering them as public website link targets
would have been exactly the "fake reference" the spec forbids. Course
was added because `CourseDetailsTemplate`/`/courses/:courseId` already
fully exist as a genuine public rendering path.

### `isSafeExternalUrl` — one URL-safety boundary, reused everywhere

A single util rejects any URL whose scheme isn't `http:`/`https:`/
`mailto:`/`tel:` (blocking `javascript:`/`data:`/`vbscript:`/`file:`).
Applied at the Zod-schema boundary (`websiteCtaSchema`'s `.refine()`) and
inline in `WebsiteNavigationTab`'s social-link/header-CTA persist paths —
the same function, never a per-field reimplementation.

### One render seam turns "preview" into "real navigation," never a second renderer

`WebsiteLinkRenderer` is a small, optional prop
(`{href, external, className, children} → JSX.Element`) threaded through
`WebsiteRenderer` → `SectionRenderer` → `HeroSection`/`CtaSection`/
`WebsiteHeader`/`WebsiteFooter`. Every dashboard preview context (Theme
gallery mini-preview, Page Editor live preview, `WebsitePreviewPage`)
leaves it `undefined` — CTAs/nav render exactly as inert as they did
before Prompt 11, zero behavior change. The public runtime is the ONLY
caller that supplies a real implementation: react-router's `Link` for
internal paths, a plain `<a target="_blank" rel="noopener noreferrer">`
for external URLs. This is what "the public runtime and dashboard
preview must use the same renderer" (spec section 11) means in practice
— one component, one contract, a caller-supplied navigation strategy.

### Public runtime mounting: a hostname branch, not a parallel route tree

`AppRouter` calls a new pure function, `resolvePublicWebsiteContext`,
**once**, before choosing which `<Routes>` tree to render. When it
resolves to `{mode: 'academy-website'}`, `AppRouter` renders
`PublicWebsiteRouter` **instead of** the normal dashboard/auth/marketing
tree — never alongside it, so there is no path collision with Atlas's
own `/` marketing route (`PUBLIC_ROUTES.home`). This mirrors exactly how
a real Cloudflare Worker would eventually route traffic by hostname at
the edge — the SPA faithfully reproduces that branching today, and the
future edge layer becomes a caching/performance optimization in front of
behavior that is already correct, not a behavior change.

### No real Atlas domain, proven safe by construction

`resolvePublicWebsiteContext(hostname, search, platformBaseDomain,
isDevelopment)` is a pure, directly-testable function. When
`platformBaseDomain` is `undefined` — `ENV.platformBaseDomain`, sourced
from an optional `VITE_PLATFORM_BASE_DOMAIN` env var that is never given
a fallback fake value — the function returns `{mode: 'atlas-app'}`
**unconditionally**, regardless of hostname. Since no environment today
sets this variable, the entire public-runtime branch is provably inert
everywhere except when a developer explicitly opts in via the
development-only `?__atlas_academy_preview=<slug>` query override. This
is the concrete mechanism behind "the application must continue working
without a real platform domain" (spec section 13) — not a policy, a
structural guarantee.

### `PublicWebsiteService`: a third service tree, mirroring existing precedent

Distinct from `WebsiteConfigurationService` for the same reason
`InstructorService`/`PlatformPaymentService`/`PlatformProvisioningService`
were each their own tree: the authorization shape is completely
different (no session; Academy identity comes FROM the hostname, never a
client-supplied `academyId` — `useParams` is never used anywhere in
`@features/public-website`, verified by grep) and the data is
published-only by contract. `resolveHostname`/`getPublishedPage` return
`null` for a genuinely unrecognized hostname/slug rather than throwing —
an expected outcome for a public visitor, not an exceptional one — while
network/server failures still propagate as real query errors, so
`usePublicWebsiteData` can distinguish "not found" from "unavailable."

### `usePublicWebsiteData`: one exhaustive state, three consumers

Composes `useResolveHostname` + `usePublishedWebsite` +
`usePublishedPages` into `loading | not-found | unavailable | unpublished
| ready`. The page renderer, `/robots.txt`, and `/sitemap.xml` all
consume this SAME hook — a domain that doesn't resolve, one whose website
was never published, and one that's temporarily unreachable are each
handled identically everywhere they're relevant, never three divergent
error-handling implementations.

### SEO runtime: `document.head` management with zero `dangerouslySetInnerHTML`

No head-management library (`react-helmet` or equivalent) exists
anywhere in this stack — verified via `package.json`. `useDocumentSeo`
manages `document.title` and upserts/cleans up `<meta>`/`<link
rel="canonical">` tags via plain DOM APIs, tagging every element it
creates and sweeping them on every change/unmount so client-side
navigation between public pages never accumulates stale metadata.
Structured data (JSON-LD) is emitted via
`document.createElement('script'); script.type = 'application/ld+json';
script.textContent = JSON.stringify(entry)` — `textContent` is never
HTML-parsed, so this achieves real, crawlable structured-data output
with **zero** `dangerouslySetInnerHTML` anywhere in the entire feature
(confirmed by grep) — a strictly safer mechanism than the injection
pattern the spec cautioned against, not merely a "justified exception"
to it.

### Structured-data builders narrowed, not duplicated

`buildOrganizationJsonLd`/`buildCourseJsonLd` (Prompt 10) took a full
`Academy` parameter. The public runtime only ever has
`HostnameResolution`'s narrower summary (`academyId`/`academyName`/
`academySlug`/`academyLogo`) — fetching a full `Academy` record just for
structured data would have been an unnecessary second request. Both
signatures were narrowed to `Pick<Academy, ...>` — a full `Academy`
still satisfies the narrower shape structurally, so every existing
Prompt 10 call site (`WebsiteSeoTab`) kept working unchanged.

### robots.txt / sitemap.xml: honest content, honest boundary

`generateRobotsTxt`/`generateSitemapXml` are pure string generators;
`generateSitemapXml` reuses Prompt 10's `buildSitemapEntries` completely
unchanged for WHICH content qualifies (published, visible, indexable
only). Both are rendered as visible plain text at `/robots.txt`/
`/sitemap.xml` routes. This is explicitly documented as **not** real
`Content-Type: text/plain` HTTP serving: a pure client-rendered SPA
cannot control the response headers for an arbitrary path — every static
host and Vite's own dev server serve non-asset paths as the SPA shell
(`text/html`). Real serving requires a server/edge component (the
Cloudflare Worker this prompt's own architecture anticipates). What
exists today is the exact, correctly-generated content that future layer
would serve verbatim — an honest "here is the payload, not yet the HTTP
contract" boundary, consistent with "do not pretend infrastructure is
production-live."

### Domain/DNS/SSL/CDN: reuse Prompt 8's vocabulary, add only what's new

`DomainStatus`/`DomainVerificationRecord`/`DomainConnection`/
`SubdomainAllocation` (Prompt 8, `provisioning.types.ts`) are imported
and reused **verbatim** for the ongoing Academy domain-management
surface — no parallel status vocabulary was invented. What Prompt 8
genuinely didn't need is new: `SslStatus`/`CdnStatus`/
`InfrastructureProviderStatus` (every status defaults to its
"not configured" end; `connected` is reported by the backend, never
assumed `true` by the frontend) and `PlatformDomainConfiguration` (a
Platform-wide singleton). `DomainService` is nested under the SAME
`academies/:academyId/website/...` tree `WebsiteConfigurationService`/
`WebsiteContentService` already established — a new sub-resource on the
existing tree, not a parallel one.

### `PlatformDomainService` mirrors Trial Policy's precedent exactly

One backend-configurable settings resource (`PlatformDomainConfiguration`)
doesn't justify its own dedicated multi-file service architecture —
`PlatformDomainService` is a small, focused service, and
`usePlatformDomainConfiguration` seeds `initialData` with
`DEFAULT_PLATFORM_DOMAIN_CONFIGURATION` (marked stale via
`initialDataUpdatedAt: 0`) exactly like `useTrialPolicy` seeds
`DEFAULT_TRIAL_POLICY` — a compiled bootstrap default immediately
superseded by the real backend response. `PlatformDomainSettingsPage`
mirrors `PlatformTrialPolicyPage` structurally: `requiredRoles:
['platform_owner']` at the route/nav level, zero new permission strings.

### No fake infrastructure, verified by grep

Every domain-adjacent service method issues one real HTTP call and
returns whatever the backend reports — no `setTimeout`-simulated
provisioning, no hardcoded "Active"/"Connected" value, no fake Cloudflare
API response, anywhere in `@features/domain` or `@features/public-website`
(confirmed by grep for `setTimeout`/`setInterval`/hardcoded status
literals). `WebsiteDomainTab` and `PlatformDomainSettingsPage` both
render the literal "not configured" state as their default and only
truthful state today.

### Module Design
| Area | Responsibility | Key Files |
|------|-----------------|-----------|
| CMS gap-closure | `WebsiteCta.courseId`, alt-text/eyebrow fields, `isSafeExternalUrl`, rebuilt `CtaFieldEditor` | `src/types/website-section.types.ts`, `src/features/website/utils/url-safety.utils.ts`, `src/features/website/components/SectionConfigForm.tsx` |
| Link resolution + real navigation | `resolveWebsiteCtaHref`/`resolvePagePath`/`isExternalHref`, `WebsiteLinkRenderer` seam through Renderer/Header/Footer/Hero/Cta | `src/features/website/utils/link-resolution.utils.ts`, `src/features/website/renderer/website-link-renderer.types.ts` |
| `@features/website` public barrel | Curated cross-feature export surface (renderer + pure utils) | `src/features/website/index.ts` |
| Domain types/services/hooks | `AcademyDomainConfiguration`/`PlatformDomainConfiguration`, `DomainService`/`PlatformDomainService`/`InfrastructureService`, 7 hooks | `src/types/domain.types.ts`, `src/features/domain/` |
| Domain UI | `WebsiteDomainTab` (Academy), `PlatformDomainSettingsPage` (Platform Owner) | `src/features/domain/components/`, `src/features/domain/pages/` |
| Public runtime service/hooks | `PublicWebsiteService`, `usePublicWebsiteData`, `useDocumentSeo` | `src/features/public-website/services/`, `src/features/public-website/hooks/` |
| Hostname resolution | `resolvePublicWebsiteContext`/`getCurrentPublicWebsiteContext` | `src/features/public-website/utils/hostname-resolution.utils.ts` |
| Page/path resolution | `resolvePathToPage` | `src/features/public-website/utils/page-resolution.utils.ts` |
| SEO/structured-data/sitemap runtime | `generateRobotsTxt`/`generateSitemapXml`, narrowed `buildOrganizationJsonLd`/`buildCourseJsonLd` | `src/features/public-website/utils/robots-sitemap.utils.ts`, `src/features/website/utils/structured-data.utils.ts` |
| Public route tree | `PublicWebsiteRouter`, `PublicWebsitePage`, `PublicWebsiteStatus`, robots/sitemap routes | `src/features/public-website/PublicWebsiteRouter.tsx`, `src/features/public-website/components/` |
| Environment | `ENV.platformBaseDomain` (optional, never a fake default) | `src/config/env.config.ts` |
| Localization | `website` namespace extended (319/319 keys); `validation`/`navigation` extended | `src/localization/resources/{en,ar}/{website,validation,navigation}.json` |

### Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| CMS gaps closed additively, not rebuilt | New optional fields only; existing content stays editable via the same `SectionConfigForm` | Prompt 9's Page Composer/Section Editor remain the single system, per spec section 3 |
| No responsive art-direction fields (`mobileImage`/`backgroundImage`) | Deliberately not added | No such infrastructure exists elsewhere in Atlas; avoids over-engineering for an unrequested capability |
| Blog Post/Announcement excluded as CTA link targets | Only Internal Page / External URL / Course supported | Neither has a public rendering surface today; offering them would be a fake/dead reference |
| `WebsiteLinkRenderer` as an optional prop, not a context | Explicit, fully-controlled component, caller decides navigation strategy | Keeps every dashboard preview context's behavior byte-for-byte unchanged |
| Public runtime mounted instead of, never alongside, the dashboard tree | One hostname branch at the top of `AppRouter` | No path collision with Atlas's own `/`; mirrors real edge-routing behavior |
| `platformBaseDomain` absence ⇒ public runtime provably inert | Early-return in `resolvePublicWebsiteContext` | The literal mechanism behind "must work with no real domain" |
| `PublicWebsiteService` is a third, separate tree | Not an extension of `WebsiteConfigurationService` | Different auth shape (none) and data contract (published-only); mirrors `InstructorService`/`PlatformPaymentService` precedent |
| JSON-LD via `textContent`, not `dangerouslySetInnerHTML` | `document.createElement('script').textContent = JSON.stringify(...)` | Strictly safer than the injection pattern the spec cautioned about — never HTML-parsed |
| robots.txt/sitemap.xml shown as content, not claimed as served | Explicit "future edge layer" boundary documented | A pure SPA cannot control response `Content-Type` for arbitrary paths |
| Domain/SSL/CDN types reuse Prompt 8's vocabulary | Import `DomainStatus`/`DomainConnection`/etc. verbatim | No duplicate state machine; extends exactly what was missing |
| `PlatformDomainService` mirrors Trial Policy | Same `initialData`-seeded singleton-config pattern | Established, proven idiom for "one backend-configurable value" |

### Backend Contracts To Document (frontend-defined, backend TBD)
1. **Public website resolution** — `GET /public/websites/resolve?hostname=...` → `HostnameResolution | 404`; `GET /public/websites/:academyId` → published `WebsiteConfiguration` only; `GET /public/websites/:academyId/pages` / `.../pages/:slug` → published, visible pages only. The backend is the sole authority that draft content never reaches these responses.
2. **Academy domain configuration** — `GET/POST/DELETE .../website/domain[/custom-domain]`, `POST .../website/domain/verify` → `AcademyDomainConfiguration`. No real DNS/SSL/CDN action is performed by any frontend call; the backend orchestrates real infrastructure (if/when connected) behind these exact contracts.
3. **Platform domain configuration** — `GET/PATCH /platform-domain` → `PlatformDomainConfiguration`, a singleton resource.
4. **Infrastructure provider status** — `GET /infrastructure/:provider/status` → `InfrastructureProviderStatus`. Credentials themselves never appear in any request/response body this frontend reads.
5. **Robots/Sitemap serving** (not implemented; documented for a future edge layer) — the future Cloudflare Worker/backend should call the same `generateRobotsTxt`-equivalent logic (or its backend counterpart) to serve real `Content-Type: text/plain` responses at `/robots.txt`/`/sitemap.xml` for each resolved Academy hostname.

### Security / Tenancy Verification
- **Hostname trust**: Academy identity is established ONLY via `resolveHostname`'s authoritative backend response; `useParams` is never used anywhere in `@features/public-website` (verified by grep) — a visited hostname can never smuggle an arbitrary `academyId`.
- **Cross-Academy leakage**: every public hook (`usePublishedWebsite`, `usePublishedPages`, `usePublishedPage`) requires an explicit `academyId` argument with no default; every query key (`publicWebsiteKeys.*`) embeds it or the hostname.
- **Draft/hidden/archived never public**: `usePublicWebsiteData` checks `configuration.status === 'published'` before ever exposing content; `resolvePathToPage` excludes any page with `visible: false`; `buildSitemapEntries` (Prompt 10, reused unchanged) already excludes drafts/hidden/archived/unpublished content.
- **No unsafe URL schemes**: `isSafeExternalUrl` rejects `javascript:`/`data:`/`vbscript:`/`file:`, enforced at both the Zod-schema boundary and every inline persist path; verified by grep that no unvalidated `url` field reaches a rendered `href`.
- **No secrets client-side**: grepped the entire codebase for `CLOUDFLARE`/Cloudflare-token-shaped strings — none found; `InfrastructureProviderStatus` only ever carries a boolean `connected` flag, never a credential.
- **No fake infrastructure**: grepped `@features/domain`/`@features/public-website` for `setTimeout`/`setInterval` used as progress simulation and for hardcoded "active"/"connected"/"verified" literals — none found.
- **No new permission vocabulary**: grepped the entire feature, its routes, and its nav config — only the pre-existing `academy.website.view`/`manage` and the `platform_owner` role gate appear anywhere.
- **Route guard regression check**: 64/64 `RouteGuard` instances across the authenticated router explicitly set `requireAuthentication` (the public runtime's own tree is intentionally ungated — a different tree, never mounted alongside the authenticated one).

### What Is Frontend-Only (No Real Backend/Infrastructure Behind It Yet)
Every new service method (`PublicWebsiteService`, `DomainService`,
`PlatformDomainService`, `InfrastructureService`) issues a real HTTP call
through the existing `apiClient`, consistent with every prior prompt.
There is no real DNS record creation, SSL certificate issuance, CDN
configuration, or Cloudflare account connection behind any of it — every
status defaults to "not configured," and the frontend never marks any of
it active on its own. `robots.txt`/`sitemap.xml` show real, correctly
generated content but are not genuinely served with correct HTTP
semantics from this pure client SPA — that remains a future edge/backend
layer's responsibility, built to consume exactly the contracts
documented above.

### Scope Boundary
Explicitly not implemented in Prompt 11: any real domain purchase/
registration, real DNS record creation or mutation, real SSL certificate
issuance, real CDN/Cloudflare account connection or configuration, real
`Content-Type: text/plain` HTTP serving of `robots.txt`/`sitemap.xml`
(shown as content only), Blog Post/Announcement as public website link
targets (no public rendering surface exists for either), responsive
art-direction image fields (`mobileImage`/`backgroundImage`), a second
Page Composer/Section Editor/renderer/CMS/authorization/upload system,
and any new permission beyond the pre-existing `academy.website.*`
vocabulary and `platform_owner` role. These remain explicitly future
work — the point of this prompt's architecture is that a real Atlas
domain and Cloudflare account can be connected later, and a real edge/
worker layer built, entirely behind the contracts and boundaries
established here, without the frontend needing a rewrite.

