# B6 — Instructor area (Nov 2026)

Pages: teaching dashboard, my courses, course overview, students and student progress,
assessments, assignment submissions and the review page (grade, feedback), quiz results, quiz
attempt (manual grading, void), student overrides, integrity CSV, course forum (list, new thread,
thread, reply, pin, lock), course announcements. Local stack, instructor account (two courses)
and the owner where instructors lack the permission (moderation, announcements),
EN-light-1280 / AR-dark-375 / AR-light-1280. Every form submitted wrong on purpose; 400 (real
violation shape), 409, 500 and network abort forced. There are no quiz attempts locally and the
only submission is graded, so attempts, the attempt detail, overrides and two ungraded
submissions were mocked and every grading write answered by the test. 257 screenshots.

**27 findings — 6 High, 12 Medium, 9 Low.** The pattern: actions that look like they worked
but didn't (search, blank replies, a grade with decimals), grades overwritten without a word,
and failures that hide the real reason behind a generic message and a second toast.

## Findings

| # | Page | What the customer saw | Rule | Sev |
|---|---|---|---|---|
| V01 | My courses; course › Students | Search "zzzz": every row stays. The request sends `search`, the API ignores it. | silent failure | High |
| V02 | Course overview | The "Announcements" quick link leads every instructor to "You do not have access" (needs `announcement.manage`). | dead end | High |
| V03 | Quiz attempt › manual grading | 7.5 points accepted (`step="any"`); the backend's `@IsInt` 400 on `grades.0.points` becomes a generic toast, no field marked. | V2/V5/V7 | High |
| V04 | Forum › reply, new thread | A reply of three spaces is saved and shown as an empty card; a thread of spaces is sent. | V7 | High |
| V05 | Forum thread | No delete or edit anywhere: a blank, wrong or abusive post can't be removed. | moderation | High |
| V06 | Submission review (graded) | Badge says "Submitted" (no score, date, grader); Save overwrote 92 with 40 at once, no warning. | V9 | High |
| V07 | Grading, manual grading, void, overrides, CSV, new thread, reply, pin/lock | Two toasts per failure (up to four stacked on pin/lock) — hooks without `INLINE_ERRORS_META`. | V5 | Medium |
| V08 | Submission review; forum | Every failure "The action could not be completed" — "not submitted", "thread locked" never shown; a field 400 marks the field and toasts. | V5 | Medium |
| V09 | Score, points, multiplier, extra attempts | Only the browser's bubble, in English on Arabic pages; the app's range messages never show; 92.5 refused though the backend accepts it. | V2/V12 | Medium |
| V10 | Same number fields | Empty or letters: zod's English "Required", on Arabic pages too; doesn't say what to enter. | V2/V12 | Medium |
| V11 | Quiz attempt; forum thread | Typed points or a reply, clicked Back: gone, no warning. | V10 | Medium |
| V12 | Forum thread | Pin and Lock act at once, no confirmation, no success message; Lock closes the thread to every reply. | V9/V11 | Medium |
| V13 | Manual grading | "Points per question cannot exceed 100." — the cap is the question's own points (10). | copy | Medium |
| V14 | Submission review; students, assessments, submissions | Title is the student's name only, no assignment or course; Score has no scale or required mark. | clarity | Medium |
| V15 | Arabic: submission text, forum | Latin text without `dir="auto"` (".El Cairo"); the byline reorders. | RTL | Medium |
| V16 | Dashboard; course overview | "Pending Submissions 1" next to "Pending Grading 0" for a graded submission; attempts awaiting a manual grade counted nowhere. | clarity | Medium |
| V17 | Quiz results | No filters; 11 columns, Grading and Submitted off-screen at 1280; long names wrap to 5 lines; uppercase headers. | clarity | Medium |
| V18 | Overrides | A window that already ended (1–2 Jan 2020) saved without a word. | V7 | Medium |
| V19 | Forum reply | No success message; no label (placeholder only), no counter. | V11/V1 | Low |
| V20 | New thread, reply, feedback | Client and server limits differ: title 150 vs 200, body 5,000 vs 10,000, feedback 2,000 vs 4,000. | consistency | Low |
| V21 | Forum, assessments, overview | "1 replies", "1 questions", "1 sections"; Arabic "1 أسئلة". | copy | Low |
| V22 | Dashboard, progress, overview | "Once content is added it will appear in this view." under every empty state. | copy | Low |
| V23 | Arabic attempt, overrides | Mixed digits ("المحاولة ٢" beside "92%", "0–١٠"); date inputs "12/10/2026, 10:00 AM". | RTL | Low |
| V24 | Manual grading at 375 (AR) | The failure toast covers the first points field. | overlap | Low |
| V25 | Quiz results, submissions, attempt | Sort headers 16 px tall; "Show 1 connection check" 146×16; "Open attachment" 20 px. | target size | Low |
| V26 | Forum list | Pinned / locked shown by icon only (`aria-hidden`). | a11y | Low |
| V27 | Manual grading | Can't save part of the grading, though the success copy implies it. | clarity | Low |

