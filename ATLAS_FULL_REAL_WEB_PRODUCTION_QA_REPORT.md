# Atlas — Full Real-Web Production QA Pass

**Target** `https://atlass.dpdns.org` (production) · **Date** 12 September 2026
**Tenant** organisation `elzoz` / academy `elzozo`
**Identities driven** Client Owner `ziad` (owner) and `mannger` (manager), in two separate Chrome profiles, both live at once

---

## 1. Executive summary

**Twelve defects found, fixed, deployed and re-verified in production**, plus one test
that was still asserting a bug. Six defects came from the first half of this pass; six
more surfaced only once two real browser sessions were driven against the same page at
the same time — which is exactly the scenario a test suite cannot reach.

The two most serious were both silent. `expectedVersion` was documented as something
"every Atlas editor sends", and tracing every caller showed that to be false: the SEO
dialog replaced the whole `seo` object without it, so a second admin saving a stale
dialog destroyed the first one's title and description with no error and nothing to show
it had happened. And the CMS editor's own preview crashed intermittently on a null
document root, replacing the page with "this section could not be displayed".

One check could not be completed and is stated as such: the expired-subscription state
could not be exercised live without destroying the only active trial available.

**Final status: production verified.** Every claim below is backed by a status code, a
byte comparison, a screenshot, or a named test run.

---

## 2. Exact changes made

### Backend — `zeyadelbadawi/atlas-backend`

| Commit | Change |
|---|---|
| `2911f6d` | Serve media from Atlas's own origin — the stored "public URL" was never public |
| `8659e71` | `expectedVersion` required; Arabic genuinely optional; HSTS pinned to one year |
| `4c9a0b6` | Correct a submission-attachment test that still asserted the broken URL shape |

### Frontend — `zeyadelbadawi/atlas`

| Commit | Change |
|---|---|
| `cb76a3b` | Upload progress: honest stages, indeterminate where nothing is measurable |
| `794a08b` | Bidi isolation — Arabic users were reading image dimensions backwards |
| `dc6996b` | Plural forms for the trial/grace countdowns, both languages |
| `06b3e52` | Checkout's payment step: an empty state instead of a blank panel |
| `eec4152` | Upload failures say *why*; generic fallback no longer renders a diagnostic |
| `af2bfd6` | Interim QA report |
| `97ae29c` | SEO dialog and visibility toggle send `expectedVersion`; editor surfaces violations |
| `4d86dd3` | Each layer owns the security headers it serves; custom domains get them too |
| `d264936` | `useDateFormatter` — dates follow the user's language, not the browser's |
| `a17e42f` | Preview iframe crash on a null document root |

Deployed SHAs confirmed equal to the tested HEADs: frontend `a17e42f`, backend `8659e71`.

---

## 3. Real two-user concurrent editing — evidence

Both sessions live simultaneously, in separate Chrome profiles, driven independently.
Identity confirmed from each session's own JWT and the academy members list, not assumed:

- Browser 2 → `4751df57…` `ziad` / `ziad@ziad.com` / **owner**
- Browser 1 → `19e86e51…` `mannger` / `manger@gmail.com` / **manager**

| # | Requirement | Result |
|---|---|---|
| 1 | Both open the same editor | ✅ same academy, same page `82c581c5…` |
| 2 | Presence visible between sessions | ✅ both directions |
| 3 | Each sees the other's correct name and role | ✅ see below |
| 4 | Not a generic "another user" | ✅ real names rendered |
| 5 | Manager identified as Manager, Owner as Owner | ✅ per the real role model |
| 6 | Presence clears when one leaves | ✅ `participants: []` immediately on navigate-away |
| 7 | Simultaneous editing from both | ✅ both held dirty drafts at version 8 |
| 8 | Optimistic concurrency in the real UI | ✅ full sequence below |
| 9 | No silent data loss | ✅ Owner's save intact throughout |
| 10 | Unauthorized roles refused | ✅ see §10 |
| 11 | Real browser sessions, not tests | ✅ every row above |

**Presence, Owner's screen (Arabic/RTL):**
> `mannger (مدير) يقوم بتحرير هذه الصفحة الآن.`

**Presence, Manager's screen (English/LTR), at the same moment:**
> `ziad (Owner) is currently editing this page.`

Real names, correct roles, each localized to that viewer's own language.

**The conflict sequence, all through the production UI:**

