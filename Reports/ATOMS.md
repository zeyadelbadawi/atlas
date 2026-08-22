---
last_updated: 2026-08-22T12:00:00Z
status: active
---

# Project Context

## Project Overview

Atlas Platform - Prompt 6 Implementation (Atlas SaaS Foundation, Tenancy, Subscriptions, Plans, Entitlements, Usage & Platform Admin)
Current Phase: The SaaS foundation that turns Atlas into a real multi-tenant product — Tenant (= Organization) subscription/usage/entitlements/add-ons for the Tenant Owner, and a Platform-Owner-only Trial Policy admin page — built on top of completed Platform Core + Academy Management + Course Management + Student Learning & Assessment + Instructor/Teaching + Communication & Knowledge Modules. Resumed mid-build after a prior session was interrupted; the recovery audit confirmed the existing foundation layer (types/constants/utils/services/query-key roots) was complete and correct, and preserved it unchanged.
Scope: Tenant Dashboard/Subscription/Usage/Add-ons (Tenant Owner, read-only), Platform Trial Policy (Platform Owner, the one genuine write in this prompt), a centralized upgrade-vs-add-on entitlement-gap model, and a reusable read-only Plan Comparison dialog — no payment provider, no real checkout, no tenant-provisioning flow
Previous Completion: Platform Core (9 features) + Academy Management + Course Management (Prompt 3 Parts A/B/C) + Student Learning & Assessment (Prompt 4) + Instructor / Teaching Operations + Communication & Knowledge Modules (Prompt 5) - all APPROVED and PERMANENT
Backend: Remains abstract - no real backend integration yet
Architecture: Extending existing foundation WITHOUT creating parallel infrastructure

