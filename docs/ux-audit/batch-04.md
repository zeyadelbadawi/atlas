# B4 — Students, team and sales (Nov 2026)

Pages: members (team and students tabs, add instructor / manager / student, remove), student
drawer and its actions (approve, reject, block, enroll, set expiry, revoke), academy settings
(details, student registration and invites, devices, emails to students, delete academy),
academy profile, payment methods, payments review sheet, orders and order detail, revenue and
payouts, announcements, messages, activity log. Local stack, owner account, EN-light-1280 /
AR-dark-375 / AR-light-1280. Every form submitted wrong on purpose; 400 (real violation shape),
409, 500 and network abort forced; real backend 400s on the invite dialog. The local data has no
students, orders or payments, so those lists ran on mocked responses with every write
intercepted. 409 screenshots.

**34 findings — 8 High, 17 Medium, 9 Low.** The pattern: the server's real reason rarely
reaches the person — a generic toast (often plus a second from the app-wide reporter), the
field unmarked; several dialogs and two pages throw typed work away; three date fields accept
the past where the past does damage.

## Findings

| # | Page | What the customer saw | Rule | Sev |
|---|---|---|---|---|
| V01 | Settings › Create invite | Real 400 on `email`, `maxUses` (max 1000), `expiresInDays` (max 365): only "The invite could not be created."; nothing marked, limits never stated. | V2/V5/V7 | High |
| V02 | Settings › Delete academy | "The academy could not be deleted. **[server] errors.internal**" / "**[network] errors:network.description**", plus a second toast. | V5 | High |
| V03 | Messages › Preview recipients | 500 on a *preview*: "The message was not sent **internal**", out of view at the top. | V5 | High |
| V04 | Settings › Details; Profile | Contact phone "abc-phone", 600-character street, postal "ABC-!!-999999999": no message, saved (backend has only `@IsString`). The phone is public. | V7 | High |
| V05 | Announcements › New | A schedule 3 days in the past is accepted; the sweep publishes it at once, skipping the publish confirmation. | V7/V9 | High |
| V06 | Student drawer › Set expiry | 2020-01-01 accepted: the learner's access ends immediately, no warning. | V7/V9 | High |
| V07 | Settings › Registration policy | Leaving with an unsaved choice: no warning, lost. | V10 | High |
| V08 | Messages composer | Leaving with a typed message: no warning, lost. | V10 | High |
| V09 | ~20 member, settings, payment, student, announcement and message actions | Two toasts per failure (three on registration policy and devices); a 409 says "already a member" and "changed elsewhere" together. | V5 | Medium |
| V10 | Settings › Details; Profile save | Every 409/500/abort: "Failed to update settings — the action could not be completed"; a field 400 marks the field *and* toasts; `address.postalCode` not mapped. | V5 | Medium |
| V11 | Members › Add manager | An existing instructor: "already **a manager**" (the dialog's role, not theirs); Arabic "مديرًا" ungrammatical. | copy | Medium |
| V12 | Invite dialog | maxUses 0 / days 0: Create greyed with no reason; "1.5" sent as 1; Escape discards typed email. | V4/V7/V10 | Medium |
| V13 | Payment method dialogs | Escape discards typed bank details. | V10 | Medium |
| V14 | Payment method dialogs | Five inline errors, no summary; "longer than allowed" without the 2,000 limit; non-field 400: toast only. | V3/V7/V5 | Medium |
| V15 | Announcement dialog | Escape discards title and body. | V10 | Medium |
| V16 | Announcements list | "Scheduled" without when; no way to delete a draft or scheduled one. | clarity | Medium |
| V17 | Orders; Activity filters | From after To: "No orders match" — no message (B2 V22's Swap not applied). | V7 | Medium |
| V18 | Student › Block | An 800-character reason accepted (backend max 500); every failure "That action could not be completed." | V7/V5 | Medium |
| V19 | Payments review sheet | Approve/reject/refund failures name no reason, plus a second toast; reject reason cut at 1,000 silently; Escape discards it. | V5/V7/V10 | Medium |
| V20 | Settings › Devices | A `maxDevices` 400: generic inline + toast, field unmarked; "between 1 and the maximum shown" instead of the number. | V2/V5 | Medium |
| V21 | Settings › Details › slug | Changing the slug saves at once — it moves the site and locks the slug for 60 days. | V9 | Medium |
| V22 | Settings › Emails to students | Controls look enabled but are disabled; the reason sits at the bottom. | clarity | Medium |
| V23 | Revenue & payouts | "Your academy received this money directly; Atlas does not hold it" and "collected by bank transfer through Atlas" on one page. | copy | Medium |
| V24 | Members, Payments, Orders at 375 | Status, Joined and **Remove** off-screen in an unhinted inner scroll; course and amount cut. | overflow | Medium |
| V25 | Arabic details | Description textarea without `dir="auto"`; "mm/dd/yyyy" in date inputs; mixed digit styles. | RTL | Medium |
| V26 | Add student | 500 and abort get the same toast; a lost connection is not called that. | V5/V6 | Low |
| V27 | Members search | No match: "Your academy doesn't have any members yet." with 4 members. | copy | Low |
| V28 | Messages | Courses/staff audience with nothing ticked: buttons greyed, no reason. | V4 | Low |
| V29 | Student › Enroll | "Enroll" greyed until a course is chosen, no message. | V4 | Low |
| V30 | Orders | "reviewed by your organization owner" shown to the owner; "Awaiting review" has no link to the review. | copy | Low |
| V31 | 375 clipping (AR) | Drawer "إلغاء الوصول" cut; active settings tab scrolled out; payments tab "مرفوضة" cut; search placeholders cut. | overflow | Low |
| V32 | Toasts over dialogs at 375 | The toast covers the dialog title. | overlap | Low |
| V33 | Payments status | "Waiting for review" badge wraps to three lines. | polish | Low |
| V34 | Members header | Students tab keeps "Manage your academy team members"; icons touch labels; no "Add student" on Students. | polish | Low |

## Works well — keep

- Add student / instructor / manager: inline required and email messages, focus to the first bad
  field, the email lookup callout, "Leave without saving?" on Escape.
- Remove member confirmation names the person and says the account stays.
- Academy details: a taken slug shows on the field; unsaved bar and "Leave without saving?" for
  section switch and sidebar; same on Profile.
- Payment method client checks name the format (IBAN, SWIFT 8 or 11, `name@instapay`, wallet
  prefixes); "Optional." on optional fields.
- Confirmations for approve/reject, refund, publish announcement, lower device limit, revoke
  access, delete academy (typed name).
- A 409 on approve: "This payment is no longer waiting for review. Reload…".
- Load failures: inline error with Try again and a reference within ~2 s.
- Messages: counters, "Choose at least one way to send.", recipient preview before sending.
- Arabic coverage near-complete; RTL mirroring correct; dark contrast fine.

## Not tested, with reason
- Real approve / reject / refund, proof viewing, real join requests: no such data locally
  (mocked lists, writes intercepted).
- Real slug, currency or timezone change: out of bounds for the audit.
- Bulk actions, CSV import, role change, payment-method delete: not in the app.
- Video settings tab beyond its baseline; 768 px.
