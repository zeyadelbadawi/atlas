# B5 — Subscription and billing (Nov 2026)

Pages: plans, subscription (active and trial), billing overview, checkout (plan and add-on),
payment details (bank transfer, wallet, InstaPay: proof upload, cancel), payment history, usage,
add-ons (both pages), live sessions (course builder), support (new ticket, detail, reply),
customer requests (create, detail, reply, cancel). Local stack, owner account (Academy plan) and
a trial account, EN-light-1280 / AR-dark-375 / AR-light-1280. Every form submitted wrong on
purpose; 400 (real violation shape), 409, 500 and network abort forced. No purchase reached the
backend: every checkout, payment, proof, cancel and add-on action was answered by the test.
350 screenshots.

**35 findings — 9 High, 14 Medium, 12 Low.** The pattern: one-click actions that can't be
undone, payment pages that don't tell the customer what to do with their money, and failures
that repeat or hide the real reason.

## Findings

| # | Page | What the customer saw | Rule | Sev |
|---|---|---|---|---|
| V01 | Payment detail | "Cancel payment" cancels at once, no confirmation. | V9 | High |
| V02 | Add-ons (/dashboard/add-ons) | "Disable" and "Uninstall" act at once; nothing says what Uninstall removes (2 academies on a 1-academy plan with the +2 add-on). | V9 | High |
| V03 | Course builder › live session | "Publish" creates the meeting and notifies students at once, no confirmation. | V9 | High |
| V04 | Payment › proof upload | Every failure (400 on note/file, 409, 500, abort): "Unexpected error"; plus a second toast with another reason; the 400 marks nothing. | V5 | High |
| V05 | Payment › proof note | 1,200 characters accepted, no counter; the server's limit is 500 → "Unexpected error". | V7 | High |
| V06 | Payment › transfer instructions | "Use your Checkout id as the transfer reference" — no checkout id is shown anywhere; the page shows the payment id as "Reference". | money | High |
| V07 | Payment, expired | Bank details, file picker and Submit still shown; nothing says to start a new checkout. | money | High |
| V08 | Checkout › start (409) | "key 'conflict (en)' returned an object instead of string." | V5 | High |
| V09 | Subscription (active) | No next payment date, price or cycle; payments are manual but the cancel dialog says "will not renew"; the owner learns payment is due only after it lapses. | money | High |
| V10 | Plans | No "Current plan"; "Select this plan" on the current plan leads to "You're changing your organization's plan"; no prices on the cards. | clarity | Medium |
| V11 | Checkout › plan change | Nothing about the days already paid on the current plan. | money | Medium |
| V12 | Cancel, request create/reply, support reply, checkout, payment | Two or three messages per failure (hooks without `INLINE_ERRORS_META`). | V5 | Medium |
| V13 | Cancel subscription/trial | The dialog closes on failure, losing reason and feedback; Escape discards typed feedback. | V6/V10 | Medium |
| V14 | Live session form | A start 3 days ago (or in 2027) accepted; the backend has no past check. | V7 | Medium |
| V15 | Live session form | Escape discards typed title and dates. | V10 | Medium |
| V16 | Live session form | 400 on start: "Check this field" plus a toast; the backend's schedule errors carry no field. | V5 | Medium |
| V17 | Live session row | Date only (no time, duration); no cancel or delete. | clarity | Medium |
| V18 | Payment › proof file | "The file is too large." (limit not named); types and size not stated before; Submit greyed with no reason. | V8/V4 | Medium |
| V19 | Support › reply | Cut silently at 5,000, no counter; leaving with a typed reply loses it; failure plus a toast. | V7/V10/V5 | Medium |
| V20 | Customer request › custom domain | "my academy dot com" accepted and saved. | V7 | Medium |
| V21 | Billing, checkout, add-ons, payment (AR) | Plan, add-on and payment-method names and instructions in English on Arabic pages. | V12 | Medium |
| V22 | Billing overview | "EGP 6,990.00 · Pending" ×2 — not what for or what to do; empty state "Once content is added…". | clarity | Medium |
| V23 | Add-on checkout | No add-on name or price; offered for an active add-on and one not on sale. | money | Medium |
| V24 | Payment, rejected | "Start a new checkout" with no link. | clarity | Low |
| V25 | Checkout | "Continue to payment" greyed with no reason; focus lost after "Start checkout". | V4 | Low |
| V26 | Cancel dialog | Confirm greyed until a reason is picked; the reason isn't marked required. | V1/V4 | Low |
| V27 | Support › new ticket | No required marks, no subject counter; 400 without the limit; a 500 blames "the details". | V1/V5 | Low |
| V28 | Customer request dialog | No error summary; title input allows 200 while the limit is 160; "Keep this under 253" although 253 is allowed. | V3/V7 | Low |
| V29 | Usage (AR) | Progress bars fill from the left in RTL. | RTL | Low |
| V30 | Requests at 375 (AR) | Status tabs cut, no hint. | overflow | Low |
| V31 | Plans | Escape on the comparison goes to /dashboard, not back. | clarity | Low |
| V32 | Subscription (trial) | "7 days remaining" without the end date or what happens; cancel says "loses access" without saying what happens to courses and students. | copy | Low |
| V33 | Add-ons, two pages | Same title, different content; "15 USD / month" next to EGP plans; "✓ Disable" reads like a state. | consistency | Low |
| V34 | SaaS overview | "1 active add-ons". | copy | Low |
| V35 | Support | A ticket can't be closed by the customer. | clarity | Low |

