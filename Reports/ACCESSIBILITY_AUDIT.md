# Accessibility & responsive audit (P7)

Status: run locally against the disposable stack (`atlas-backend/scripts/e2e-local-stack.sh`),
Chromium (Playwright's bundled build at `/opt/pw-browsers/chromium`), Linux.
Branch `claude/practical-wozniak-pjcdhe`; not deployed.

## 1. What was tested automatically, and how

`e2e/j13-responsive-accessibility.spec.ts` — 10 surfaces × 6 widths (360,
390, 768, 1024, 1440, 1920) × English and Arabic, against real data:

| Surface | Role |
|---|---|
| Academy home, course catalog, FAQs | anonymous visitor |
| My learning; exam intro/results; exam in progress; full-screen gate | student |
| Dashboard home; website builder; instructor attempt review | Academy Owner |

At every combination: `<html lang dir>` correct for the language, no
horizontal overflow (`scrollWidth − innerWidth ≤ 1 px`), a `main`
landmark, exactly one `h1` on public pages, no uncaught page error, and a
full-page screenshot. At 390 and 1440: axe-core (WCAG 2.0/2.1 A + AA
rules) with **no serious or critical violation** allowed.

Keyboard: the first eight Tab stops on the Academy home and in an exam
are visible and show a focus indicator; the submit confirmation keeps
focus inside while open; Escape closes it and returns focus to Submit.

Also covered elsewhere: `e2e/theme-baseline/axe.spec.ts` (public Theme 1
pages, EN/AR, 390/1440, in CI), J8 (keyboard first stops, RTL dashboard),
J9/J11 (full-screen gate takes focus and is in view; dialogs visible in
full screen), unit tests for focus and live regions.

Screenshots were reviewed by eye as contact sheets per surface (all 120).

## 2. Findings and fixes (each with a regression check)

| Finding | Root cause | Fix | Check |
|---|---|---|---|
| "My learning" 56 px wider than a 360 px phone (26 px at 390) | the "Continue learning" card is a grid item; its min-content width (an untruncated long title) widened the track | `min-w-0` on the card so the title truncates | J13 overflow at 360/390 |
| Dashboard top bar 28 px wider than 360 px on every owner page | the organization switcher's full label plus four icon buttons | label hidden below `sm` (icon + chevron; name kept as the button's accessible name and in the menu) — same pattern the component already used for its empty state | J13 overflow at 360 |
| Attempt review: "Selected · correct" text below 4.5:1 | small `text-success` text on the tinted selected row | the label uses `text-foreground`; the icon keeps the colour; the words carry the meaning | axe colour-contrast, J13 |
| Focus lost after closing any confirmation (fell to `<body>`) | the shared confirm dialog is opened by a call, not a trigger, so Radix had nowhere to return focus | the provider records the focused element on `confirm()` and restores it on close | `confirm-dialog-focus.test.tsx` (fails without the fix), J13 keyboard |
| English question text in the Arabic UI read "?Which planet…"; titles truncated from the wrong end | author content inherited `dir=rtl` | `dir="auto"` on question prompts and options (exam, results, review) and on course titles in learner views | J13 "own direction" (computed `ltr`; fails without the fix) |
| "Grading: quizResults.gradingStatus.not_required" on the review | frontend type said `auto`, API enum is `not_required` | type aligned, label keyed to the API value | J11 asserts "Automatic" and no raw keys |

After the fixes: J13 21/21 (plus the direction check), no overflow at any
width, no serious/critical axe violation on any surface at 390/1440.

## 3. What was NOT tested — said plainly

- **No screen reader was run.** This environment is a Linux container
  with no VoiceOver (macOS/iOS), NVDA or JAWS (Windows) or TalkBack
  (Android), and no audio. Nothing in this report claims a screen-reader
  test. Automated checks (axe, roles, names, live-region presence) find a
  subset of problems and cannot judge what a listener actually hears.
- Only Chromium. Firefox and Safari (WebKit) were not run here.
- Zoom/reflow at 200–400 % and Windows High Contrast / forced colours
  were not tested.
- Real tab switching could not be produced by automated Chromium in this
  sandbox (see J9); the exam's announcements on returning to the tab are
  covered by the manual plan below.

## 4. Manual test plan (to be run by a person)

Record for each run: device, OS version, browser version, assistive
technology and version, language, date, tester, and pass/fail with notes.

**Setups**: (a) macOS + Safari + VoiceOver; (b) Windows + Firefox + NVDA;
(c) Windows + Chrome + NVDA; (d) iPhone + Safari + VoiceOver; (e) Android
+ Chrome + TalkBack. Each in English, then Arabic.

**J-A1 Public site**
1. Load the Academy home. Expected: page language announced correctly
   (Arabic voice for `/ar`); the skip link is the first focus stop and
   moves to the main content; the logo is announced as "<Academy> home".
2. Navigate by headings: one level-1 heading, sections in order.
3. FAQs: each question is a button announcing expanded/collapsed;
   library entries read in the Owner's order.
4. Contact form: labels read for every field; a submit with errors
   announces the errors and moves focus to the first one.

**J-A2 Exam (student)**
1. Open an exam that requires full screen. Expected: the rules are
   readable as a region, including what is recorded and what never is.
2. Activate Start. Expected: the page enters full screen; focus lands in
   the exam; the countdown (if any) is not read every second.
3. Timer: at the announcement thresholds (10 min, 5 min, 1 min, 30 s —
   `COUNTDOWN_ANNOUNCEMENTS`) the
   remaining time is announced once (assertive), also when the author
   hid the digits.
4. Answer a question. Expected: the save state ("Saving…", "Saved") is
   announced politely, without interrupting the timer announcement.
5. Leave full screen (Esc). Expected: the gate is announced
   ("Return to full screen to continue") and receives focus; "Enter full
   screen" is reachable; nothing else is announced as lost.
6. Switch to another tab and back (warn mode). Expected: the warning
   banner/dialog is announced; the dialog traps focus; "Continue quiz"
   returns focus to the exam.
7. Submit. Expected: the confirmation names the number of unanswered
   questions; Escape returns focus to Submit; confirming announces the
   result.
8. Phone (d/e): full screen is unavailable on iPhone — expected the
   notice is announced and the exam continues.

**J-A3 Instructor review**
1. Open an attempt review. Expected: the policy sentence and the
   "Worth a look / Technical interruptions / For context" groups are
   headings; each signal's explanation is read with it.
2. Activate "Show in timeline". Expected: the status "Highlighted:
   evidence for …" is announced; highlighted rows are distinguishable
   without colour (they are announced in order and marked).

**J-A4 Dashboard**
1. With the narrow layout (phone), the organization switcher is
   announced by name though only its icon shows.
2. The website builder's section editor: the library picker's
   move/remove buttons announce the entry they act on.

## 5. Re-running

```
# backend repo
scripts/e2e-local-stack.sh up && scripts/e2e-local-stack.sh serve
# frontend repo
E2E_CHROMIUM=/opt/pw-browsers/chromium E2E_REDIS_URL=redis://127.0.0.1:63799 \
  npx playwright test e2e/j13-responsive-accessibility.spec.ts --workers=1
```
Screenshots land in `test-results/j13-*/` (one per surface, language and
width).
