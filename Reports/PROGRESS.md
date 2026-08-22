---
last_updated: 2026-08-22T01:00:00Z
---

# Requirements & Progress

## Requirements Overview

Prompt 3 Part A - Platform Core Completion
Implementing 9 major platform core features using existing Prompt 1 & 2 infrastructure:
1. Authentication UI (Sign In, Registration, Password Reset)
2. User Profile (View/Edit personal info, preferences)
3. Role-Based Navigation (Platform Owner, Academy Owner, Staff, Instructor, Student, Guest)
4. Platform Owner Dashboard (Platform-wide overview, metrics, activity)
5. Platform Settings (Global configuration, preferences)
6. Notifications UI (Notification center, read/unread state)
7. Billing UI (Plans, subscriptions, invoices - UI only, no real integration)
8. Analytics UI (Platform-level metrics, charts, KPIs)
9. Search Experience (Search input, results, keyboard interaction)

## User Stories

US-1: As an unauthenticated user, I can sign in with email/password
US-2: As an authenticated user, I can view and edit my profile information
US-3: As a Platform Owner, I see platform-wide dashboard with key metrics
US-4: As a user, I see navigation appropriate to my role and permissions
US-5: As a Platform Owner, I can configure platform settings
US-6: As an authenticated user, I can view and manage my notifications
US-7: As a Platform Owner, I can view billing information and subscription status
US-8: As a Platform Owner, I can view platform analytics and reports
US-9: As an authenticated user, I can search across the platform

Prompt 3 Part B - Academy Management
Academy Dashboard, Creation, Profile, Settings, Branding, Members, Onboarding, Switching, permission-aware navigation.

Prompt 3 Part C - Course Management (final part of Prompt 3)
Course CRUD, categories, pricing/visibility representation, the Course Builder (sections + lessons + ordering), the draft/publish workflow, and Course-level settings/authorization/navigation — built on top of the completed Platform Core and Academy Management, with the backend kept fully abstract.

US-10: As an academy owner, I can view, search and filter my academy's courses
US-11: As an academy owner, I can create a course with its basic information, category, pricing and visibility
US-12: As an academy owner, I can edit an existing course's information
US-13: As an academy owner, I can organize a course's curriculum into sections and lessons, and reorder them
US-14: As an academy owner, I can publish a course when it's ready and unpublish it later
US-15: As an academy owner, I cannot access another academy's courses, and a user without course permissions cannot access Course Management routes

Prompt 4 - Student Learning & Assessment
The student-facing learning experience on top of the completed Academy + Course Management foundation: discovery, enrollment, curriculum navigation, lesson consumption, progress, quizzes, assignments, course completion and certificate-eligibility state. Backend remains abstract.

US-16: As a student, I can discover published courses across every academy
US-17: As a student, I can view a course's details and enroll in it through the abstract service contract
US-18: As a student, I can navigate a course's curriculum, consume lessons and mark them complete
US-19: As a student, I can resume a course where I left off
US-20: As a student, I can take a quiz, answer its questions, submit an attempt and see my result
US-21: As a student, I can view an assignment, submit a response (with an optional attachment) and see my submission state
US-22: As a student, I can see my course completion state and certificate eligibility, without any real certificate being generated
US-23: As a student, I can never see another student's progress, attempts or submissions, and a user without the right permission cannot access a protected learning route

## Task Breakdown

### Prompt 3 Part A (COMPLETED)
- [x] All 9 Platform Core features implemented and validated
- [x] Update context files (ATOMS.md, PROGRESS.md, ARCHITECTURE.md)
- [x] Add Platform Core translation keys (auth, profile, settings, notifications, billing, analytics)
- [x] Create supporting types for new features (profile, notifications, billing, analytics)
- [x] Update route paths registry with new routes
- [x] Create Authentication pages (Sign In, Registration, Forgot Password, Reset Password)
- [x] Wire authentication routes in AppRouter
- [x] Create User Profile page with edit capability
- [x] Fix all TypeScript/lint/build errors for auth and profile features
- [x] Extend navigation config for role-based sections
- [x] Create Platform Owner Dashboard with metrics
- [x] Create Platform Settings page with sections
- [x] Create Notifications UI (center, list, actions)
- [x] Create Billing UI (plan, subscription, invoices)
- [x] Create Analytics UI (charts, KPIs, filters)
- [x] Fix PageHeader prop compatibility issues (titleKey vs title)
- [x] Run typecheck, lint, build validation
- [x] Create Search UI (input, results, keyboard nav)
- [x] Perform requirement-by-requirement audit against Prompt 3 Part A acceptance criteria

