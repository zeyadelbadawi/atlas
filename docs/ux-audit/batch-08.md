# B8 — Platform Owner console (Nov 2026)

Pages (`/dashboard/platform/*`): overview, organizations (list, detail, subscription
adjustments: change plan, extend, grant days), plans and add-ons (plan editor, history, add-on
pages), payment review (list, detail, proof, approve, reject), manual payment methods and the
payment provider, trial policy, users (list, detail, suspend, delete), support cases, customer
requests, contact enquiries, growth, commerce (commission, payouts), announcements, audit log,
observability. Local stack, platform owner, EN-light-1280 / AR-dark-375 / AR-light-1280; all 41
static routes plus the forms. Every write was answered by the test (a context-level guard
answered every non-GET call) and the database was checked unchanged afterwards. There are no
payments locally, so the review list and detail were mocked with the real response shape. 360
screenshots.

The DL-29 Platform Owner workstream has no open pull request in either repository (checked
6 Nov); re-checked before the fixes.

**33 findings — 7 High, 18 Medium, 8 Low.** The pattern: money decisions taken in one click
with no confirmation or result, a reviewer who can't match a transfer to a payment, prices and
trial lengths saved without any check, and failures that repeat, hide the reason or show a raw
key.

## Findings

| # | Page | What the operator saw | Rule | Sev |
|---|---|---|---|---|
| V01 | Payment review detail | "Approve payment" approves at once, no confirmation, no success; the page then says it "has already been reviewed", as if someone else did it; no who, when or back link. | V9/V11 | High |
| V02 | Payment review detail, list | Only "Reference pay_audit_1" (the payment id) — no Checkout ID the customer was told to use, no payer reference, upload time or receiving account; the list's search promises "reference". | money | High |
| V03 | Approve / reject failures | 409, 500, abort: "Unexpected error … Try again" plus a toast with another reason; Try again on a 409 invites approving twice; a 400 marks nothing. | V5 | High |
| V04 | Plan editor › price | -500, 0, 1190.50, 99999999999, "abc", Arabic digits, currency "E1": no message, all sent ("abc" as `null`); 0 makes the plan free silently. | V7/money | High |
| V05 | Organization › change plan | No key: nothing happens; a 400 doesn't name the field; no current plan, prices, effect of a downgrade, or whether the customer is charged or told. | V2/money | High |
| V06 | Payment methods › add (409) | "key 'conflict (en)' returned an object instead of string." (bank, wallet, InstaPay). | V5 | High |
| V07 | Plan editor › server 400 | "Check the highlighted fields — Enter a whole number": nothing highlighted, no field named; Arabic "يجب أن يكون Max courses…". | V5/V12 | High |
| V08 | Plan editor › save | Closes with no message — the save emails every paying organization on the plan. | V11 | Medium |
| V09 | Plan editor › trial, yearly | Trial -3, 1000, "abc" sent ("abc" resets to the default); a yearly price below one month's accepted. | V7/money | Medium |
| V10 | Plan editor › limits | -1: "Fill in the empty fields" (not empty); 2.5 sent; Arabic must type "unlimited"; no units. | V2/V12 | Medium |
| V11 | Plan editor | Escape with a typed price: lost. | V10 | Medium |
| V12 | Extend / grant days | Empty days not mentioned; one alert at the bottom, no field marked, no required marks; 400 generic; 409 inline and toast; Escape loses the reason. | V1/V2/V5/V10 | Medium |
| V13 | Organization detail | Trial end shown as "—"; roles raw ("owner", "member"); plan name in English; dates "11/5/2026". | clarity/V12 | Medium |
| V14 | Suspend user, request reply, internal switch, trial policy, methods, support | Two messages per failure (hooks without `INLINE_ERRORS_META`). | V5 | Medium |
| V15 | Payment methods › 400, Escape | "Iban has an unexpected format" without the format; a toast repeats it; Escape discards everything. | V5/V10 | Medium |
| V16 | Payment methods › disable | The only bank account disabled at once; doesn't say checkout stops offering bank transfer. | V9/money | Medium |
| V17 | Payment provider at 375 | Account number and IBAN wrap one character per line. | overflow | Medium |
| V18 | Payment provider | "Currently active: Manual Transfer" beside "Not configured" / "Disabled"; buttons greyed with no reason. | V4/clarity | Medium |
| V19 | Support case | The "Subject" label shows the requester's name and email. | clarity | Medium |
| V20 | Support case › reply | No counter (limit 5,000); a 400 inline "Unexpected error" plus a toast; no unsaved warning. | V7/V5/V10 | Medium |
| V21 | Support case › status | "Closed" applies at once; failure inline plus toast; cases can't be assigned. | V9/V5 | Medium |
| V22 | Payment review, contact enquiries | From after To accepted silently (audit log does it right). | V7 | Medium |
| V23 | Trial policy | 0 and 1000 days sent; no maximum anywhere. | V7/money | Medium |
| V24 | Users | A long unbroken name pushes every other column off-screen at 1280. | overflow | Medium |
| V25 | Plans & add-ons | 3 of 6 plans listed (premium-* not editable); no subscriber counts; no create/archive; add-ons in USD beside EGP, prices not editable. | clarity/money | Medium |
| V26 | Arabic pages | Plan, add-on, provider and method names, field names in messages, "Close" label in English. | V12 | Medium |
| V27 | Plan editor › limit impact | Raw "Usage is not tracked for: videoStorage"; an Arabic org name flips the line. | copy/RTL | Low |
| V28 | Plan editor › monthly emails | "abc": the help text turns red, no message; Save greyed. | V2/V4 | Low |
| V29 | Organization commission | -5: "up to two decimal places" instead of the 0–100 range. | V2 | Low |
| V30 | Delete user | "6291608 bytes of stored media". | copy | Low |
| V31 | Proof viewer | A 404 blamed on the connection. | copy | Low |
| V32 | RTL at 375 | Breadcrumb chevron points right; a Latin title's dash moves; tabs cut with no hint; "mm/dd/yyyy". | RTL | Low |
| V33 | Observability, overview | "All systems operational" beside "API — Status unknown"; "System Health 100%". | clarity | Low |

## Works well — keep

- Add-on status change: the dialog says the customer impact; one toast per failure; stays open.
- Lowering a plan limit needs the impact checked and a confirmation; a 409 says the plan changed.
- Plan editor checks the yearly price and gifted days with the range named.
- Payment method forms: IBAN, SWIFT, account, wallet and InstaPay formats with examples;
  "Optional." on Arabic fields; counters; focus to the first error; violations on their fields.
- Enabling a placeholder method confirms first. Delete user: type the email, impact itemised.
- Proof viewer: image, open in a new tab, download. Reject reason 10–1,000 checked inline.
- Payout dialog (reversed period caught), announcement summary, audit-log reversed range,
  commission checks.
- No page-level horizontal scroll at 375; tables show the scroll hint.

## Not tested, with reason
- Not in the console: suspend/reactivate/delete an organization, create/edit an add-on or its
  price, create/archive a plan, Arabic plan names, feature flags, a general settings page.
- Real payment decisions (no payments locally); every write answered by the test by design.
- Baseline only: course payment detail, mark payout paid, founding email, growth spend, launch
  checklist, blog editor, email compose, watermarks, Zoom, observability alerts. 768 px.