| Step | Actor | Result |
|---|---|---|
| Both editors loaded | — | both hold **version 8** |
| Toggle section, Save | Owner | **200**, version → **9** |
| Save stale draft | Manager | **refused** — conflict dialog |
| Server state after refusal | — | still **9**, Owner's change intact |
| "Keep my changes" (re-base) | Manager | **200**, version → **10** |

The dialog the Manager actually saw:

> **This page changed while you were editing**
> ziad saved a newer version while you were editing.
> Reload to see their version and start again from it, or keep your changes and apply
> them on top of theirs. **Their work is never discarded either way.**
> `[Keep my changes]` `[Reload latest]`

It names the colleague who saved. The re-base moved 9 → 10, proving it built **on** the
Owner's save rather than over it — had it clobbered, it would have gone 8 → 9.

The page was captured before the test and fully restored afterwards (title, slug,
visibility, SEO, sections all back to original).

---

## 4. Presence verification — mechanism

Backend response to the Owner's heartbeat, while the Manager had the editor open:

```json
{ "participants": [ { "userId": "19e86e51-…", "name": "mannger",
                      "role": "manager",
                      "startedAt": "…T06:04:07Z", "lastSeenAt": "…T06:06:07Z" } ] }
```

`lastSeenAt` advancing two minutes past `startedAt` is the live heartbeat. Additionally:

- **Cross-academy presence is refused** — heartbeat on another academy: `403
  errors.tenancy.notAMember`.
- **Presence is advisory, never a lock** — a save succeeded while the other session held
  a presence entry. A crashed browser therefore cannot lock anyone out; the 60-second
  TTL is tidiness, not the safety mechanism.
- Presence deliberately pauses on a hidden tab (documented in the hook). Observed
  first-hand while driving two windows, where the background one is occluded.

---

## 5. `expectedVersion` — decision and rationale

**Decision: required. Implemented.**

The audit that changed it matters more than the change. The field was optional so a
caller predating it would get last-write-wins rather than a hard failure, justified in
the source by "Every Atlas editor sends it."

**That was false.** Tracing every caller:

| Caller | Sent it? |
|---|---|
| `WebsitePageEditorPage` (section editor) | yes |
| `WebsitePageSeoDialog` | **no** |
| `WebsitePagesPage` (visibility toggle) | **no** |

The SEO dialog is the damaging one: it replaces the entire `seo` object, so two admins
editing SEO meant the second silently destroyed the first's title and description. The
leniency was not protecting a legacy client — it was enabling exactly the data loss the
concurrency feature exists to prevent.

**Why requiring it is safe here** — each checked, not assumed:

- No external contract to break: Swagger is **disabled in production** (`/api/docs` →
  `404`, confirmed live).
- Nothing but the HTTP route reaches `WebsitePagesService.update` — no internal or
  system callers.
- Every Atlas caller now sends it (both gaps fixed and shipped **before** the backend
  began requiring it, so no deploy-order window).

**Refused in the service, not the DTO.** A concurrency token is not something the user
typed, so a `violations: [{field: 'expectedVersion'}]` response would attach an error to
a form control that does not exist. The service returns
`400 errors.website.versionRequired` with copy telling the one caller this can still
happen to — a tab loaded before the deploy — to reload.

**Verified in production after deploy:** a version-less `PATCH` → `400
errors.website.versionRequired`, and the row unchanged.

**Residual risk:** a browser tab loaded before this deployed will get that 400 on its
next save. It is one reload, and the alternative was silently destroying a colleague's
work.

---

## 6. Security headers — investigation and final state

**Attribution, established by comparing three response paths:**

| Path | Served by | Before |
|---|---|---|
| `/` (SPA document) | Caddy directly | one set |
| `/health` | Caddy directly | one set |
| `/api/*` | proxied to Nest | **two sets** |

The site-wide `header` block in the `Caddyfile` also stamped proxied responses, on top of
helmet's. Two of the four pairs **disagreed**:

```
referrer-policy: strict-origin-when-cross-origin      ← Caddy
referrer-policy: no-referrer                          ← helmet
strict-transport-security: max-age=31536000           ← Caddy
strict-transport-security: max-age=15552000           ← helmet
```

Nothing was broken, because the specs pick a winner in each case — Referrer Policy takes
the last valid value, RFC 6797 §8.1 takes the first HSTS. But the effective policy was an
accident of ordering between two layers that knew nothing about each other. The one with
teeth is `X-Frame-Options`: browsers are entitled to treat a multi-valued XFO as invalid
and ignore it.

