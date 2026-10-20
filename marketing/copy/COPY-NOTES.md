# Atlas M1a marketing copy: notes

Files: `src/marketing/content/content.types.ts`, `en.ts`, `ar.ts` (type-check clean; no hits for /free|مجان|premium|USD|\$/i).
Arabic has not been natively reviewed (RV-14 deferred, DL-50). Nothing in the copy says any review happened.

## 1. Positioning used
- **Entity line (identical in about hero lead, start of `llms.summary`, `jsonLd.organizationDescription`, and the first home FAQ answer):**
  - EN: "{brand} is a branded academy platform for Egyptian teachers who sell their lessons online."
  - AR: «{brand} منصة أكاديميات باسم أصحابها، للمدرسين في مصر الذين يبيعون دروسهم أونلاين.»
- **Category statement** (`brand.categoryStatement`, `jsonLd.websiteDescription`): POS D.1, verbatim EN and AR.
- **Hero:** H1 = EN-8 / AR-7 ("Move your paid students from WhatsApp groups to an academy with your name on it"). The subhead names the mechanism: pay by wallet, InstaPay or bank, upload proof, approve once, no commission.
- **Pillar order (the 1a order with pillar 3 removed):** payments, then own name/website, then team and more academies. Supporting modules: assessments, students and reports, Arabic and English.
- **Proof points (product facts only):**
  - six payment methods, named;
  - approve once, then the student is enrolled and emailed; reject with a reason;
  - 0 % commission on manual payments;
  - own subdomain at creation, plus connect your own domain;
  - four designs; the logo sets the palette, with contrast checks; ready-made sections; preview, then publish;
  - pages in Arabic and English;
  - owner, manager and instructor roles; instructors scoped to their courses;
  - more than one academy per account (count from the catalog);
  - five quiz question types; homework with due dates, late policy and feedback; certificates with a public verification page;
  - open, approval or invite registration; student reports; email announcements;
  - two devices, one screen at a time.
- **Honest limits, stated in the same place as the feature:**
  - no app; no card or Fawry checkout; no live classes; no video uploads;
  - approval is manual and owner-only; no WhatsApp or SMS;
  - revenue charts don't include manual payments;
  - the team can't reset devices; no self-service export.
- **Voice:**
  - EN is short and plain. No exclamation marks or em dashes. The only "not X" lines are honest-limit statements.
  - AR uses polite Egyptian colloquial for H1/H2s, FAQ questions and buttons (SPEC A.4) and MSA-leaning Egyptian for leads, bodies and answers. Glossary: «باقة» (market word) for plan, «كورس» for course, «إثبات الدفع», «تسجيل الدخول», «لوحة التحكم», «نطاق فرعي», and «الدومين بتاعك/الخاص بك» (never «نطاق خاص»).

## 2. GEO (coordinator request)
- Section leads are self-contained answers that name {brand} and the subject.
  - EN: 40–60 words.
  - AR: 38–55 orthographic words. Arabic attaches و/ب/ل to the next word, so 38 to 39 Arabic words carry about 50 English words of content.
  - Leads that are short on purpose: the closing bands, the "planned pages" note, and the about hero lead (the definition sentence).
- The home FAQ opens with "What is {brand}?" / «إيه هو {brand}؟». The about story's first paragraph opens with the same definition.
- H2s are questions where that reads naturally: features hub (all), security (all), pricing (trial, paying, limits, honest limits), home (students, languages, how it works, fit, pricing).
- Home S4/S6/S7/S8 keep the spec's statement headlines (EN-2/AR-2, EN-1/AR-1, EN-6/AR-6, S8). Each of those already answers a question in one line.
- `llms.details` (EN, about 210 words) names:
  - Egypt; Arabic and English;
  - all six payment methods; 0 % commission;
  - the YouTube-link disclosure; two devices, one screen;
  - what isn't available yet.
- `ar.llms` carries an Arabic summary/details if the generator wants them.

