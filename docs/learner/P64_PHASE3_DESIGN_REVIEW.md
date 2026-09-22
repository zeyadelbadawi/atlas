# P64 Phase 3 — Design review (before UI work)

**Date:** 22 Sep 2026
**Scope:** every Phase 3 surface in `atlas-front` — the in-player quiz attempt, assignment submission, the course completion screen, learner certificates, the public `/verify/:code` page, the quiz builder settings, assignment late policy, course completion and certificate settings, academy certificate management and the reviewer attempt detail.
**Method:** the `apple-design` skill (HIG pages read for this review: `accessibility.md`, `layout.md`, `typography.md`, `color.md`, `entering-data.md`, `progress-indicators.md`, `feedback.md`, `loading.md`, `writing.md`, `alerts.md`, `modality.md`) and the `ui-ux-pro-max` quick reference (§1 Accessibility, §2 Touch, §8 Forms & Feedback, §9 Navigation). The product is a web app, so Apple's platform conventions are applied as design principles, not as iOS chrome; the existing Atlas design system (shadcn primitives, semantic tokens, `learning.json` copy, `PlayerShell`, `ActivityLockCard`, `ErrorState`, `StatusBadge`, `DataTable`, RHF + zod, `useConfirmDialog`) is the platform.

## Summary

The Phase 2 player already answers the six learner questions (where am I, how far, what is this, what else, what now, how out). Phase 3 keeps that shell and puts the attempt *inside* it instead of ejecting the learner to a differently shaped page. The thesis for every learner screen in this phase is **"the server is the clock and the referee; the screen never pretends otherwise"**: the countdown is derived from `serverNow`/`deadlineAt`, the save indicator reports what the server confirmed, integrity copy says what is *recorded* and never claims prevention, and results show exactly what the disclosure policy allows. The one signature element is the attempt header: a quiet sticky strip carrying the countdown, the answered count and the save state, in tabular figures, that stays put while the learner moves between questions. Everything else is the existing system.

Overall rating of the plan as designed below: **Good** — no Critical findings remain once the rules in this document are followed; the two High-risk areas (a time-boxed interface, and error copy that could regress to "Unexpected error") each have an explicit rule.

## Rules this phase must follow (derived findings)

### Critical (accessibility)

1. **A timed quiz is a time-boxed interface.** `accessibility.md › Cognitive`: "Minimize use of time-boxed interface elements … prefer dismissing views with an explicit action." The time limit is a product requirement the learner accepted, so the mitigation is disclosure and warning, not removal: the intro screen states the limit, the attempts left and the window *before* Start; the countdown is announced through an `aria-live="polite"` region at 10, 5 and 1 minute (and once at 30 s) rather than every second; when time runs out the learner is told in words ("Time ran out. Your answers were submitted automatically.") and the results appear — there is no dead end. `hideTimer` hides the digits, never the announcements.
2. **Nothing is conveyed by colour alone** (`accessibility.md › Vision`, `color.md`). Navigator states (answered / unanswered / flagged / current) carry an icon or text and `aria-current="step"` on the current question; pass/fail carries an icon and a word next to the tone; integrity warnings carry the count in words.
3. **Controls stay at least 44 × 44 CSS px on touch** (`accessibility.md › Mobility`, ui-ux-pro-max `touch-target-size`). Answer rows are full-width labelled controls (the whole row is the target), navigator chips are 40 px with 8 px gaps on mobile, and the sticky action bar keeps Previous / Next / Submit at the standard button height.
4. **Keyboard-only works end to end.** Question navigation is a `<nav>` of buttons, answers are native radios / checkboxes / textareas, the submit confirmation is the existing `AlertDialog` (Escape cancels), and the integrity modal is the same primitive.
5. **Contrast** stays on the semantic tokens the product already ships (`text-foreground` on `bg-card`, `text-muted-foreground` for secondary), which were verified in the Phase 2 baseline. The watermark on the attempt page uses the existing `WatermarkOverlay` (aria-hidden, `mix-blend-difference`, motion-reduced).

### High

6. **Errors must never simply say "Unexpected error" when the application knows what happened.** Every backend `messageKey` the Phase 3 services can return (`errors.quiz.attemptExpired`, `errors.quiz.windowClosed`, `errors.quiz.notYetAvailable`, `errors.quiz.pastDue`, `errors.quiz.maxAttemptsReached`, `errors.quiz.attemptAlreadySubmitted`, `errors.quiz.attemptInvalidated`, `errors.quiz.invalidOption`, `errors.assignment.pastDue`, `errors.assignment.alreadySubmitted`, `errors.assignment.responseRequired`, `errors.assignment.attachmentNotOwned`, `errors.certificate.*`) gets an EN and AR sentence in `errors.json` that says what happened and what to do next (`writing.md › Write clear error messages`: "display it as close to the problem as possible, avoid blame, and be clear about what someone can do to fix it"). Read failures use `ErrorState` with the real `kind`; write failures use the message key from the `ApiError`, with `errors:generic` only as the last resort.
7. **Feedback lives in the interface, alerts are rare** (`feedback.md`, `alerts.md › Use alerts sparingly`). The save state is an inline status ("Saved just now / Saving… / Offline — will retry"), not a toast per save. The first integrity violation is an inline banner (`Alert`), not a modal; the modal appears only when the count is already climbing and a consequence is near, and its button is "Continue quiz" — never "OK". Submit is the one confirmation, and its copy lists the unanswered count because that is the fact the learner needs to decide.
8. **Progress is determinate wherever it can be** (`progress-indicators.md`). The attempt header shows "answered 4 of 10"; the certificate render shows "Preparing your certificate…" with a refresh action rather than a spinner alone; the download is a button that fetches a fresh one-hour link and says so.
9. **Modality is short and has an obvious exit** (`modality.md`). The only full-screen modal experience is exam mode's fullscreen request, which is *requested*, explained beforehand on the intro screen, and never blocks a learner who declines: leaving fullscreen is recorded as an event, as the copy says.
10. **Choices over typing** (`entering-data.md`). Quiz builder settings are presets (Practice / Exam) that fill the fields, then selects and switches; dates use the existing `datetime-local` convention; the related-lesson field is a select over the course's lessons, never a free id.