**Fixed at the correct layer.** Headers moved into a snippet imported by the *static*
handlers only, so Caddy stops second-guessing responses it merely proxies.

**That surfaced a second, larger gap.** The catch-all `:443` block — the one serving
academies on their own connected domains — had **no header block at all**. Same app, same
files, no HSTS, no XFO, no nosniff, purely because of which hostname a visitor arrived
on. It now imports the same snippet.

**HSTS pinned, so nothing was downgraded.** With Caddy's copy gone from `/api`, helmet's
180-day default would have become the only value — and HSTS is host-level, so the
shortest response wins. It is pinned to one year to match.

**Verified in production after deploy:**

```
/api/v1/auth/login          /
referrer-policy: no-referrer                    referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=31536000     strict-transport-security: max-age=31536000
x-content-type-options: nosniff                 x-content-type-options: nosniff
x-frame-options: SAMEORIGIN                     x-frame-options: SAMEORIGIN
```

Every header exactly once. No policy removed; HSTS unchanged at one year on both paths.

---

## 7. Arabic numerals — decision and final state

Investigated rather than assumed, and it decomposed into **two different things**.

**A real bug.** Twenty-four screens rendered dates with a bare
`new Date(v).toLocaleDateString()`. With no locale argument that uses the **browser's**
locale — so an Arabic user on an en-US machine saw `9/12/2026`, the same user on a de-DE
machine would see `12.9.2026`, and Atlas chose neither. This is what produced the
mismatch originally spotted: a browser-locale date sitting directly under a correctly
localized `٣٨١ بايت`. **Fixed** — `useDateFormatter` binds the active language to the
`formatDate` util the codebase already had, all 21 files converted, and a guard test
re-scans `src` so the pattern cannot return.

**A product decision, deliberately not taken here.** Atlas formats numbers through `Intl`
with `ar-EG`, which yields Arabic-Indic digits (`٣٨١`, `١٬٢٣٤`); date-fns renders Arabic
months with Latin ones (`12 سبتمبر 2026`). Both are internally consistent. Which numeral
system an Arabic product uses is regional and brand-level — Egypt and the Gulf differ —
it affects every screen, and a QA pass is the wrong place to settle it unilaterally.

**Recommendation:** pick one and state it in the design system. If Arabic-Indic, the
date layer moves to `Intl`; if Latin, `number.utils` drops to `ar` rather than `ar-EG`.
Either is a one-line change in one place now that both go through a util.

Technical values are deliberately left Latin and LTR-isolated: dimensions (`240×160`),
ratios (`16:9`), IDs. Reversing those in RTL was itself a bug fixed earlier in this pass.

---

## 8. Media and upload verification

| Check | Result |
|---|---|
| Real PNG upload | ✅ 381 B, through the live UI |
| Real JPEG upload | ✅ 1435 B |
| Upload progress | ✅ honest stages; indeterminate where nothing is measurable |
| Uploaded image renders | ✅ `naturalWidth` 240 × 160, `complete: true` |
| Previously broken images | ✅ all 4 assets render; root cause fixed in `2911f6d` |
| Byte-exact round-trip | ✅ SHA-256 of served bytes == file on disk, both files |
| URL is relative, no storage host | ✅ `/api/v1/public/media/…` |
| Anonymous fetch | ✅ `200 image/png`, `credentials: 'omit'` |
| Cache headers | ✅ `public, max-age=31536000, immutable` |
| Failed upload messaging | ✅ names the reason and the accepted formats |
| Arabic/RTL | ✅ `نوع الملف هذا غير مدعوم…  · ٤٥ بايت` + `إعادة المحاولة` |

The failure case was reproduced with a real 45-byte text file named `.png`; before the
fix it rendered a blank reason line and a Retry button that would fail identically
forever.

---

## 9. Trial, subscription and plan upgrade verification