## Key Decisions
| Date | Decision | By | Rationale |
|------|----------|-----|-----------|
| 2026-08-19 | Reuse existing Identity/Auth infrastructure | Alex | Prompt 2 already established authentication foundation - no duplicate systems |
| 2026-08-19 | All services remain backend-agnostic | Alex | Backend integration deferred to future prompts per Atlas architecture |
| 2026-08-19 | Role-based navigation uses existing authorization service | Alex | Maintain fail-closed permission model from Prompt 2 |
| 2026-08-19 | Platform Owner focus only - no Academy modules | Alex | Academy Management belonged to a future prompt at the time |
| 2026-08-19 | Academy module extends Platform Core | Alex | Prompt 3 Part A completed - Academy Management builds on top |
| 2026-08-19 | Academies belong to organizations | Alex | Consume existing organization context - no duplicate multi-tenancy |
| 2026-08-19 | Academy context via existing platform state | Alex | No new global state library - use existing Context + TanStack Query |
| 2026-08-19 | Academy scope: management only | Alex | NO courses, students, enrollments, orders, certificates - future prompts |
| 2026-08-22 | Replaced dead `requiredCapabilities` nav field with `requiredPermissions` | Claude | Field was never read by the nav filter; a second permission vocabulary was never intended - one authorization model only |
| 2026-08-22 | Course is nested under Academy in both routes and service paths (`academies/:academyId/courses/...`) | Claude | Mirrors AcademyService's own existing sub-resource pattern (members/stats/activity/branding) instead of inventing a new scoping convention |
| 2026-08-22 | Course query keys embed `academyId` directly | Claude | Switching academies produces different keys automatically - no stale cross-academy data possible, no manual invalidation wiring needed, mirrors how `academyKeys` embeds `organization.id` |
| 2026-08-22 | No new upload endpoint for course thumbnails | Claude | Verified no "upload file, get URL" contract exists anywhere in the codebase (same finding as Academy Branding in Part B); thumbnail stays a base64 string through the existing JSON PATCH contract, picked via the existing `useFilePicker`, validated against real size/type constants |
| 2026-08-22 | Curriculum reordering uses explicit move-up/move-down controls, not drag-and-drop | Claude | No DnD library exists in the project; explicit controls are keyboard-accessible and RTL-safe by construction with zero new dependencies, per the spec's own stated fallback |
| 2026-08-22 | Course scope: content authoring only | Claude | NO student learning, enrollment, orders, payments, certificates - future prompts |
| 2026-08-22 | Student Learning gets its own flat `courses/:courseId/...` service tree (Progress/Quiz/Assignment), separate from Course Management's academy-scoped `academies/:academyId/courses/...` tree | Claude | A student reaches a course by id alone (learned from their own enrollment), never from an academy id in the URL; two role-specific trees over the same underlying course is a normal REST pattern and keeps owner-facing and student-facing concerns from being conflated |
| 2026-08-22 | One new endpoint pair added to `CourseService`: `discoverCourses`/`discoverCourse` (flat `courses` resource, cross-academy) | Claude | No "list/get courses across every academy" contract existed anywhere; this is the only new endpoint shape in Prompt 4 - everything else reuses Prompt 3's services/hooks unchanged |
| 2026-08-22 | Every Student Learning query key embeds the current student's id | Claude | Prevents one student's cached progress/attempts/submissions from surfacing for a different student signed in in the same browser session - mirrors how `academyKeys`/`courseKeys` embed organization/academy id |
| 2026-08-22 | `studentId` is never an explicit hook/service parameter - always read from `useAuth().user.id` internally | Claude | Removes any code path that could address another student's data, by construction rather than by a check that could be forgotten |
| 2026-08-22 | Quiz answer correctness is never modeled on `QuizQuestionOption` | Claude | Guarantees the client is never sent correct answers before submission, at the type level rather than by convention |
| 2026-08-22 | Assignment attachments reuse `useFilePicker` + base64, same as Course thumbnails | Claude | No upload endpoint exists anywhere in the codebase (re-verified); consistent with the Part 3 precedent rather than inventing a second upload mechanism |
| 2026-08-22 | New top-level "Learning" nav section, not nested under Academy | Claude | A student's enrollments aren't scoped to one active academy, unlike Academy Owner's Course/Members/Branding items |
| 2026-08-22 | Every new Prompt 4 route explicitly sets `requireAuthentication` | Claude | Proactively avoids the exact Prompt 3 `RouteGuard` regression (nested guards defaulting `requireAuthentication` to `false`) - verified by grep across all 7 new routes |
| 2026-08-22 | Instructor gets a third flat service tree, `instructor/courses/:courseId/...` (`InstructorService`), separate from both Course Management's academy-scoped tree and Student Learning's flat student-self tree | Claude | An instructor's teaching scope is resolved server-side from `Course.instructors`, never a client-supplied id - a third authorization shape over the same Course entity, not duplication |
| 2026-08-22 | Instructor pages read quiz/assignment definitions and course status/visibility tone helpers directly through the existing, unmodified `QuizService`/`AssignmentService`/`course` utilities | Claude | A definition/tone-mapping contract isn't role-specific; only cross-student results (attempts/submissions/grading) needed a new service, per the "verify before inventing" discipline applied every prompt |
| 2026-08-22 | Grading is gated by a permission separate from viewing (`instructor.assignment.grade` vs `instructor.submission.view`) | Claude | Viewing a submission and being authorized to grade it are different capabilities; a route-level guard alone can't express this since both need to reach the same page |
| 2026-08-22 | Knowledge Blog is a new `BlogService`/`BlogPost` domain, explicitly documented as distinct from the pre-existing static marketing blog (`src/lib/blog.ts`) | Claude | The existing blog is a build-time, unauthenticated SEO surface; conflating it with a dynamic, permission-gated, dashboard-embedded feature would have been the actual architectural error, not a reuse opportunity |
| 2026-08-22 | Forum is one service (`ForumService`) for Forum/Thread/Reply, and its pages are mounted unmodified under both the student and instructor route trees | Claude | The domain is too small to fragment into three services; the page is role-agnostic, with create/moderate actions gated inline via `usePermissions` and enforcement left to the backend |
| 2026-08-22 | No global "active teaching course" state was introduced; Students/Assessments/Submissions/Discussions are reached via in-page quick links, not global sidebar items | Claude | These pages all require a specific `courseId`; a new global store just to add more sidebar entries would be over-engineering beyond what any workflow in this prompt needs |
| 2026-08-22 | Announcement/Blog featured content reuses `useFilePicker` + base64, same as Course thumbnails and Academy branding | Claude | No upload endpoint exists anywhere in the codebase (re-verified for this prompt) |
| 2026-08-22 | Every new Prompt 5 route explicitly sets `requireAuthentication` | Claude | Verified by grep: all 40 `RouteGuard` instances across the entire router now set it - the Prompt 3 regression was not repeated |
| 2026-08-22 | Organization remains the sole Tenant boundary - no `tenantId`, `TenantContext`, or parallel org-switching mechanism | Claude | The existing `organizationId`/`OrganizationContext`/`activeOrganizationId` already is the Tenant boundary; a second identity is the duplication the spec explicitly warns against |
| 2026-08-22 | Recovered the interrupted session's foundation (types/constants/utils/services/query-key roots) unchanged, extended only what was missing (`TrialPolicy`, `EntitlementGapAction`, trial-policy read/write, `tenantKeys`/`planKeys`) | Claude | The recovery audit found the existing work already correct - "do not recreate/duplicate/redesign completed work" applied literally |
| 2026-08-22 | Trial Policy lives on `PlanService`, not a fourth service | Claude | Mirrors the existing "Add-on catalog on `PlanService`, not `AddOnService`" reasoning already in that file; a dedicated config service would hold one write method |
| 2026-08-22 | `TenantService` has zero write methods; `PlanService.updateTrialPolicy` is the only mutation in the whole Tenant domain | Claude | No payment provider exists - an upgrade/add-on-purchase mutation would have to fake success. Trial Policy is platform configuration, not a purchase, so it's the one legitimate exception |
| 2026-08-22 | Upgrade/add-on guidance is centralized in `getLimitGapAction`/`getFeatureGapAction`, never `plan.key`/`plan.name` conditionals in a page | Claude | The spec's "no hardcoded plan behavior" rule, applied structurally - one function decides, every page reads the result |
| 2026-08-22 | `PlanComparisonDialog` is read-only with static "contact your Atlas representative" guidance - no Upgrade submit action | Claude | No checkout/payment exists; a functional-looking Upgrade button would misrepresent what the frontend can do |
| 2026-08-22 | `EffectiveEntitlements` is computed in `useEffectiveEntitlements` from two already-cached queries, never cached as its own query | Claude | A second cache entry for a pure function's output would be a second source of truth to keep in sync |
| 2026-08-22 | `DEFAULT_TRIAL_POLICY` is consumed as `useTrialPolicy`'s query `initialData` (marked stale immediately), not left as an unused reference constant | Claude | Makes "initial default, not a business rule" literally true rather than aspirational, and avoids an unused export a CTO audit would flag |
| 2026-08-22 | Platform Trial Policy is gated by `requiredRoles: ['platform_owner']`, structurally distinct from every Tenant page's `requiredPermissions: ['tenant.*.view']` | Claude | Matches the pre-existing Settings/Billing/Analytics precedent exactly; guarantees no permission string can imply the Platform Owner role |
| 2026-08-22 | Tenant query keys (`tenantKeys`) embed `organizationId`; catalog keys (`planKeys`) deliberately do not | Claude | Reuses the existing `academyKeys`/`PlatformProvider` org-switch invalidation technique with zero new wiring; the catalog and trial policy are the same for every Tenant, so scoping them by org would be incorrect |
| 2026-08-22 | Every new Prompt 6 route explicitly sets `requireAuthentication` | Claude | Verified by grep: all 45 `RouteGuard` instances across the entire router now set it - the Prompt 3 regression was not repeated |