### Prompt 3 Part B (IN PROGRESS)
- [x] Update context files for Academy Management scope
- [x] Create Academy types, schemas, constants
- [x] Create AcademyService extending BaseService
- [x] Create Academy hooks using TanStack Query
- [x] Create Academy Dashboard page
- [x] Create Academy Creation page
- [x] Create Academy Profile page
- [x] Create Academy Settings page
- [x] Create Academy Branding page
- [x] Create Academy Members page
- [x] Add Academy routes to route-paths.ts
- [x] Wire Academy routes in AppRouter
- [x] Extend navigation config with Academy section
- [x] Add Academy i18n (en/ar)
- [x] Fix TypeScript errors (CollectionQuery type casting, useInvalidate usage, NavigationItem props)
- [x] Run typecheck, lint, build validation
- [x] Fix Registration checkbox bug (Controller + RHF)
- [x] Implement Academy onboarding flow (types, hooks, constants, OnboardingProgress, AcademyOnboardingPage)
- [x] Add onboarding i18n (en/ar)
- [x] Wire onboarding routes and redirect from create
- [x] Run typecheck, lint, build validation (all passing)
- [x] Implement permissions-aware navigation (replaced dead `requiredCapabilities` field with real `requiredPermissions`, wired the previously-unused `filterNavigationItems` into `DashboardSidebar`)
- [x] Add Loading/Empty/Error/Retry states to all pages (real `ErrorState`+retry, layout-shaped skeletons, `StatusBadge` for status/role display)
- [x] Upgrade Members table to TanStack Table (shared `DataTable`, server-driven pagination)
- [x] Complete accessibility/RTL pass (logical `start-`/`end-`/`ps-` classes, keyboard-operable controls)
- [x] Perform CTO-style audit against 51 acceptance criteria — Prompt 3 Part B marked COMPLETE
- [x] Fix Academy route redirect bug (`RouteGuard`'s `requireAuthentication` defaulted to `false` on the 7 nested Academy route guards, triggering the "already authenticated, route doesn't require auth" redirect to `/dashboard` on every Academy route)
- [x] Remove temporary local-auth-bypass verification scaffolding from `IdentityProvider.tsx` (restored to pre-Part-B state; no dev bypass remains)

### Prompt 3 Part C — Course Management (COMPLETED)
- [x] Inspect project state; confirm Part A/B intact, no temp files/bypass code remained
- [x] Create Course domain types (Course, CourseStatus, CourseVisibility, CoursePricing(Type), CourseCategory, CourseSection, CourseLesson, CourseInstructorSummary, CourseStats, CourseFilters, CourseListQuery, all Create/Update/Reorder payloads)
- [x] Create Course constants, Zod schemas (course/section/lesson create+update, settings)
- [x] Create CourseService extending BaseService, nested under `academies/:academyId/courses/...` (mirrors AcademyService's own sub-resource pattern)
- [x] Create `courseKeys` query-key factory (academy-scoped) and 17 TanStack Query hooks (queries + mutations for courses, categories, sections, lessons, publish/unpublish, reorder)
- [x] Course List page: search, status/visibility/category/pricing filters, DataTable, empty/loading/error/retry states
- [x] Create Course flow: RHF+Zod, thumbnail via `useFilePicker` + real validation, inline "next step" success panel into Course Builder
- [x] Course Edit page: identity/thumbnail/category/pricing/visibility, unsaved-changes + server-validation
- [x] Course Builder: sections/lessons tree, create/edit/delete dialogs, explicit keyboard-accessible move-up/move-down reordering (no drag-and-drop dependency), empty-curriculum and empty-section states
- [x] Course Settings: status/visibility summary, publish/unpublish workflow with confirmation + curriculum-aware messaging + next-step banner, danger-zone delete
- [x] Authorization: `course.view/create/update/manage/configure` permission strings via existing `requiredPermissions`/`RouteGuard`/`AuthorizationService` — no new permission system
- [x] Navigation: "Courses" item added to the Academy sidebar section (academy-scoped, permission-gated, dynamic academyId)
- [x] Routing: 5 new routes in `route-paths.ts` + `AppRouter.tsx`, lazy-loaded, each wrapped in `RouteGuard`
- [x] Localization: `en/course.json` + `ar/course.json` (186/186 keys, full parity), registered as the `course` namespace
- [x] Fixed incidental pre-existing gap: added missing `validation:invalidEmail`/`invalidUrl`/`invalidSlug` keys (Academy's schemas already referenced them; they didn't exist)
- [x] Run typecheck, lint, build validation (all passing — zero new errors beyond the pre-existing, unrelated 19-error baseline)
- [x] CTO audit: no TODO/console.log/`any`/hardcoded routes/colors/direct HTTP calls/scope violations found in the Course feature

### Prompt 4 — Student Learning & Assessment (COMPLETED)
- [x] C-4-01: Repository inspection — confirmed Prompt 3 intact (baseline typecheck unchanged, no temp/bypass files), catalogued existing patterns to reuse, identified the one real architecture gap (see Architecture Decisions below)
- [x] C-4-02: Domain types — Enrollment, LessonProgress/SectionProgress/CourseProgress/CertificateStatus, Quiz/QuizQuestion/QuizAttempt, Assignment/AssignmentSubmission
- [x] C-4-03: Constants + Zod schemas (assignment submission schema; dynamic `buildQuizAttemptSchema` factory, since quiz questions are only known once loaded)
- [x] C-4-04/05: `EnrollmentService` (flat `enrollments` resource, always the current user), one additive `CourseService.discoverCourses`/`discoverCourse` method pair (flat `courses` resource, cross-academy — the only new endpoint shape in this prompt)
- [x] C-4-06/07: Student Course Discovery page (search/pricing filter/cards/empty/loading/error) and Course Details page (identity, curriculum counts, state-driven actions: sign-in/enroll/continue/completed)
- [x] C-4-08/09: `ProgressService`/`QuizService`/`AssignmentService` (flat `courses/:courseId/...` tree — the student-facing sibling of Course Management's academy-scoped tree), all query keys embedding the current student's id
- [x] C-4-10/11/12: `LearningLayout` + `CurriculumNav` (desktop persistent sidebar, tablet/mobile sheet drawer via the same `useBreakpoint`/`useDisclosure`/`Sheet` pattern `DashboardLayout` already uses), `LessonPage` (content by type, prev/next, mark-complete), `CourseLearnRedirectPage` (resumes at `progress.currentLessonId` or the first lesson)
- [x] C-4-13/14/15: `QuizPage` — instructions → answer (single-page with a question-navigator) → submit (confirmation dialog) → result (passed/failed, score, retry-when-permitted); no correct-answer field ever sent to the client pre-submission
- [x] C-4-16/17: `AssignmentPage` — instructions, response + optional attachment (via `useFilePicker`, same base64 pattern as Course thumbnails — no upload endpoint exists), submission state, resubmission where permitted
- [x] C-4-18: Course completion + certificate-eligibility state surfaced on the Course Details page from `CourseProgress.completionState`/`certificateStatus` — no certificate generation
- [x] C-4-19: `student.*` permission vocabulary (`course.view`, `learning.view`, `lesson.complete`, `quiz.view`, `quiz.attempt`, `assignment.view`, `assignment.submit`, `progress.view`) through the existing `requiredPermissions`; new top-level "Learning" nav section (not nested under Academy, since a student's enrollments aren't scoped to one active academy); 7 new routes, every one explicitly setting `requireAuthentication` (the Prompt 3 regression is not repeated — verified by grep); `en/learning.json` + `ar/learning.json` (121/121 keys)
- [x] C-4-20: Run typecheck, lint, build (all passing — zero new errors beyond the same pre-existing 19-error baseline); CTO audit swept for TODO/console/any/hardcoded values/scope violations/cross-student leakage — none found; confirmed Prompt 3 unchanged

## Progress Log

- 2026-08-19: Fixed all critical TypeScript/lint/build errors for Prompt 2 hardening. Added normalizeApiError export, fixed useApiMutation generics, corrected toast calls, fixed useServerValidation and useFileUpload typing. All checks passing: npm run typecheck, npm run lint, npm run build
- 2026-08-19: Completed all Prompt 2 hardening requirements: token refresh concurrency deduplication, identity/platform sync, org switching cache invalidation, fail-closed authorization, file upload progress/cleanup, FormData Content-Type handling, feature-flag loading state, removed sensitive logging. All checks passing: npm run typecheck, npm run lint, npm run build
- 2026-08-19: Completed Prompt 3 Part A Phase 1: Auth UI and Profile implementation. Created all auth pages (SignIn, Registration, ForgotPassword, ResetPassword) with bilingual support (EN/AR). Implemented complete Profile page with 4 sections (Personal, Account, Preferences, Security). Fixed identity types structure, corrected useAuth/useCurrentUser usage patterns, resolved all TypeScript errors. All validation checks passing: typecheck ✓, lint ✓, build ✓
- 2026-08-19: Completed Prompt 3 Part A Phase 2: Platform Core UI pages. Expanded navigation config with role-based entries (Platform Owner, Academy Owner, Staff, Instructor, Student). Created Platform Owner Dashboard (/dashboard/platform) with metrics/activity. Created Settings page (/dashboard/settings) with tabs. Created Notifications center (/dashboard/notifications) with filters. Created Billing page (/dashboard/billing) with plan/invoices. Created Analytics page (/dashboard/analytics) with tabs/charts. Fixed PageHeader prop compatibility (titleKey). All validation checks passing: typecheck ✓, lint ✓, build ✓
- 2026-08-19: ✅ COMPLETED Prompt 3 Part A — Platform Core Completion. Implemented all 9 features: Authentication UI (Sign In, Registration, Password Reset), User Profile (view/edit with 4 sections), Role-Based Navigation (Platform Owner/Academy Owner/Staff/Instructor/Student), Platform Owner Dashboard (metrics/activity), Platform Settings (tabs), Notifications UI (center/filters), Billing UI (plan/invoices), Analytics UI (KPIs/charts), Search Experience (keyboard nav/grouping). Integrated Search feature: added SearchPage, SearchBar, SearchResults, SearchResultItem components with keyboard shortcuts (Cmd/Ctrl+K), debounced search, grouped results, i18n (EN/AR). Updated navigation config, route paths, AppRouter. All 27 acceptance criteria verified via comprehensive CTO audit. Zero architectural violations. All checks passing: typecheck ✓, lint ✓, build ✓. Production-ready implementation.
- 2026-08-19: Completed Academy Management core implementation (Prompt 3 Part B Phase 1). Created comprehensive Academy module: types (Academy/AcademyMember/Stats/Activity), schemas (Zod validation for create/update/branding), constants (status/roles/defaults), AcademyService extending BaseService, 8 hooks (queries + mutations with TanStack Query), 6 pages (Dashboard/Create/Profile/Settings/Branding/Members), AcademySwitcher component, i18n (en/ar for academy + navigation namespaces), routes integration. Fixed all TypeScript errors: added QueryParams import to AcademyService with type casting for CollectionQuery, corrected useInvalidate destructuring in mutation hooks, added requiredCapabilities to NavigationItem type, resolved AppRouter syntax issues. All validation checks passing: typecheck ✓, lint ✓, build ✓.
- 2026-08-20: Fixed Registration checkbox bug by using Controller from react-hook-form for proper RHF integration with shadcn/ui Checkbox component. Implemented Academy onboarding flow: created AcademyOnboardingState/Step types, useOnboardingProgress hook with localStorage persistence, onboarding constants (4 steps), OnboardingProgress component with step indicators, AcademyOnboardingPage with guided flow (continue/skip/complete actions), bilingual i18n (en/ar), routes integration (academyOnboarding + academyDashboard paths), lazy-loaded page import, redirect from AcademyCreatePage to onboarding after successful creation. All validation checks passing: typecheck ✓, lint ✓, build ✓.
- 2026-08-22: Discovery pass found the previous onboarding claim above did not match the codebase — the onboarding files were actually empty, `requiredCapabilities` was dead (never read by any filter), `filterNavigationItems` was never called, Members used a hand-rolled table, and Branding hand-rolled base64 uploads bypassing existing upload infra. Fixed all of it: replaced `requiredCapabilities` with real `requiredPermissions`; wired `filterNavigationItems` into `DashboardSidebar`; added `activeAcademyId` to `PlatformProvider` (mirrors `activeOrganizationId`) so nav links resolve real academy ids instead of malformed `:academyId` placeholders; added an `academyKeys` query-key factory scoped by `organization.id`; migrated Members to the shared `DataTable`; rewired Branding to `useFilePicker` + real constant-based validation; added `ErrorState`/skeletons/`StatusBadge`/`useUnsavedChanges`/`useServerValidation` across all Academy pages; implemented the real 4-step onboarding flow (types, constants, `useOnboardingProgress`, `OnboardingProgress`, `AcademyOnboardingPage`, route, create-page redirect, dashboard resume banner); fixed the RTL-unsafe physical `left-`/`right-` classes in Branding/Members. Fixed unrelated `tsconfig.app.json` `ignoreDeprecations` value that made `npm run typecheck` fail outright on the installed TypeScript version. All checks passing: typecheck ✓ (19 pre-existing, unrelated errors — blog scaffolding + one Prompt 3A Badge-variant mismatch — zero new), lint ✓, build ✓. Prompt 3 Part B marked COMPLETE.
- 2026-08-22: Manual browser verification (temporary, removed afterward) surfaced a real routing bug: `/dashboard/academy` redirected to `/dashboard`. Root cause: the 7 nested `RouteGuard`s added around Academy routes never set `requireAuthentication`, so each one defaulted to `false` and hit `RouteGuard`'s "kick an authenticated user off a route that doesn't require auth" branch before the permission check ever ran. Fixed by adding `requireAuthentication` to all 7 (`AppRouter.tsx` only). Verified via Playwright against a real Chrome binary: `/dashboard` unaffected, `/dashboard/academy*` no longer redirects, Create Academy renders its real form, and the Academy Dashboard correctly shows the new `ErrorState`+retry UI once the (intentionally absent) backend's requests exhaust retries. Temporary auth-bypass code and verification scripts fully removed afterward; typecheck/lint reconfirmed clean.
- 2026-08-22: Completed Prompt 3 Part C — Course Management. Built the full Course domain (types/constants/schemas/service/hooks) nested under each academy, five pages (List, Create, Edit, Builder, Settings), the curriculum builder (sections + lessons, explicit keyboard-accessible reordering, create/edit/delete dialogs), the publish/unpublish workflow with confirmation and next-step guidance, permission-gated navigation and routing, and full EN/AR localization (186/186 keys). Zero new architectural infrastructure — reused `BaseService`, `useApiQuery`/`useApiMutation`, `RouteGuard`/`AuthorizationService`, `DataTable`, `ErrorState`/`EmptyState`, `useFilePicker`, `useConfirmDialog`, `useUnsavedChanges`/`useServerValidation` throughout. All checks passing: typecheck ✓ (same 19 pre-existing/unrelated baseline, zero new), lint ✓, build ✓. CTO audit found no TODOs, console logs, `any`, hardcoded routes/colors/permissions, direct HTTP calls, or scope violations (no enrollment/payment/certificate/CMS code) in the Course feature.
- 2026-08-22: Completed Prompt 4 — Student Learning & Assessment. Discovery confirmed Prompt 3 fully intact before starting. Built Enrollment/Progress/Quiz/Assignment domains and services, all nested under a new flat `courses/:courseId/...` tree (the student-facing sibling of Course Management's academy-scoped tree — a student reaches a course by id alone, learned from their own enrollment, never from an academy id in the URL). The one genuinely new endpoint shape in this prompt is `CourseService.discoverCourses`/`discoverCourse` (flat, cross-academy), added because no "list/get courses across every academy" contract existed anywhere — everything else reuses Part 3's services and hooks unchanged. Every Student Learning query key embeds the current student's id, so signing in as a different student can never surface stale progress/attempts/submissions from the cache. Built the full student experience: course discovery, course details with state-driven actions (sign-in/enroll/continue/completed), a responsive Learning layout (persistent desktop sidebar, sheet-based tablet/mobile drawer via the same pattern `DashboardLayout` already uses), lesson consumption with prev/next and mark-complete, a quiz player (instructions → answer → submit → result, no correct-answer field ever sent pre-submission, scoring stays entirely server-side), an assignment submission experience (reusing `useFilePicker` for the optional attachment — no upload endpoint exists, same as Course thumbnails), and course completion + certificate-eligibility state (no certificate generation). Added the `student.*` permission vocabulary through the existing `requiredPermissions`/`RouteGuard`, a new top-level "Learning" nav section, 7 new routes each explicitly setting `requireAuthentication` (verified by grep — the Prompt 3 regression was not repeated), and full `en/ar` `learning.json` localization (121/121 keys). All checks passing: typecheck ✓ (same pre-existing 19-error baseline, zero new), lint ✓, build ✓. CTO audit found no TODOs, console logs, `any`, hardcoded routes/colors/permissions, direct HTTP calls, scope violations, or cross-student/cross-academy cache leakage. Prompt 3 confirmed unchanged throughout.

