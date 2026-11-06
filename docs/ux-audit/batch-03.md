# B3 — Courses (Nov 2026)

Pages: courses list, create, course detail, the guided wizard (every step), the course builder
(units, lessons, reorder), course settings (completion and certificate, publishing, danger
zone), quizzes, assignments, reviews, media library, certificate template. Local stack, owner
account, EN-light-1280 / AR-dark-375 / AR-light-1280. Every form submitted wrong on purpose;
400 (real violation shape), 409, 500 and network abort forced. 248 screenshots.

**30 findings — 9 High, 14 Medium, 7 Low.** The worst: a thumbnail saved as a 4 MB data URL
inside the course PATCH froze the whole API at 100 % CPU for minutes.

## Findings

| # | Page | What the customer saw | Rule | Sev |
|---|---|---|---|---|
| V01 | Course detail › Details | A 3 MB PNG thumbnail: "Saving changes..." forever; the API froze for everyone. The image travels as a base64 data URL in the PATCH (`thumbnail` is an unbounded string); 80 KB already took 6.8 s. | silent failure, availability | High |
| V02 | Wizard › Pricing | Paid, 0.001: accepted, stored as 0; Review then says "Set a price above zero…". | V7 | High |
| V03 | Wizard › Details; Details tab | 22 outcomes: raw **"maxItems"**; a 320-character requirement: "This field must be 300 characters or fewer" without saying which line. | V2 | High |
| V04 | Quiz editor | Empty submit / no correct option: "undefined" under Add Option (fixed by the shared `FormMessage` change); option fields have no message of their own. | V2 | High |
| V05 | Create, wizard, Details tab, builder, quiz, assignment | **Two toasts for one failure** (a generic "Failed to save…" plus the reason); the quiz adds a third inline. | V5 | High |
| V06 | Settings › Completion | Raw **"errors.conflict"** / **"errors.internal"** in a red box, plus a toast. | V5 | High |
| V07 | Wizard › Pricing | Server `pricing.amount` violation: nothing at all; the step does not move on. | silent | High |
| V08 | Settings › Completion | Leaving with a changed minimum score: no warning; the change is lost. | V10 | High |
| V09 | Builder at 375 px | Lesson rows show no title, only badges; arrows on top of "Draft". | overlap | High |
| V10 | Wizard › Media (media library dialog) | Wrong type: a toast naming PDF plus "Unexpected error"; a 6 MB PNG accepted here but refused on the Details tab; three different rule sets. | V8 | Medium |
| V11 | Lesson dialog; Completion card | Browser bubbles in English on the Arabic page ("Please enter a URL.", "Value must be less than or equal to 100."). | V2/V12 | Medium |
| V12 | Details step / tab, settings | API field names in messages: "يجب ألّا يزيد Outcomes…", "Certificate min score must be 100 or less". | V12 | Medium |
| V13 | Create, Basics, Details tab | Duplicate slug (409): field not marked; reason only in a toast. | V2 | Medium |
| V14 | Wizard › Pricing | "12,50" saved as 1,250; "1e3" as 1,000; no upper limit. | V7 | Medium |
| V15 | Quiz editor | "Remove Question" deletes typed work at once, no undo. | V9 | Medium |
| V16 | Settings › Danger zone | "permanently delete… cannot be undone" — the server only archives. | copy | Medium |
| V17 | Create | POST 500: three POSTs and ~12 s of "Saving…" (fixed by the B2 one-retry-layer change). | silent wait | Medium |
| V18 | Lesson, quiz, Details step | No error summary; focus on the page body after server errors. | V3 | Medium |
| V19 | All course forms | No required markers. | V1 | Medium |
| V20 | Details, lesson, assignment, quiz | Limits only after submit; no counters on long text. | V7 | Medium |
| V21 | Assignment; quiz dates | A due date / window in the past accepted. | V7 | Medium |
| V22 | Lesson dialog | Content URL `javascript:alert(1)` passes the client check. | V7, safety | Medium |
| V23 | Media library page | "That file is too large to upload." — no limit named; Retry offered where it cannot help. | V8 | Medium |
| V24 | Wizard stepper; Review | Pricing "Completed" before it was opened; "Every unit has content" with no units. | copy | Low |
| V25 | Settings › Publishing | A pricing blocker offers only "Open the curriculum"; subtitle promises visibility controls that aren't there. | clarity | Low |
| V26 | Certificate template, builder (AR) | "B08A3E#"; "Unit Two .1". | RTL | Low |
| V27 | Quiz editor, lists | Option inputs have no accessible name; "…" menus labelled "Edit"; 16 px radios at 375. | a11y | Low |
| V28 | Create at 375 | Steps 2–8 greyed with no reason. | V4 | Low |
| V29 | Create | Arabic-only title: slug empty, only "This field is required". | V2 | Low |
| V30 | Lesson dialog | Switching Video → File keeps the video URL and shows a public-file warning. | clarity | Low |

## Works well — keep

- "Leave without saving?" on create, wizard steps, the Details tab and the section, lesson and
  assignment dialogs.
- Delete confirmations that say what happens, focus on Cancel.
- Publishing: the button is disabled with the reasons listed; Review groups Required /
  Recommended / Good to know / Done with "Go to …" links.
- Client messages in EN and AR for limits, slug format, YouTube links, file size and type,
  quiz numbers and dates, paid price > 0; focus to the first bad field.
- Reorder by keyboard and Move up/down; a failed reorder rolls back and says so.
- List error state with Try again; empty search state; Arabic search.

## Fixes

(filled in as the batch ships)
