---
last_updated: 2026-08-22T12:00:00Z
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