## Constraints

- MUST preserve all Prompt 1, Prompt 2, Prompt 3 Part A/B/C, Prompt 4, Prompt 5 approved architecture
- NO duplicate infrastructure (auth, query, forms, services, API clients, tables, upload, dialogs)
- NO Orders/Ecommerce/Payments, Certificate generation/PDF/verification, Website/CMS, Marketplace, Messaging, Live classes, Video streaming, AI features, real auto-grading (future scope)
- Atlas SaaS Foundation (Tenant subscription/usage/entitlements/add-ons, Plan/Add-on catalog, configurable Trial Policy) ONLY in this prompt (Prompt 6) - NO real payment/checkout/billing integration, NO upgrade or add-on-purchase mutation, NO tenant-provisioning/onboarding flow, NO public pricing page, NO full Plan/Subscription CRUD admin UI
- An instructor's teaching scope is always resolved server-side from `Course.instructors` - never trusted from a client-supplied id, and never able to grant Academy Owner-level permissions
- Organization IS the Tenant boundary - NO parallel `tenantId`/`TenantContext`; every Tenant-scoped type carries `organizationId`
- Tenant Owner and Platform Owner administration are gated by two structurally different mechanisms (`requiredPermissions` vs. `requiredRoles`) - no permission can imply the other's access
- `TenantService` has NO write methods (no real payment provider exists); `PlanService.updateTrialPolicy` is the one legitimate exception (platform configuration, not a purchase)
- The trial policy's `7`-day default exists in exactly one place (`DEFAULT_TRIAL_POLICY`), consumed only as query `initialData` - never a hardcoded, unconfigurable business rule
- Upgrade-vs-add-on guidance is always decided by `getLimitGapAction`/`getFeatureGapAction` - NO `plan.key`/`plan.name` conditionals in a page
- NO real backend implementation or payment integration
- Components MUST use existing services via hooks - never direct API calls
- All text MUST use translation keys (English + Arabic, LTR + RTL)
- Light Mode + Dark Mode both required
- Responsive: Desktop, Tablet, Mobile
- Accessibility: WCAG compliant with keyboard navigation
- State completeness: Loading, Empty, Success, Error, Retry, Permission Denied, Submitting, Deleting, Uploading, Publishing, Unpublishing, Unsaved Changes, Locked, Passed, Failed, Submitted, Graded/Ungraded, Pinned/Locked (forum), Trialing/Past due/Grace period/Cancelled/Expired, Limit reached/Unlimited, Upgrade required/Add-on available (Prompt 6)
- Every course belongs to exactly one academy; no cross-academy data leakage
- Every learning resource belongs to exactly one student; no cross-student data leakage
- Every instructor-facing resource is scoped to courses that instructor is authorized to teach; no cross-instructor/cross-course data leakage
- Quiz correct answers are never modeled in any type/contract the client can read before submission (structural guarantee, carried forward unchanged from Prompt 4)
- Every Tenant-scoped resource (subscription/usage/add-ons) is scoped to `organizationId`; no cross-tenant data leakage, and no stale data survives an organization switch