## 3. Tokens and digits
- No price, currency amount, trial length or limit is written in the copy. All come in through tokens (list in the `content.types.ts` header): `{trialDays}` (EN), `{trialDuration}` (both languages, built from `plurals.days`), `{price}`, `{yearlyPrice}`, `{monthlyEquivalent}`, `{saving}`, `{paidMonthsCount}`, `{students}`, `{academies}`, `{maxStudents}`, `{topPlanName}`, `{planName}`, `{giftedDuration}`, `{date}`, `{year}`.
- **Arabic number agreement.** `plurals.*` has all six `Intl.PluralRules('ar')` forms, for example days: few «{count} أيام», many «{count} يومًا», other «{count} يوم». So 14 gives «١٤ يومًا», 400 gives «٤٠٠ طالب», 20 courses gives «٢٠ كورسًا» and 3 instructors gives «٣ مدرّسين». This fixes SPEC §G C-16.
- **Digits.** AR is `numberLocale: 'ar-EG'`, so the renderer outputs Arabic-Indic digits. The only literal digits in the AR copy are «٤٠٤» on the 404 page. Counts in prose are words («أربعة تصميمات», «خمسة أنواع», «آخر سبعة أيام»).
- **Yearly.** The yearly line is "Pay for {paidMonthsCount}, use all 12" / «ادفع تمن {paidMonthsCount} واستخدم السنة كلها», which needs yearly ÷ monthly to be a whole number. Otherwise use `yearlySaving` ("Save {saving} a year").
- **Brand.** The brand appears only as `{brand}`, so the copy is rename-ready (DL-39). Literal names exist only in `brand.name` and `otherName`.

