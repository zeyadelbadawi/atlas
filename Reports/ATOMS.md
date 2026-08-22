---
last_updated: 2026-08-22T01:00:00Z
status: active
---

# Project Context

## Project Overview

Atlas Platform - Prompt 4 Implementation (Student Learning & Assessment)
Current Phase: Student-facing learning experience, built on top of completed Platform Core + Academy Management + Course Management
Scope: Course discovery, enrollment, curriculum navigation, lesson consumption, progress, quizzes, quiz attempts, assignments, assignment submissions, course completion, certificate-eligibility state
Previous Completion: Platform Core (9 features) + Academy Management + Course Management (Prompt 3 Parts A/B/C) - all APPROVED and PERMANENT
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

## Constraints

- MUST preserve all Prompt 1, Prompt 2, Prompt 3 Part A/B/C approved architecture
- NO duplicate infrastructure (auth, query, forms, services, API clients, tables, upload, dialogs)
- NO Instructor Management/Grading, Orders/Ecommerce/Payments, Certificate generation/PDF/verification, Website/CMS, Marketplace, Messaging, Live classes, Discussion forums, AI features (future scope)
- Student Learning & Assessment ONLY in this prompt
- NO real backend implementation or payment integration
- Components MUST use existing services via hooks - never direct API calls
- All text MUST use translation keys (English + Arabic, LTR + RTL)
- Light Mode + Dark Mode both required
- Responsive: Desktop, Tablet, Mobile
- Accessibility: WCAG compliant with keyboard navigation
- State completeness: Loading, Empty, Success, Error, Retry, Permission Denied, Submitting, Deleting, Uploading, Publishing, Unpublishing, Unsaved Changes, Locked, Passed, Failed, Submitted
- Every course belongs to exactly one academy; no cross-academy data leakage
- Every learning resource belongs to exactly one student; no cross-student data leakage