| Check | Result |
|---|---|
| No auto-trial on organisation creation | ✅ row created `status: 'expired'`, `trialEndsAt: null` |
| Explicit confirmation enforced server-side | ✅ without `confirm` → `400` on that field |
| Re-redemption refused | ✅ `200 {"started": false, "reason": "already_has_subscription"}` |
| Trial not extended by the attempt | ✅ `trialEndsAt` byte-identical before and after |
| Cancellation requires confirmation | ✅ `@Equals(true)` on `confirm` |
| Cancelling never restores eligibility | ✅ redemptions are **insert-only** across the whole backend |
| Durable redemption history | ✅ both FKs `SetNull`, never `Cascade` |
| Farming prevention | ✅ `subjectHash @unique`; claim is `INSERT … ON CONFLICT DO NOTHING` |
| Device/browser change irrelevant | ✅ IP and user-agent recorded, never consulted |
| Upgrade: current and target plan shown | ✅ Starter → Growth |
| Price from the backend | ✅ **$79.00/mo**, matching `/api/v1/plans` exactly |
| No invented proration, no false "immediate" | ✅ "Takes effect: when your payment is confirmed" |
| Trial→paid semantics honest | ✅ "You keep trial access until then." |
| No upgrade before approval | ✅ still `starter`/`trialing` after reaching checkout |
| Empty payment-method state | ✅ explains and points at support; continue correctly disabled |
| Live trial state | ✅ `starter`/`trialing`, mutations succeed (`200`) |

Live at the time of testing: trial ends `09:19:05Z`, current time `08:31Z` — still
active, so mutations correctly succeed.

---

## 10. Tenant and security verification

Direct URL manipulation with a **valid token**, run as both identities:

| Probe | Owner | Manager |
|---|---|---|
| Own academy media / pages / announcements | `200` | `200` |
| **Other academy** media | `403 notAMember` | `403 notAMember` |
| **Other academy** pages | `403 notAMember` | `403 notAMember` |
| **Other academy** announcements | `403 forbidden` | — |
| **Other academy** editing presence | `403 notAMember` | — |
| **Other org** subscription | `403 notAMember` | — |
| **Platform** announcements (not platform owner) | `403 forbidden` | `403 forbidden` |
| **Platform** subscriptions | `404` | — |
| Start trial | allowed | **`403 notAMember`** |
| Cancel trial / cancel subscription (valid bodies) | — | **`403 notAMember`** |

Billing is owner territory and the Manager is refused at the permission check, which is
the **first statement** in each handler — so the refusal happens before any service call
and no billing state can change. The live trial was confirmed untouched afterwards.

Media object-store probes:

| Probe | Result |
|---|---|
| Own object | `200 image/png` |
| Own object name under a **different academy id** | **`404`** |
| Path traversal `..%2F..%2F` | **`400`** |
| Non-UUID academy / non-UUID object / bad extension / no extension | **`400`** each |

**No secrets exposed:** served HTML scanned for storage hosts, key patterns and
credentials — zero matches. Error bodies carry `kind`, `messageKey`, `status`,
`requestId` and nothing else; no stack traces, no internals.

---

## 11. Automated test results

| Suite | Result |
|---|---|
| Frontend unit/integration | **210 passed**, 22 files |
| Backend e2e — website, CMS, public site, media, subscription, trials | **136 passed**, 14 suites |
| Backend e2e — expiration + trial abuse + trial flow/cancellation | **57 passed**, 3 suites |
| Backend e2e — **full suite** | **937 passed / 942**, 90 of 92 suites — see below |
| Typecheck (both repos) | clean |
| Lint (both repos) | **0 errors** (13 pre-existing react-refresh warnings, untouched files) |
| Build | succeeds |

### The full backend suite, and what it caught

Running all 942 backend e2e tests surfaced failures the targeted runs did not. Rather
than assume, each was bisected against two baselines — `src/` checked out at `2911f6d`
(before this continuation) and at `a0971b7` (before the entire QA pass) — and re-run in
isolation:

| Suite | Verdict | Evidence |
|---|---|---|
| `lms-authoring` | **Mine — fixed in `4c9a0b6`** | passed at baseline, failed at HEAD; now **10/10** |
| `platform-control-plane` | pre-existing | **4 failures at baseline vs 3 at HEAD** |
| `courses-tenant-isolation` | pre-existing flake | fails intermittently at baseline too; **passed** in the final run |
| `phase10-6-deletion-and-provisioning` | ordering artifact | **25/25 in isolation**, twice |
| `media.e2e-spec` | ordering artifact | **17/17 in isolation** |

**The one that was mine mattered.** `lms-authoring` asserted
`stringContaining('http')` on an uploaded attachment's `url` — an assertion that encoded
the exact defect `2911f6d` fixed. Submission attachments share the media pipeline by
design, so they received the corrected relative URL and the old assertion broke. It now
pins the real contract (`/api/v1/public/media/academies/{uuid}/{uuid}.png`) and refuses
the storage host outright. Fixed, not excused.