### Medium

11. **One primary action per screen** (ui-ux-pro-max `primary-action`). Intro: Start. In progress: Next (or Submit on the last question). Results: Continue to next activity, with Retake as secondary only when allowed and useful. Certificates row: Download. Verify page: none — it is a read-only fact sheet.
12. **Empty states invite the next action** (`writing.md`). Certificates: "No certificates yet — complete a course that awards one and it appears here." Review attempt list: "No attempts yet."
13. **Sentence case, verbs on buttons, the same word through a flow** ("Submit quiz" → "Submitted"; "Issue certificate" → "Issued"). Possessives are dropped ("Certificates", not "Your certificates") to match the existing learner navigation.
14. **Numbers and durations go through `formatNumber` / `formatDuration` / `isolateNumericExpression`** so Arabic gets Arabic-Indic digits and a `12:30` countdown never renders as `30:12` in an RTL paragraph. Countdown digits use `tabular-nums` so the header does not jitter.
15. **Mobile layout**: one question per page below 640 px unless the quiz author forced `all_questions`; the navigator collapses into a horizontally scrollable strip inside its own overflow container; the sticky header is 48 px tall and never hides the focused control (WCAG 2.2 `focus-not-obscured`): focused elements scroll into view with `scroll-margin-top`.

## Screen-by-screen decisions

| Screen | Structure | Notes |
| --- | --- | --- |
| Quiz intro (in player) | Card: title, description, facts list (time limit, attempts used/allowed, opens/closes/due, passing score, "what is recorded" when integrity ≠ off), acknowledgement checkbox when integrity ≠ off, primary Start / Resume | Facts as a `<dl>`, same pattern as the current `AssessmentActivityView`. |
| Attempt in progress | Sticky header (countdown · answered n/N · save state) → navigator → question card(s) → action row (Previous · Next / Submit) | Header uses `role="status"` for the save state; the countdown announcements are a separate visually-hidden `aria-live` node. |
| Auto-submitted / expired | Results view with a leading `Alert` "Time ran out…" or "The quiz was submitted because the violation limit was reached." | Never a dead end; Continue is always present. |
| Results | Score/pass block (per policy) → per-question review (per policy) → attempt history → actions | Pending manual grading shows "Awaiting grading" with what is graded automatically so far. |
| Assignment | Facts (due, late policy, resubmission) → draft form with autosave status → submitted view with a three-step status timeline (Submitted → Being graded → Graded) → grade & feedback | The timeline is an `<ol>` with `aria-current`. |
| Completion screen | Course progress page gains a completion section: lessons / quizzes / assignments summary with what is missing, then certificate state | Missing items link to the activity. |
| Certificates | List of cards: course, serial, issued date, status badge; Download (fetches a fresh link), Copy verification code, Copy verify link | Revoked certificates stay listed with the reason. |
| Verify page | Fact sheet: valid/invalid banner, issued to, course, academy, issued/completed dates, status | Same component on academy and platform hosts; no chrome that implies identity beyond the academy name the server returns. |
| Quiz builder | Details → Preset chips → four grouped setting cards → questions | Each setting has a one-line "what this does" description; integrity copy says "recorded" and "reported", never "prevented". |
| Reviewer attempt detail | Header facts (student, attempt, status, duration, score, violations, late) → answers with correctness → manual grading form → event timeline → actions (Void, Overrides, CSV) | Void requires a reason and a confirmation with the destructive style. |

## What works and is kept

- `PlayerShell`, `PlayerActionBar`, `ActivityLockCard`, `CurriculumSidebar`, `LearnerPageHeader`, `LearnerSectionPlaceholder`, `ErrorState`, `StatusBadge`, `DataTable`, `useConfirmDialog`, `useServerValidation`, `useUnsavedChanges`, `useFilePicker`, `WatermarkOverlay`.
- The learner copy namespace (`learning:quiz.*`, `learning:assignment.*`, `learning:player.*`, `learning:learnerDashboard.*`) and its EN/AR parity check.
- Lazy page chunks and the `/my/*` layout route.

## Platform notes

Web only. Safe areas, haptics and Dynamic Type do not apply; text scaling is respected by using `rem`-based Tailwind sizes and no fixed heights on text containers. `prefers-reduced-motion` is honoured through the existing `motion-reduce:` variants; the countdown does not animate.
