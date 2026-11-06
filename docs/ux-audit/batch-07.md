# B7 — Learner area (Nov 2026)

Pages (academy host, `/my/*`): overview, my courses, course progress, the unified player (text
lesson, quiz, assignment, locked and failure states, device limit, another-device takeover),
assessments, course completion, certificates, purchases, payments, paid-course checkout (order,
method, proof), notifications, profile, security, devices; sign-in and sign-up on the academy
host. Local stack, a learner enrolled in one free course, EN-light-1280 / AR-375 / AR-light-1280
(the academy host always renders the academy's light theme). Quiz attempts, assignment drafts and
submits, the whole checkout, purchases, payments and certificates were mocked; every other write
was blocked by the test. No real submit, purchase, password change or device removal. 309
screenshots.

**25 findings — 2 High, 15 Medium, 8 Low.** The pattern: failures that blame the wrong thing
(a server fault called a lost connection, an already-enrolled learner told payments aren't set
up), the B4 two-message root cause again across the learner hooks, and reviews that don't say
what the learner got wrong.

## Findings

| # | Page | What the learner saw | Rule | Sev |
|---|---|---|---|---|
| V01 | Player › lesson | A 500 on the lesson content: "This lesson needs a connection…", no Try again, plus a "Server error" toast. | V5/V6 | High |
| V02 | Checkout | 500, abort, 409 already enrolled, 409 not paid: always "Not available for purchase yet — payments aren't set up", no retry. | V5/money | High |
| V03 | Whole learner area | Two messages per failure (inline plus the app-wide toast), often contradicting — quiz start/submit/autosave, mark complete, assignment upload/submit/draft, devices, checkout. | V5 | Medium |
| V04 | Player, devices, assignment, quiz | Server errors called connection problems ("Check your connection", "Offline — will retry"); a queued submit says "while offline" when online, retried 9 times in 5 s. | V5 | Medium |
| V05 | Player › another device | A 500 on takeover: "Reload the page to see the latest version" for every error. | V5 | Medium |
| V06 | Quiz results | "1 option selected · 1 correct option · 1 of 1 points": not which option was chosen or correct. | clarity | Medium |
| V07 | Quiz runner | No "Select all that apply"; the checkbox looks like a radio. | clarity | Medium |
| V08 | Quiz, one per page (phones) | Two stacked Previous/Next rows: questions, and leaving the quiz. | clarity | Medium |
| V09 | Quiz runner | The timer / answered / save strip hides under the academy's sticky header on scroll. | clarity | Medium |
| V10 | Assignment, checkout proof | 6,000 characters cut to 5,000 silently; note cut to 500 and reference to 120, no counter. | V7 | Medium |
| V11 | Assignment, checkout | 400s on `response`, `fileData`, `note` mark nothing; generic "isn't valid"; 409 expired plus a "changed elsewhere" toast. | V2/V5 | Medium |
| V12 | Checkout | No order or payment reference anywhere; a reload restarts and creates a new order; "Continue payment" restarts too. | money | Medium |
| V13 | Purchases | "Awaiting payment" with no link or expiry; "Expired" with no explanation or buy-again. | money | Medium |
| V14 | Device-limit dialog | "Remove" acts at once (the Devices page asks); both rows "Chrome on Linux"; "Close" in English on Arabic. | V9/V12 | Medium |
| V15 | Assessments, my courses, player | A quiz listed as "Not started" can't be opened ("not part of your enrolment"); "2 of 4" vs "1 of 2" activities. | clarity | Medium |
| V16 | Assignment › resubmit | Opens with an old never-sent local draft instead of the submitted response, without the PDF. | data loss | Medium |
| V17 | Arabic at 375 | English titles cut at the wrong end ("…h for Beginners"); punctuation and «» break around Latin text. | RTL | Medium |
| V18 | Arabic copy | "تعليم" for Flag; "على 2 أجهزة"; "1 من 9 نشاطًا"; mixed digits; native file input in English. | V12 | Low |
| V19 | Checkout, quiz | Continue, Submit for review, Start Quiz greyed with no reason; the file field not marked required. | V4/V1 | Low |
| V20 | All pages at 375 | Tap targets under 44 px (sections 36, tabs 32, breadcrumbs 18–26, dismiss 24, dialog close ~20). | a11y | Low |
| V21 | Error copy (white-label) | "Atlas could not reach the server", "The rest of Atlas is still working"; "Self-managed delivery"; "My Learn". | copy | Low |
| V22 | Overview, assignment | "Score 92" with no maximum or %. | clarity | Low |
| V23 | Checkout | Breadcrumb "Overview › Purchases" while the sidebar highlights My Courses. | clarity | Low |
| V24 | Quiz | An uncaught promise rejection on every failed submit. | quality | Low |
| V25 | Profile | A 400 on `name`: "Check this field" on First name only, no limit. | V2 | Low |

## Works well — keep

- Quiz: the submit confirmation lists unanswered questions (Arabic plurals right); answers
  survive leaving and failed autosave; "Finish up" on low time; auto-submit on time out with a
  clear message; double submit blocked; an honest integrity disclosure.
- Assignment: "Write a response or attach a file"; types and 10 MB up front, refused before
  upload; confirmations (late included); clear past-due state; typed text survives; the offline
  queue can be cancelled.
- Player: lock reasons spelled out (also under Next); no-content, processing, rate-limited and
  video-failed states clear; chevrons mirror in RTL.
- Payments: each status clear, rejection reason and "Submit a new payment"; checkout's 409
  "already under review — you don't need to pay again"; proof limits named.
- Devices page confirmation explains the consequences. Profile and security: inline errors,
  focus, summary, "Leave without saving?", one SaveFailedAlert.
- No page-level horizontal scroll at 375.

## Not tested, with reason
- Dark theme: the academy host forces the academy's light theme.
- Real submit, purchase, refund, password change, device removal; live-session join (no
  provider); video playback (no video lessons); real certificates; 768 px.
- The seeded quiz and assignment sit outside the course sequence: their player screens ran on
  mocks. Offline (`setOffline`) not meaningful under route mocks; network loss tested by abort.

## Fixes

### Shared root causes
- **One message per failure (V03)** — 25 learner mutation hooks (quiz start, submit and
  autosave, mark complete, assignment upload, draft and submit, devices, takeover, checkout,
  profile sessions and trusted devices) and the grant, outline and payment-method reads mark
  their errors inline (`INLINE_ERRORS_META`, checked by a test listing every hook).
- **The right cause (V01, V04, V05)** — only a real network failure mentions the connection; a
  5xx is "Something went wrong on the academy's side" with Try again; quiz autosave reads "Not
  saved — retrying", not "Offline"; takeover, device removal, mark complete and the draft give
  the server's own reason.
- **White label (V21)** — network and error-boundary copy say "this site" / "the page", not
  Atlas (dashboard too); delivery tiers "Standard delivery" / "Streaming-service delivery";
  "My learning".
- **Dialogs (V14, V20)** — the shared Dialog and Sheet close button is translated and has a
  44 px hit area (every dialog in the app).
- **Bidi (V17)** — `dir="auto"` on titles, headings, devices, responses, feedback and method
  descriptions; names inside sentences isolated with `isolateText`.
- **Backend (atlas-backend#106, #107)** — quizzes and assignments outside every unit are not
  part of the learner's course (dashboard, completion, counts); the completion read heals the
  stored verdict; an authoring change that can change completion recomputes every enrolled
  learner in the background.

### Per finding
- **V02** Checkout failures classified: already enrolled links to the course, a free course to
  its page; 5xx, abort and timeout "We couldn't start your order" with the reason and Try again
  (same idempotency key). "Not available for purchase yet" only when payments aren't set up.
- **V06** Results name the chosen and correct options; "0 of 1 point" (Arabic six forms).
- **V07** "Select all that apply."; the checkbox is square.
- **V08** The player's Previous/Next is hidden during an attempt.
- **V09** The quiz strip sticks below the theme header.
- **V10** The assignment counts to 5,000 and refuses past it; the proof note (500) and
  reference (120) count and refuse instead of cutting.
- **V11** Violations on `response`, `fileData`, `note`, `payerReference` show under their
  fields; anything else is one alert (a 409 expired order says it expired).
- **V12** Order and payment references (the first 8 characters, as in the academy's Orders
  list) on checkout, Purchases and Payments; a reload or "Continue payment" returns to the
  same payment's proof step.
- **V13** "Awaiting payment" shows the deadline and Continue payment; Expired / Cancelled say
  why and offer Buy again.
- **V14** Remove asks first; rows show "Added …" and last used; the current device is marked.
- **V15** "This activity cannot be opened" keeps the outline link and no longer offers Try
  again; detached items are no longer listed (backend).
- **V16** Resubmit prefills the submitted text and attachment; a server draft wins only if newer;
  an older local draft is dropped.
- **V18** "وضع علامة"; "جهازين"; Arabic plurals for activities; one digit style in the summary;
  the app's file button instead of the native input.
- **V19** Continue, Submit for review and Start Quiz stay enabled and say what's missing; the
  proof file is marked required.
- **V20** 44 px on phones: Sections/Contents, back link, tabs, breadcrumbs, the phone prompt
  dismiss.
- **V22** "92 / 100" ("92 من 100").
- **V23** Checkout sits under Courses: Courses › course › Checkout.
- **V24** A failed submit no longer leaves an unhandled rejection.
- **V25** A `name` violation names the 100-character limit for first and last name together.

### Not changed, with reason
- **V04 retry rate** — the offline outbox's full-jitter backoff is a deliberate design with its
  own tests; changing it is separate work.
- **V12 in a new tab** — no endpoint lists an order's payments, so a new tab restarts at the
  method step (the backend reuses the same order and payment).
- The quiz strip offset uses each theme's header-height variable; Riwaq has none and gets 0.