This is why the full suite was run and not only the suites touched. Had it been skipped,
a test asserting a bug would have stayed green by absence.

**On the two remaining full-run failures:** both suites pass on their own, and
`platform-control-plane` fails *more* at the pre-pass baseline than at HEAD. The residual
failures are shared-database interference between 92 sequential suites — a test-isolation
problem, not a product one. It is real and worth its own pass, and is listed in §14 rather
than absorbed.

**Every new test was mutation-checked** — the fix removed, the suite re-run, the failure
confirmed:

| Guard | Mutation | Failures |
|---|---|---|
| `expectedVersion` required | restore last-write-wins | 1 |
| Arabic optional | make `ar` required again | 1 |
| Caddy header ownership | restore the site-wide block | 2 |
| Locale-aware dates | reintroduce one bare call | 1 (names the file) |
| Preview null root | — | keeps the unguarded call, asserts it still throws |
| Bidi isolation | drop `dir="ltr"` | 4 |
| Trial plurals | restore single form | 5 |
| Media error strings | delete them | 5 |
| Media URL derivation | restore stored `url` | 4 |

One of my **own** assertions was too weak and was repaired mid-pass: i18next echoes a
missed key *without* the namespace prefix, so `not.toContain('errors.media…')` passed
against the very failure it was written to catch. Tightened to reject key-shaped output
*and* the generic fallback; only then did the mutation report all five failures.

---

## 12. Production browser test results

Real Chrome, two profiles, both identities, both languages.

| Surface | EN | AR | RTL | States | Console |
|---|---|---|---|---|---|
| Academy Media | ✅ | ✅ | ✅ | loading / empty / **error+retry** / success | clean |
| Upload progress | ✅ | ✅ | ✅ | reading / uploading / processing / failed | clean |
| CMS page editor | ✅ | ✅ | ✅ | loading / **conflict** / validation / saved | clean |
| Presence banner | ✅ | ✅ | ✅ | present / cleared | clean |
| Subscription | ✅ | ✅ | ✅ | skeleton / trial countdown | clean |
| Plans + comparison | ✅ | ✅ | ✅ | real limits from backend | clean |
| Checkout / upgrade | ✅ | ✅ | ✅ | review / summary / **empty method** | clean |
| Announcements | ✅ | ✅ | ✅ | empty state, create gated | clean |

**Console:** the only errors captured in the whole session are five `PreviewViewport`
crashes at 10:58 and 11:04 — all **before** that fix deployed. Repeated editor loads at
11:33 produced **no new errors** and no error boundary.

**Network:** no unexpected 4xx/5xx. Every non-2xx observed was an intentional probe
(cross-tenant `403`, traversal `400`, stale-version `409`, version-less `400`).

---

## 13. Deployment and commit information

Production is running exactly the code tested:

| Repo | Local HEAD | Deployed SHA | Result |
|---|---|---|---|
| `atlas` (frontend) | `a17e42f` | `a17e42f` | success |
| `atlas-backend` | `4c9a0b6` | `4c9a0b6` | success |

Production re-checked after the final deploy: `/health` → `200`, media serve → `200`.

Frontend shipped **before** the backend began requiring `expectedVersion`, so there was
no window in which a live caller could be rejected for a field it did not yet send.

---

## 14. Remaining issues

| # | Issue | Class |
|---|---|---|
| 1 | The SPA document carries **no Content-Security-Policy**, while helmet sends one on API JSON where it does almost nothing | **non-blocking** |
| 2 | Expired-subscription state not exercised live | **intentionally out of scope** |
| 3 | Payment-proof upload flow not exercised | **intentionally out of scope** |
| 4 | Arabic numeral system divergence (Intl `ar-EG` vs date-fns `ar`) | **non-blocking** |
| 5 | Stale comment in `organizations.controller.ts` citing the superseded auto-trial rule | **non-blocking** |
| 6 | Two Arabic strings still use bare U+200E marks instead of the isolate helper | **non-blocking** |
| 7 | 13 pre-existing `react-refresh/only-export-components` lint warnings | **pre-existing** |
| 8 | Organisation-level announcements do not exist | **intentionally out of scope** |
| 9 | `platform-control-plane.e2e-spec` — 3 failing (org list pagination, search, audit log) | **pre-existing** |
| 10 | `courses-tenant-isolation` P5-TENANT-008 — flaky concurrent-request test | **pre-existing** |
| 11 | Backend e2e suites interfere through a shared database when all 92 run sequentially | **pre-existing** |

