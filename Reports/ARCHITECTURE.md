---
last_updated: 2026-08-22T00:00:00Z
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