## Works well — keep

- Submission review: "Leave without saving?", focus to the first invalid field, a field 400 on
  its field, the 2,000 limit named, late flag and attachment expiry shown.
- Void attempt: reason required (spaces refused), 500 limit named, a second confirmation naming
  the attempt and student, the reason survives Escape, the dialog stays open on failure.
- Overrides: reversed window refused with a reason; remove confirms and says what happens; real
  server reasons reach the person; violations land on their fields; input survives closing.
- New thread dialog: required and length messages, focus to the first error, text kept on Escape.
- HTML in posts shown as text. Rows and thread cards open with Enter or Space.
- Owner's course announcements use the B4 panel correctly.
- No page-level horizontal scroll at 375; table scroll hint; RTL mirroring and dark contrast fine.

## Not tested, with reason
- Real grading, attempts, overrides and void: no attempts locally; the real submission was
  protected (every grading write mocked).
- Not in the app: return/resubmission, quiz-results filters, post edit/delete, an analytics page.
- Discussions are behind the `academyBlogAndForum` flag (off locally): tested by direct URL.
- Replies beyond page 1 (the code shows no pagination; unverified). 768 px, expired session.

## Fixes

### Shared root causes
- **One message per failure (V07, V08, V24)** — the 6 instructor and 8 forum mutation hooks
  (grading, manual grading, void, overrides, CSV, new thread, reply, pin/unpin/lock/unlock,
  delete) mark their errors inline (`INLINE_ERRORS_META`, checked by two tests). Forms and
  dialogs show one inline alert with the server's own reason ("not handed in yet", "this
  discussion is locked"); row actions one toast; a field violation marks only its field.
- **Number fields (V09, V10)** — `noValidate` on every grading and override form; zod gives the
  range in the app's words, empty and non-numeric included, in English and Arabic.
- **Limits are the server's (V20)** — title 200, thread body and reply 10,000, feedback 4,000.
- **Table headers (V17, V25)** — `DataTable` headers share one case (sortable ones never
  inherited the uppercase); sort buttons are at least 24 px tall.
- **Bidi (V15)** — `dir="auto"` on submission text, feedback, forum posts, answers, names;
  `isolateText` keeps a Latin name in its own direction inside an Arabic byline or dialog.
- **Backend (atlas-backend#105)** — instructor course and roster search; forum posts trimmed
  before validation (blank refused on its field); the points cap is a violation on
  `grades.N.points` with the question's own maximum; course moderators can delete a thread or a
  reply (RLS DELETE policies, migration `20261201000200_b6_forum_moderator_delete`).

### Per finding
- **V01** Search works; "No courses match" / "No students match" with what to do; a new search
  goes back to page 1; the search box is labelled.
- **V02** The Announcements quick link shows only with `announcement.manage`, as the route.
- **V03 / V13 / V27** Whole points only; a server violation lands on that question's field
  ("This question is worth 10 points…"); grading can be saved in parts (the server merges), a
  saved grade can be changed but not emptied, and the toast says how many remain.
- **V04** Spaces alone are refused on the client and the server.
- **V05** Moderators can delete a thread (with its replies) or a reply: asks first, says it can't
  be undone, names the reply count, success toast, back to the forum after a thread.
- **V06** The header says "Graded · 92 / 100" and when (and "by you"); replacing a grade asks
  "Replace the grade of 92 with 40?".
- **V11** Manual grading and the reply box warn before leaving.
- **V12** Lock asks and says nobody can reply until unlocked; every pin/lock action confirms.
- **V14** The review page names the assignment and course; "Score (out of 100)" with a required
  mark; students, assessments and submissions name their course or assignment.
- **V16** Tiles read "Assignments submitted" and "Assignments awaiting grading"; a note points to
  each quiz's results for manual grading.
- **V17 (columns)** Student with attempt underneath, score with points underneath; numbers and
  dates don't wrap.
- **V18** An override window that has already ended is refused.
- **V19** The reply box has a label, a counter and a "Reply posted" toast; the new-thread dialog
  required marks and counters.
- **V21 / V22 / V26** Plurals (Arabic all six forms); each empty state has its own description;
  "Pinned" / "Locked" as text, not only icons.
- **V23 (partly)** The points hint uses one digit style.

### Not changed, with reason
- **V17 filters** — paging is server-side, so client filters would only filter one page; the
  backend has no filter parameters.
- **V23** mixed digit styles in Arabic — decided and fixed: Western digits (0–9) everywhere in Arabic.
- **V06 grader name** — the API returns only the grader's id.
- The page header's thread title — fixed: `PageHeader` gives a data title `dir="auto"` (B8 V32), so a
  Latin title on the Arabic page keeps its own direction (covered by a forum test).