## Works well — keep

- New support ticket: limits named, counter, attachment rules before upload, "Leave without
  saving?", one inline failure, field violations on their fields.
- Customer requests: per-type fields with limits, focus to the first error, dirty guard,
  truthful cancel confirmation, "What happens next".
- Truthful money and trial copy ("you're not losing time you've already paid for", "No credit
  card required… You won't be charged when it ends"); never "free".
- Checkout: per-cycle price, "Takes effect: when your payment is confirmed", a 409 on payment
  points to the payment already awaiting review.
- Proof upload refuses a wrong type naming PNG, JPG or PDF.
- Live session form: end after start, 5 minutes to 12 hours, 200/2000 limits, recording quota.
- No page-level horizontal scroll at 375 px; RTL otherwise correct.

## Not tested, with reason
- Real checkout, payment, proof, cancel, trial start and add-on actions: no purchases.
- Gateway redirect: no gateway method enabled locally.
- Live-session pages behind the feature flag (off); invoices (route redirects to history).
- Grace period, cancelled-but-active, gift, price change: no local data. 768 px.

## Fixes

### Shared root causes
- **One message per failure (V12)** — 13 billing, tenant, customer-request, support and
  live-session hooks now mark their errors inline (`INLINE_ERRORS_META`, checked by a test);
  each caller shows one message with the real reason.
- **Progress bars in RTL (V29)** — the shared `Progress` track is mirrored in RTL, so every bar
  (usage, quotas, 11 places) fills from the reading start.
- **Arabic length messages** — "يجب ألّا يزيد طول {{field}} عن …" / "يجب ألّا يقل طول …": the
  verb agrees with "طول", so a feminine label ("ملاحظة") no longer reads ungrammatically.
- **Backend (atlas-backend#104)** — live-session schedule refusals name their field
  (`scheduledStartAt` / `scheduledEndAt`) and a start in the past is refused; a custom-domain
  request's domain is checked with IDNA encoding and DNS limits (Arabic and other scripts pass).
  A digest e2e test that failed whenever CI crossed 06:00 UTC now counts only its own digests.
- Grace period constant on the client corrected to the backend's 7 days (it said 3; unused).

### Per finding
- **V01–V03** Cancel payment, Disable/Uninstall add-on and Publish live session ask first and say
  what happens — what to do if money was already sent; that an uninstalled paid add-on must be
  bought again and the academy limit drops (nothing is deleted); that publishing creates the
  meeting and notifies every enrolled student.
- **V04 / V05 / V18** New proof form: "PNG, JPG or PDF, up to 10 MB" before choosing; the limit
  named on refusal; a 0/500 note counter, refused before sending; 400s on `note`/`fileData` on
  their fields; any other failure one `SaveFailedAlert`; Submit never greyed without a reason.
- **V06** The copyable Checkout ID the instructions refer to is shown next to them (the header row
  is labelled "Payment ID").
- **V07 / V24** A failed, rejected, cancelled or expired payment hides the bank details and the
  upload, says why, and links to "Start a new checkout" for the same plan or add-on.
- **V08** Checkout resolves error keys through `displayableErrorKey` — no "returned an object".
- **V09 / V32** Subscription shows price, cycle and "Next payment due"; says Atlas doesn't charge
  automatically, what happens if no payment is confirmed (grace, then expiry) and links to pay;
  the trial shows its end date and that nothing is charged or deleted; cancel no longer says
  "will not renew".
- **V10 / V11 / V23 / V25** Plans mark the current plan, show prices, and offer "Pay for the next
  period" on it; checkout for the current plan says it pays the next period and when it starts; a
  plan change says paid days aren't lost (what the backend does); add-on checkout names the
  add-on and price and isn't offered for an active or unavailable one; disabled buttons say why.
- **V13 / V26** The cancel dialog stays open on failure with the reason inline, keeps the typed
  feedback, asks before discarding it, and marks the reason required.
- **V14–V17** Live sessions: past start refused (client and server), dirty guard, server schedule
  refusals on their fields, rows show time and duration, draft/scheduled sessions can be cancelled
  with confirmation.
- **V19 / V27 / V28** Support reply and ticket, customer request: counters with the real limits,
  no silent cuts, required marks, error summary, unsaved warnings, one inline failure; the 500
  copy no longer blames the details.
- **V20** The domain must look like a domain (client) and be one (server), with an example.
- **V21** Plan names through `resolvePlanName`; seeded add-ons and payment methods translated by
  key. **Partly:** names a Platform Owner typed stay as typed — the backend has no Arabic columns.
- **V22 / V30 / V31 / V33 / V34** Pending items say what they are with an "Open payment" link;
  status tabs wrap; closing the plan comparison goes back; one title per add-on page and the
  currency named; i18next plurals for add-ons.

### Not changed, with reason
- **V35** A customer can't close a support ticket: the API has no endpoint for it.
- **Platform payment review (B8)** shows only the payment ID; reviewers need the Checkout ID the
  instructions name — noted for B8.
- Arabic names for Platform-Owner-created add-ons and payment methods need backend columns.
