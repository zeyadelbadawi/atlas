# Learner Experience — Pre-Phase-3 UX and Design Baseline

**Date:** 21 September 2026 · **Scope:** everything learner-facing that exists in
the codebase today · **Method:** the `apple-design` review skill (Human Interface
Guidelines references, five lenses: accessibility, platform conventions, visual
craft, interaction, writing), applied to the real source, tokens, copy in EN and
AR, and a rendered pass in Chrome at desktop and 400 px.

This is a baseline for what exists. It does **not** define, design or implement
Phase 3 or Phase 4 functionality; those phases receive their own review when they
start (see "Future-phase observations").

## A. Current surfaces reviewed

| Surface | Route | Owner | Reviewed |
|---|---|---|---|
| Learner shell: side rail, drawer, four-item bottom bar, breadcrumbs, section announcer | `/my/*` | learner app | yes |
| Overview | `/my` | learner app | yes |
| My Courses (tabs, search, cards) | `/my/courses` | learner app | yes |
| Course progress (outline, continue) | `/my/courses/:courseId` | learner app | yes |
| Unified player (lesson, activity, lock card, failure states, protection report, device-limit and takeover dialogs) | `/my/courses/:courseId/learn/:lessonId`, `.../activities/:itemId` | learner app | yes |
| Assessments (quizzes / assignments lists) | `/my/assessments` | learner app | yes |
| Certificates (empty until Phase 3) | `/my/certificates` | learner app | yes (placeholder) |
| Purchases | `/my/purchases` | learner app | yes |
| Devices | `/my/devices` | learner app | yes (also reviewed separately first) |
| Profile: Personal, Account, Preferences | `/my/profile` | shared `@features/profile` sections | yes |
| Security: password, two-factor, sign-in sessions | `/my/security` | shared `@features/profile` sections | yes |
| Sign-in, sign-up, forgot/reset password, verify email | `/sign-in` … | **academy website** (category A) | transition only |
| Course landing page | `/courses/:id` | **academy website** (category A) | hand-off only |
| Legacy quiz and assignment pages | `/my-learning/courses/:id/quizzes/:quizId`, `.../assignments/:id` | `@features/learning` (legacy) | kept; Phase 3 replaces |

Architectural boundary preserved: the learner app is mounted inside the academy
website's branded chrome (`PublicWebsiteLearningRoute` → `LearnerRouter`); the
website's own pages and auth screens were not redesigned.

## B. Current issues fixed

Navigation and coherence
- **Two players and two course pages for the same enrolled learner.** The website's
  course page and every legacy path builder still sent learners to the retired
  `/my-learning/courses/:id` page and `LessonPage`, while My Courses and Overview
  used the unified player. The three legacy course/lesson routes now redirect
  (parameters carried across) to `/my/courses/:id` and `/my/courses/:id/learn/:lessonId`;
  `LearningPaths` defaults, the website provider and `CourseDetailsTemplate` point at
  the learner app. Quiz and assignment pages are deliberately untouched until Phase 3.
- Dashboard-host bookmarks to a lesson now land on that lesson in the player rather
  than the outline; stale comments claiming the player "is not built yet" corrected.
- My Courses had **no pagination control** while the list is server-paged at 20:
  a learner with more courses could never reach them. `Pagination` added.
- Overview "Due soon" and "Recent results" rows were not actionable; titles now link
  to the activity in the player.
- Assessments list and the player's "Start the quiz / Open the assignment" used
  `<a href>` (full page reload) with an "external link" glyph for an in-app page;
  now router links with an in-app arrow.

Feedback and error handling
- **Silent failures**: removing a device (Devices page and the player's device-limit
  dialog) and marking a lesson complete/undo showed nothing on failure. Each now
  states the failure inline (`role="alert"`) where the learner is looking; the
  Devices dialog stays open on failure.
- Learner pages passed no error kind to `ErrorState`, so a lost connection or an
  expired session read as "Something went wrong". A `readErrorKind` helper maps
  read failures to the right sentence and never to form-validation copy (which a
  rendered check caught).
- Course progress on a course the learner is not enrolled in now says so, with
  "See the course" and "My Courses" actions instead of a generic error.
- The player says why **Next** is disabled when the next activity is locked.
- A scheduled lock names its date ("Opens on …") instead of "a later date".

Visual and theme
- **Portalled overlays escaped the website theme.** Dialogs, sheets, popovers,
  selects and menus mounted at `document.body`, which carries the dashboard's
  dark class and Atlas teal; on the academy site they rendered dark and off-brand
  (caught in Chrome). `WebsiteThemeScope` now provides a portal container inside
  the scope and every portal-using primitive reads it (default unchanged elsewhere).