## 4. What I skipped or changed from the spec, and why
| Item | Decision |
|---|---|
| Home S5 "Protection", watermark/viewer-code lines, trace sentence, "deters and traces", MDS hub title "…and Protection", MDS security description "what the viewer code records" | **Skipped/rewritten** per the DL-50 brief (no watermark, trace or piracy claims). The hub title became "Academy Website, Payments and Teams". The security description became "who on your team sees what". |
| Device cap (two devices, one screen; third device refused; Devices page) | **Kept** as an account fact: S2 fact 3, the students block, and two FAQs. It is Tested (MED-6.x) and SPEC A.11 allows it. Never framed as anti-piracy. **Owner should confirm** this fits the DL-50 intent. |
| YouTube disclosure | Used without the code sentence: "Lessons are YouTube videos played inside your academy. A determined student can still copy the YouTube link itself." Appears in home FAQ, features hub, pricing honest limits, pricing FAQ and security. |
| "Planned" label (SPEC B.1) | Used "Coming soon" / «قريبًا» as briefed. Items carry no href. The `content-protection` slug is labelled "Lessons and devices" / «الدروس والأجهزة» so the menu makes no protection claim. |
| CTA-T | Spec label "Start my academy trial" / «ابدأ تجربة أكاديميتك». The briefed "Start 14-day trial" is `ctas.trialWithDays` ("Start {trialDays}-day trial" / «ابدأ تجربة {trialDuration}»). No literal "14". |
| Limits table rows staff, video storage GB, video minutes, recorded sessions, live sessions add-on | The brief asked for them, but SPEC §C "Forbidden" and PRC §4.4.2 ban them (staff isn't grantable; hosted video and Live are not launched). Labels are in `pricing.withheldLimitLabels` with a "never render" comment. `limitsTable.rows` has only students, academies, instructors, courses, file storage and monthly emails. Suggest a test asserting the withheld labels are absent from the rendered HTML. |
| Support-level row, response times, "every message is read by a person" | Omitted. No public owner commitment yet (C-25, OQ-23). |
| Enterprise "from EGP 15,000" | Omitted (C-13). The `larger` card has no price and no `Offer`, and links to `/contact?topic=sales` without `plan=`. |
| "Recommended" badge | On `growth` only. No "most popular". |
| VAT line | Omitted (RV-05 not done). |
| "Custom domain on every plan" | Not said (CF-28 / C-26). The copy says "connect a domain you already own". `includedInEvery` lists the subdomain, not the custom domain. |
| Demo certificate link (S8) | Omitted (OC-29, no demo academy). |
| Cookie notice | Not written, and no "we use no cookies" claim. The spec has an existing consent dialog, a beacon behind consent, and a suggestion bar that stores preference only with consent. `footer.cookiePreferences` is labelled "render only if a consent dialog exists". |
| Footer identity line / About entity details | Omitted (OC-17). The copyright is "© {year} {brand}". No address, team bios or founder story. |
| Social proof | None anywhere. The About principle "Real proof only" says why. |
| Centres | The brief mentions centres. Copy never uses «السناتر» or centre framing (PMC §7 anti-persona). |
| Contact qualification fields (role, student band, channel, subject) | Not included. The M1a spec keeps 5 fields + optional WhatsApp + two unticked consents. The message hint asks for subject, student count and payment method instead. Consent wording reuses the in-product strings (counsel review RV-02 still pending). |
| Theme toggle | Labels provided as briefed. SPEC IA L305 removes the switcher from the marketing header (C-2 open). |
| Home FAQ count | 9 (spec says 6–8), because "What is {brand}?" was added for GEO. Drop "Can I see how much I've sold?" if 8 is a hard cap. |
| `tenant isolation` / RLS | Banned jargon. The security copy says "separated in the database itself… checked in production" (ORG-5.2, ORG-3.1). |
| "Fawry", "live classes", "app"/«تطبيق», "automatic" | These appear only as honest limits, which SPEC S10, the pricing honest-limits block and the IA L185 disclosure require. A rendered-HTML banned-strings lint needs an allow-list scoped to the honest-limit and FAQ blocks. «لايف» is never used («حصص مباشرة» instead). EN avoids "automatic payment"; the notYet line says "Payments that approve themselves". |

## 5. Claims I was unsure about (owner/engineer should confirm before publish)
1. **Backups:** "We back up the database every day and keep copies of uploaded files" (security, `claim: OPS-08`). The brief asked for it. SPEC A.11 says no backup statement until the owner confirms the schedule wording. Hide it via the claim ID if it isn't confirmed.
2. **Encrypted payment settings:** "Sensitive payment settings are encrypted when we store them." The IA can-say list says "payment credentials encrypted at rest". Confirm this covers the academy's wallet, InstaPay and bank details, or narrow the wording.
3. **HTTPS:** "served over HTTPS only, and we manage the certificates for {brand} subdomains." Based on HSTS in the CSP/header baseline and the in-product domain copy. Connected custom domains are not claimed.
4. **Two-factor authentication:** optional and per person, with an authenticator app (product strings). Never described as enforced. "Requiring 2FA for everyone" and "automatic sign-out" are listed as not yet available.
5. **Platform administrators can see student phone numbers** (B0-CPY-01). Included for honesty on the security page. Owner may want different wording.
6. **Pricing mechanics:**
   - upgrade starts at approval, and the new period follows the current one;
   - yearly upgrades go through support;
   - downgrade means buying in the last 7 days;
   - cancel: a trial ends at once; a paid plan runs to the end of its period;
   - limit warnings when close, then "new students can't join" at the limit.

   These come from PRC §4.2.7 and the in-product notifications. The cancellation and refund wording still needs RV-03. "Refunds follow our Terms of Service" makes no promise.
7. **"Activation is not instant"** and "pay a few days before the trial ends". These avoid any SLA (CF-20).
8. **Dashboard in Arabic/English, light/dark.** Based on the app's i18n and its `.dark` tokens. Academy sites are described as having Arabic and English pages, with no Arabic-only implication.
9. **Manager capabilities:** kept vague ("helps you run the academy day to day"; can see students' contact details). There is no "add students" or role-change wording.
10. **Student limit scope** (shared across academies on multi-academy plans). Not stated anywhere. Add it to the pricing FAQ once confirmed.

## 6. For the component author
- `href` values are language-neutral. Prefix `/ar` on AR pages, except app paths (`/auth/*`, `/dashboard`). Append `?plan=<key>&lang=ar` plus UTM to `/auth/register`.
- `claim` fields map to `content/claims.yaml`. Hide an item when its gate is closed.
- `chrome.languageSwitch.suggestion` is written in the TARGET language (Arabic inside `en.ts`, English inside `ar.ts`) by design.
- FAQ `answer` text is meant to go verbatim into the `FAQPage` JSON-LD.
- SEO lengths after token fill (Atlas, 14) are all within limits. Longest EN title: security, 60. Longest EN description: hub, 147. AR descriptions: 133 or less.
