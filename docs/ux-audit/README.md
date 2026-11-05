# Dashboard UI/UX audit — plan and standard

Owner decision, 5 Nov 2026: audit and fix the whole dashboard (`/dashboard/*`) in a
few batches, page by page, with validation as the first priority. The marketing
site and the public academy sites are out of scope for now.

## Goals for every page

1. **Clear** — the person knows where they are, what is expected and what a button does.
2. **Validated** — any mistake gets a message that says what is wrong and how to fix it.
   Nothing fails silently.
3. **Visually sound** — nothing overflows, overlaps or clips at phone, tablet and desktop
   widths, in English and Arabic (RTL), light and dark.
4. **Accessible** — WCAG 2.1 AA: contrast, keyboard, screen reader, target size.

## Validation standard (definition of done for every form)

| # | Rule |
|---|---|
| V1 | Every required field is marked; optional fields say "Optional". |
| V2 | A rejected value shows its message under the field, in the person's language, saying what is wrong and how to fix it. |
| V3 | Two or more problems (or one the form cannot show by a field) show `FormErrorSummary` at the top; it takes focus and links to each field. |
| V4 | A submit button is never disabled without a visible reason. |
| V5 | Server failures: field violations land on their fields (`useServerValidation`); anything else shows ONE toast with the real reason (`useApiMutation`). Never a raw code or a bare "something went wrong". |
| V6 | Offline or expired session: a clear message, and typed input is not lost. |
| V7 | Formats are checked before sending: email, phone, URL, numbers, prices (no negatives), dates (end after start), lengths (counter on long text). |
| V8 | Uploads: type and size are checked before uploading, naming what is allowed. |
| V9 | Irreversible actions (delete, cancel, suspend) ask for confirmation and say what will happen (`useConfirmDialog`). |
| V10 | Leaving a page with unsaved changes warns first (`useUnsavedChanges`; `useDirtyGuard` for closing a dialog or drawer). |
| V11 | Success is confirmed. |
| V12 | All of the above in English and Arabic (RTL). |

## Shared building blocks

| Need | Use |
|---|---|
| Field label, required marker, help text, inline error, ARIA wiring | `FormField` (`@shared/forms`) or the shadcn `FormItem`/`FormMessage` |
| Schema rules and messages | `validation.schemas.ts` + `validation` i18n namespace |
| Error summary at the top of a form | `FormErrorSummary` (`@shared/forms`) — B0 |
| Server violations onto fields | `useServerValidation`, `applyServerViolations` |
| Failure toast | `useApiMutation` — one toast with the specific reason (B0) |
| Confirmation | `useConfirmDialog` |
| Unsaved changes | `useUnsavedChanges` (`@hooks`) for leaving a page; `useDirtyGuard` for closing a dialog or drawer |

## Batches

| Batch | Scope | Dates |
|---|---|---|
| B0 | Foundation: one specific failure toast, `FormErrorSummary`, form inventory | 6 Nov |
| B1 | Sign-up, sign-in, password reset, email verification, 2FA, organization and academy creation, provisioning, onboarding, profile, settings | 7–8 Nov |
| B2 | The academy website: settings, pages, visual editor, content, branding, preview, website messages | 9–11 Nov |
| B3 | Courses: list, create, setup, builder, settings, quizzes, assignments, reviews, media, certificates | 12–14 Nov |
| B4 | Students, team and sales: members, join requests, orders, payments, payment methods, revenue, reports, activity, announcements, messages, academy settings | 15–16 Nov |
| B5 | Subscription and billing: plans, subscription, payments, usage, add-ons, live sessions, support, customer requests | 17–18 Nov |
| B6 | Instructor area: courses, students, assessments, grading, quiz results, discussions, announcements, analytics | 19–20 Nov |
| B7 | Learner area in the dashboard: my courses, player, quizzes, assignments, discussions, live sessions, results, notifications, search | 21–22 Nov |
| B8 | Platform Owner console (`/dashboard/platform/*`), checked first against the DL-29 workstream | 23–25 Nov |

## How a batch runs

1. Inventory the batch's pages, forms and fields ([inventory.md](inventory.md) is the starting list).
2. Code review against the Web Interface Guidelines (`web-design-guidelines`) and V1–V12.
3. Visual review (`web-design-reviewer`) on a local stack with demo data — never production
   writes: every page at 375 / 768 / 1280 px, EN + AR, light + dark, and every form
   submitted wrong on purpose (empty, bad format, too long, wrong file, server error).
4. Specialist passes: `accessibility-review`, `ux-copy`, `design-critique`, `design-system`.
5. Findings in `batch-NN.md`; fixes with tests that prove each message appears.
6. **Before/after screenshots of every visible change are sent to the owner in chat**
   (small related changes grouped into one screenshot).
7. PR, CI, deploy, read-only check on production, report.