- Devices: the "X of Y devices" figure is the headline (18 px semibold) with the
  policy source beneath and a "Limit reached" badge; Remove is 44 px tall on touch
  widths; removing the current device uses the destructive style; redundant row
  icon removed; country shown by name.

Writing (EN and AR)
- Devices copy no longer promises "end a learning session" (no such action here)
  and no longer conflates learning sessions with account sign-ins ("Active learning
  sessions", "which of them is learning right now").
- Learner action labels are sentence case and learner-owned (`learnerDashboard.actions.*`:
  Continue learning, Start course, Review course, Browse courses, Access ended) instead
  of Title Case legacy keys.
- Purchases empty state no longer promises a receipt that does not exist yet.
- Arabic plural forms added for the devices headline and the courses result count.

Profile
- The learner Account tab no longer shows the raw user id, staff role vocabulary or
  an organization list a learner can never hold (AD-4); it keeps "Member since",
  formatted in the app language rather than the browser locale, with an honest
  description. Staff profile unchanged (`audience` prop, default `staff`).

Accessibility
- The My Courses grid was itself a polite live region (announcing the whole grid on
  every keystroke); replaced with a screen-reader-only result count.
- Device-limit action in the failure state is a real router link.

## C. Current issues left intentionally unchanged

- **Theme preference (light/dark/system) in Preferences.** Shared with the
  dashboard; on the academy site the website is always light by design, so the
  setting has little visible effect there. Owner decision whether learners should
  see it.
- **Shared profile copy** ("Personal Information", "Account Information", "Update
  your name — shown across Atlas…") is Title Case and platform-voiced. Changing it
  affects the management dashboard; flagged for a cross-surface capitalisation
  decision.
- **Disabled inputs as the profile's read mode** render values in low-contrast
  grey; a `readOnly` presentation would read better. Shared `Input`, dashboard-wide.
- **`Sign in` copy and academy auth pages** belong to the academy website and were
  not redesigned.
- **Website mobile header** truncates the academy name and greeting at 400 px;
  academy-website concern, not the learner app.
- `learner-shell.test.tsx` "mounts every section" occasionally exceeds the 5 s
  test timeout under parallel load; passes alone (2.8 s). Pre-existing sensitivity.

## D. Future-phase observations (recorded, not implemented)

- Quizzes and assignments still open in the legacy `@features/learning` pages;
  Phase 3 moves them into the unified player (their links now come back to the
  learner app's course outline).
- Certificates section and the overview's certificates block are honest
  placeholders until Phase 3 issues certificates.
- Purchases rows have no receipt or course link; Phase 4 (checkout) territory.
- Devices: no "end this learning session" action on the sessions list; takeover
  lives in the player. If a standalone action is wanted, it is a small Phase 3/4
  addition on the existing takeover mutation.
- Live-session activities show a note only; joining details are the Live Sessions
  add-on's (deferred) responsibility.
- Preview lessons for anonymous visitors: `/my/*` requires a session, so an
  anonymous preview cannot reach the player today; the route comment anticipates
  it. Product decision for a later phase.
- Local development: the learner dashboard endpoints resolve the academy from the
  request host, which `localhost` cannot supply; the frontend deliberately never
  sends an academy id. A host-forwarding dev proxy (outside the repo) was used for
  the rendered check. A documented dev affordance would help future browser passes.

## E. Decisions requiring owner input

1. Keep or hide the theme preference for learners on academy sites.
2. Unify capitalisation of the shared profile/security copy across dashboard and
   learner surfaces (sentence case is the learner convention).
3. Whether an "End learning session" action belongs on the Devices page.

## F. Validation performed

- Typecheck: 34 errors before and after (all pre-existing, in platform-zoom,
  platform-add-ons and website editor/test files; none in touched code).
- ESLint (errors): clean on every changed file. Prettier: clean on every changed file
  (the repo has 146 pre-existing unformatted files; none were reformatted).
- Vitest: full suite 577 passed (569 baseline + 8 new: redirect resolver for the
  academy table, learning-paths defaults), 1 pre-existing unhandled timer error.
- Chrome, local stack (backend + Vite, seeded learner `alex.morgan@student.dev`,
  academy `language-learning-hub` published locally): overview, devices (incl. the
  confirm dialog before and after the portal fix), player, profile Personal and
  Account tabs at desktop; devices, overview and player at 400 px; devices,
  overview and course outline in Arabic (RTL mirroring, breadcrumb chevron,
  plural headline).
- Not exercised in the browser: a playing protected video (seed has no processed
  asset; the "not ready" failure state rendered honestly), the Security page's
  two-factor flow, and dark mode (the academy website is always light by design).