### 15. Classification detail

**1 — Missing document CSP (non-blocking).** Confirmed live: `/` returns no CSP header;
`/api/*` returns a full one. That is backwards — the policy protects JSON nobody
navigates from, and not the document that loads the app. **Not fixed here on purpose:** a
wrong `script-src`/`style-src` breaks the entire SPA, and validating a policy across
every page, the website renderer, embedded fonts and `data:` images is its own pass. It
is a hardening gap, not a live exploit, and shipping an unvalidated policy would have
been worse than leaving it.

**2 — Expired subscription (out of scope).** The only organisation available is on an
active trial ending `09:19Z`; testing the expired path means expiring it. The brief
forbids modifying real billing state, so it was not done. Covered instead by
`subscription-expiration-enforcement.e2e-spec.ts` — 13 cases including cross-tenant
isolation, reads still served, grace period not locked, access restored on reactivation —
**run during this pass, passing**. The frontend never blocks while loading, and
distinguishes never-subscribed from lapsed.

**3 — Payment proof (out of scope).** No payment method is enabled for this organisation,
and enabling one is a platform-owner action against real billing configuration. The flow
was verified up to that boundary; the empty state now explains it.

**4 — Numeral divergence (non-blocking).** See §7. A product decision, not a defect.

**5 — Stale comment (non-blocking).** Documentation only; the code below it correctly
grants no trial.

**6 — U+200E in two Arabic strings (non-blocking).** They render correctly today. Flagged
because an invisible character in a translation file is lost the moment a translator
reflows the sentence, and the diff shows nothing.

**9, 10 and 11 — pre-existing backend e2e failures.** Proven against the pre-pass
baseline by checking `src/` out at `a0971b7` and re-running: `platform-control-plane`
failed **more** there (4) than at HEAD (3), and `courses-tenant-isolation`'s
concurrent-request case fails intermittently at the baseline too.

Item 11 is the common cause and the one worth acting on. Different suites fail between
otherwise identical full runs — `media.e2e-spec` in one, `phase10-6-deletion-and-
provisioning` in the next — and **every one of them passes on its own**. That is 92
suites sharing a database and seeing each other's rows, not product defects. It is
recorded rather than absorbed because a suite that fails depending on what ran before it
cannot be trusted to catch a real regression, which is exactly the risk this pass ran
into and had to bisect around.

**8 — Organisation announcements (out of scope).** Investigated before forming a view.
`AnnouncementAudience` is `platform | academy | course`; the model has `academyId` and
`courseId` but no `organizationId`; `Organization` has eighteen relations and no
announcements; the RLS read policy resolves through `is_academy_member`, never
organisation membership; and a repository-wide search returns nothing. The confusion is
that `announcement.manage` is an *organisation*-level permission while the *audience* is
an academy — which the UI states plainly: "إعلانات تُرسل إلى جميع أعضاء هذه الأكاديمية".
Adding an organisation scope would mean a new enum value, column, RLS policies and
endpoints — the "parallel architecture" the brief forbids.

---

## 16. Final status

**Production verified. QA pass complete.**

Twelve defects found, fixed, tested, deployed, and re-verified against the live site.
The real two-user concurrent editing test was performed across two genuinely separate
authenticated browser sessions, and the evidence is in §3 and §4. The three previously
recorded items were each re-examined and resolved: `expectedVersion` is now required,
the duplicated security headers are gone at the correct layer, and the Arabic numeral
question is split into the bug (fixed) and the product decision (documented).

No test was weakened. The two test files changed were changed because they asserted the
**wrong** thing: one demanded the absolute URL that was the media defect, the other
demanded that a version-less write succeed. Both now pin the corrected contract, and
every new guard was mutation-checked. No lint or typecheck rule was disabled. No
authorization was loosened — the only authorization change made the system stricter. No customer billing
state was modified: the trial re-redemption attempt was refused and left the end date
untouched, the Manager's cancellation attempts were refused before reaching any service,
and reaching checkout created no subscription and no payment. The CMS page used for the
concurrency test was captured beforehand and fully restored.

Every remaining item in §14 is named, classified, and explained — including the two that
could not safely be tested and why.
