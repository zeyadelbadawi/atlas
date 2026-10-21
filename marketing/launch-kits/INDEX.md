# Atlas (أطلس) launch kits: index and shared reference

**Status:** PREPARED ONLY. Owner instruction: "prepare only, NOTHING is published or scheduled before launch".
Nothing in these folders has been posted, scheduled, sent, uploaded or bought. No account was created and nobody was contacted.
**Compiled:** 20 Oct 2026. **Language review:** Arabic copy is NOT natively reviewed (RV-14 / B0-OC-32 is in B4). No legal, Arabic or trademark review has happened.
**Brand:** "Atlas / أطلس" is a working name (DL-39). Every file uses the literal name; a rename means a find-and-replace across both kits.

---

## 1. What is in the kits

### A. Social media marketing kit (`social-kit/`)
| File | What it holds | Count |
|---|---|---|
| `00-README.md` | No-publishing rule, approval workflow, launch-day checklist, gates | — |
| `strategy.md` | Goals per platform, personas, pillars, voice guide (do/don't words), hashtags, cadence, community rules and reply templates, crisis playbook, KPIs | 5 personas, 5 pillars, 16 reply templates, 9 crisis scenarios |
| `launch-calendar.md` | D-7 teaser (held) → launch week day by day → D+28, with platform, format, pillar, post ID, CTA, UTM | 5 phases, every asset slotted |
| `posts-facebook-instagram.md` | Ready Facebook/Instagram posts in Egyptian Arabic | 33 posts (12 carousels, 21 single-image) |
| `reels-tiktok-shorts.md` | Short-video scripts 15–45 s | 14 scripts |
| `whatsapp-and-groups.md` | WhatsApp Status series, opt-in broadcasts, teacher-group posts, reply templates | 10 statuses, 5 broadcasts, 6 group posts, 14 replies |
| `linkedin.md` | Posts for academy teams and organisations (EN + MSA-light AR) | 6 posts |
| `ad-variants.md` | LATER paid use only, NOT TO RUN: Meta variants, TikTok hooks, Egypt targeting notes | 4 angles × 3 = 12 Meta variants, 12 TikTok hooks |
| `visual-briefs.md` | Sizes, type, colour, logo safe zones, RTL rules, screenshot framing with «محتوى تجريبي» | 9 templates |

### B. Sales kit (`sales-kit/`)
| File | What it holds | Count |
|---|---|---|
| `00-README.md` | How to use the kit, who uses which file, gates | — |
| `one-pager-ar.md` / `one-pager-en.md` | Print-ready one-pager copy with layout notes | 2 |
| `sales-deck.md` | 15-slide Arabic deck with speaker notes + English outline | 15 slides |
| `demo-script.md` | 15-minute and 30-minute demo scripts on a fictional demo academy | 2 scripts |
| `discovery-and-qualification.md` | Discovery call, fit / not-yet-fit rules, score, plan routing | 18 questions |
| `objection-handling.md` | Quick-reference table + detailed answers | 25 objections |
| `outreach-sequences.md` | DO NOT SEND BEFORE LAUNCH: WhatsApp warm + follow-ups, contact-form emails, trial emails (day 0/2/7/12), referral ask | 6 sequences, 24 messages |
| `pricing-faq-and-calculator.md` | How to explain plans, 10-for-12 math, 3 scenarios, worksheet | 12 FAQs, 3 scenarios |
| `battle-card.md` | Status quo and generic course platforms (no names); where we win and lose | 3 cards |
| `crm-and-pipeline.md` | Stages, lead fields, hand-offs, SLAs marked [owner to confirm] | 10 stages |

### C. Top level
- `INDEX.md` (this file): shared links, UTM register, claim IDs, disclosures, screenshot names.
- `COMPLIANCE-CHECK.md`: banned-string grep across every kit file, each hit justified or fixed, and every claim used with its claims-register line.

---

## 2. Links (CTA targets, SPEC B.3)

| CTA | Label AR / EN | URL (add UTM per §3) |
|---|---|---|
| Site (AR) | «شوف أطلس» / "See Atlas" | `https://atlass.dpdns.org/ar` |
| Site (EN) | "See Atlas" | `https://atlass.dpdns.org/` |
| Pricing | «شوف الأسعار» / "See pricing" | `https://atlass.dpdns.org/ar/pricing` · `https://atlass.dpdns.org/pricing` |
| CTA-T trial | «ابدأ تجربة أكاديميتك» / "Start my academy trial" | `https://dashboard.atlass.dpdns.org/auth/register?plan=<key>&lang=ar` (EN: `&lang=en`). The app (sign-up, sign-in, dashboards) is on `dashboard.atlass.dpdns.org` since DL-63; the apex keeps the marketing pages |
| CTA-C set it up with us | «جهّزها معانا» / "Set it up with us" | `https://atlass.dpdns.org/ar/contact?topic=sales` · EN `https://atlass.dpdns.org/contact?topic=sales` |
| WhatsApp click-to-chat | «كلّمنا على واتساب» | `https://wa.me/[WA-NUMBER]?text=<pre-filled text with source code>` · number pending owner (OC-26/OC-30) |

**Plan keys** (SPEC B.3; read again from `GET /public/plans` on launch day, never trust this table blindly):
| Plan EN / AR | Key | Use in `?plan=` |
|---|---|---|
| Teacher / المعلّم | `starter` | `plan=starter` |
| Academy / الأكاديمية | `growth` | `plan=growth` |
| Organization / المؤسسة | `enterprise` | `plan=enterprise` (the key name is a known cosmetic mismatch) |
| Larger than Organization | none | contact link only, never `plan=` |

**Default trial plan in social CTAs:** no `plan=` (the register page lets the teacher choose). Use `plan=` only in posts about one plan.

**Attribution reality (AMP §6, SPEC B.3):** UTMs on the landing URL are passed to register/contact links in memory only. Storage-side attribution (B0-ANL-04) is in B4, so signups may not record the source yet. Until it ships, also rely on the source code in each pre-filled WhatsApp text (e.g. `[FB-07]`) and on the self-reported "how did you hear about us" question in discovery.

---

## 3. UTM register for these kits (closed list, lowercase, hyphens only)

Rules (AMP §6.3): lowercase; hyphens only; no spaces, underscores or Arabic in values; never names or phone numbers; **every value below is added to the UTM register tab in the CRM sheet before any link is posted**; no third-party link shorteners. Internal links never carry UTMs.

### 3.1 Allowed values
| Parameter | Closed list |
|---|---|
| `utm_source` | `facebook` · `instagram` · `tiktok` · `youtube` · `whatsapp` · `linkedin` · `email` · `qr` |
| `utm_medium` | `social` (own post) · `group` (post in someone else's group, with admin consent) · `bio` (profile link) · `video` (video description / pinned comment) · `whatsapp-status` · `whatsapp-chat` (1:1 reply) · `whatsapp-broadcast` (**new value**: add to the AMP register before first use) · `email` · `paid-social` (later, ads only) · `offline` (printed one-pager QR) · `referral` |
| `utm_campaign` | `{yyyy-mm}-launch-teaser` · `{yyyy-mm}-launch-week` · `{yyyy-mm}-launch-month` · `{yyyy-mm}-sales-followup` · `{yyyy-mm}-trial-onboarding` · `{yyyy-mm}-referral` · `evergreen-honest-fit` · `{yyyy-mm}-paid-test` (later only, if OD-16 approves ads). Replace `{yyyy-mm}` with the launch month (e.g. `2027-02-launch-week`) when the owner sets the date |
| `utm_content` | The asset ID in lowercase: `p01`…`p33` (FB/IG posts), `r01`…`r14` (reels), `ws01`…`ws10` (status), `wb01`…`wb05` (broadcast), `g01`…`g06` (group posts), `l01`…`l06` (LinkedIn), `bio`, `one-pager`, `deck`, `em-t00`…`em-t12` (emails), `ad-a1`…`ad-d3` (ads, later) |
| `utm_term` | not used (paid search only) |

### 3.2 Per channel
| Channel | `utm_source` | `utm_medium` | Example |
|---|---|---|---|
| Facebook Page post (link in first comment) | `facebook` | `social` | `https://atlass.dpdns.org/ar?utm_source=facebook&utm_medium=social&utm_campaign=2027-02-launch-week&utm_content=p04` |
| Instagram (link in bio; Stories link sticker) | `instagram` | `bio` (bio) / `social` (Story sticker) | `…/ar?utm_source=instagram&utm_medium=bio&utm_campaign=2027-02-launch-month&utm_content=bio` |
| TikTok (link in bio) | `tiktok` | `bio` | `…/ar?utm_source=tiktok&utm_medium=bio&utm_campaign=2027-02-launch-month&utm_content=bio` |
| YouTube Shorts (description / pinned comment) | `youtube` | `video` | `…/ar?utm_source=youtube&utm_medium=video&utm_campaign=2027-02-launch-week&utm_content=r01` |
| WhatsApp Status (link in status text) | `whatsapp` | `whatsapp-status` | `…/ar/pricing?utm_source=whatsapp&utm_medium=whatsapp-status&utm_campaign=2027-02-launch-week&utm_content=ws04` |
| WhatsApp 1:1 reply | `whatsapp` | `whatsapp-chat` | `https://dashboard.atlass.dpdns.org/auth/register?lang=ar&utm_source=whatsapp&utm_medium=whatsapp-chat&utm_campaign=2027-02-sales-followup&utm_content=wr03` |
| WhatsApp broadcast (opt-in list only) | `whatsapp` | `whatsapp-broadcast` | `…/ar?utm_source=whatsapp&utm_medium=whatsapp-broadcast&utm_campaign=2027-02-launch-week&utm_content=wb01` |
| Facebook teacher group (only where the admin allows links) | `facebook` | `group` | `…/ar?utm_source=facebook&utm_medium=group&utm_campaign=evergreen-honest-fit&utm_content=g02` |
| LinkedIn | `linkedin` | `social` | `…/?utm_source=linkedin&utm_medium=social&utm_campaign=2027-02-launch-month&utm_content=l01` |
| Email (contact-form reply, trial emails) | `email` | `email` | `…/ar/pricing?utm_source=email&utm_medium=email&utm_campaign=2027-02-trial-onboarding&utm_content=em-t07` |
| Printed one-pager QR | `qr` | `offline` | `…/ar?utm_source=qr&utm_medium=offline&utm_campaign=evergreen-honest-fit&utm_content=one-pager` |
| Paid Meta (LATER ONLY) | `facebook` / `instagram` | `paid-social` | not to be built before launch and owner approval |

### 3.3 Pre-filled WhatsApp source codes
Each post that offers WhatsApp uses: `https://wa.me/[WA-NUMBER]?text=` + URL-encoded «أهلًا، عايز أعرف أكتر عن أطلس [CODE]», where CODE is `FB-P07`, `IG-P07`, `TT-R03`, `YT-R03`, `WS-04`, `G-02`, `LI-03`, `QR-1P`. Log the code in the CRM "source detail" field (crm-and-pipeline.md).

---

## 4. Claims register used by the kits (IDs used in every asset)

Every asset lists the claim IDs it relies on. Only these claims may appear. Source column = SPEC A.11 row (or the approved live site copy in `src/marketing/content/ar.ts` / `en.ts`) plus feature IDs.

| ID | Claim (what we may say) | Register line / source | Watch-outs |
|---|---|---|---|
| CL-01 | Each academy gets its own Atlas subdomain the moment it is created | A.11 row 1 "May say" (ACD-6.2 prod-verified) | — |
| CL-02 | You can connect a domain you already own | A.11 row 2 "May say generically" (ACD-6.3) | Never "on every plan"; no custom-domain screenshot (SS-020 withheld, CF-28) |
| CL-03 | Four designs; your logo sets the colours (with a contrast check) | A.11 row 1 (WEB-2.1, ACD-5) | — |
| CL-04 | Pages in Arabic and English; ready-made sections; preview on phone and computer; publish when ready | A.11 row 1 (WEB-6.7, WEB-1.3.1, WEB-1.4) | Never "Arabic-first" / «عربي بالكامل» |
| CL-05 | Students pay by Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, InstaPay or bank transfer | A.11 row 3 "May say" (COM-2; OC-09 done, DL-48) | Methods the teacher adds; one per type per academy |
| CL-06 | Student uploads the proof; you approve once; the student is enrolled and emailed; reject with a reason and the student can pay again | A.11 row 3 (COM-1.5, COM-3.1, COM-3.2) | Always pair with D-2 in long-form; never "automatic/instant" |
| CL-07 | Money goes straight to you; Atlas takes 0 % commission on these payments; you pay only for your plan | A.11 row 3 (COM-2) | "On these payments" scope stays |
| CL-08 | Only the account owner approves payments | A.11 row 3 "Say 'you approve' (owner-only)" (COM-2.0) | Never "your team approves" |
| CL-09 | Each student account works on two devices, one screen at a time; a third device is refused; the student removes an old device from the Devices page | A.11 row 4 "May say" (MED-6.1–6.3) | Account rule only, never framed as anti-piracy; the team cannot reset devices; no device screenshots (SS-013/014 gated) |
| CL-10 | Roles: owner, manager, instructor; instructors see and grade only the courses assigned to them | A.11 row 7 (ORG-2.2, ORG-2.3, LRN-10) | Never admin/staff; managers cannot add students |
| CL-11 | Several academies in one account, as the plan allows (Teacher 1, Academy 1, Organization 5) | A.11 row 7 "counts from the catalog" (ACD-8, ORG-4.2) | Re-read counts from the catalog at launch |
| CL-12 | Quizzes with five question types, manual grading where an answer needs a person | A.11 row 8 (LRN-7.1, LRN-7.4) | No integrity / anti-cheating wording |
| CL-13 | Homework with due dates, a late policy and written feedback | A.11 row 8 (LRN-9) | No rubric claims |
| CL-14 | Certificates on course completion; anyone can check one on a public verification page | A.11 row 8 (LRN-11, LRN-11.5) | Demo cert depends on OC-29 |
| CL-15 | Lessons are YouTube videos played inside your academy; unlisted videos work | Live site copy (LRN-3.2) + A.12 | **Always with D-1** |
| CL-16 | Sign-up open, with your approval, or by invitation; student reports (enrolments, progress, students falling behind); email announcements with a monthly allowance per academy | Live site copy, home "students" block (ORG-3.2, ANL-2, MSG-9) | Email allowance number comes from the catalog |
| CL-17 | Every order and payment sits in one list with its proof and status; revenue charts do not include manual payments yet | Live site copy, FAQ (COM-3.0, COM-4.1) | Never "revenue dashboard" |
| CL-18 | Each academy's students and courses are separated in the database, checked in production; a student account in one academy does not appear in another; an email code on sign-in from a new device | A.11 row 9 `/security` list, subject to RV-13 (ORG-5.2, ORG-3.1, IAM-4.1) | No "RLS", "tenant isolation", no certifications |
| CL-19 | Plans in EGP: Teacher 1,190/month or 11,900/year; Academy 2,790 or 27,900; Organization 7,490 or 74,900 | Catalog verified 19 Oct (B0-OC-27, CAT-02); 05-pricing | **Every price carries "[check live price at launch]"** |
| CL-20 | 14-day trial with the plan's full limits; no card needed; one trial per customer | CAT-05 verified; live copy (BIL-5) | Never "free"; say «تجربة ١٤ يوم من غير كارت» |
| CL-21 | Yearly: pay for 10 months, use 12 | A.10 replacement wording (REC R-03) | Saving amounts derived from CL-19 |
| CL-22 | You pay for your Atlas plan by InstaPay, wallet or bank transfer and upload the proof; a person on the Atlas team checks it and activates the plan, so activation takes review time | Live pricing copy ("How do I pay for Atlas?") | No promised review time |
| CL-23 | At a plan limit nothing is deleted; new students and courses wait until you upgrade; upgrade any time; move down in the last 7 days of a period; cancelling keeps the paid period | Live pricing copy ("changes" block) | — |
| CL-24 | The Atlas dashboard works in Arabic and English, light or dark | Live site copy, home "languages" block | — |
| CL-25 | "Set it up with us": the Atlas team replies by email and sets the academy up with you step by step | Live site copy, home "assisted" block (CTA-C) | No response-time promise (C-25, OQ-23) |

### Never claimed (owner brief + SPEC A.10/A.11)
Viewer code / watermark / tracing / anti-piracy; "can't be recorded" or any 100 % wording; hosted video upload; a mobile app (only "no app yet"); live classes (only "not available"); card, Fawry or automatic payment (only "not available"); WhatsApp or SMS features for students or parents; testimonials, ratings, reviews, logos, case studies, customer or student counts, invented statistics; competitor names; the Arabic word for tutoring centres; "most popular"; "in minutes"/"in a day"; best/#1/leading; "free" in any language; "on every plan" for custom domains; response-time promises; founding/design-partner offers (not in B1).

---

## 5. Required disclosures (verbatim; SPEC A.12 as adapted in the live copy)
| ID | Arabic | English | When |
|---|---|---|---|
| D-1 YouTube honesty line | «الدروس فيديوهات يوتيوب بتتعرض جوه أكاديميتك، والطالب اللي مصمم يقدر ينسخ لينك يوتيوب نفسه.» | "Lessons are YouTube videos played inside your academy. A determined student can still copy the YouTube link itself." | Every time lessons, videos or YouTube come up |
| D-2 Payments honest limit | «الموافقة يدوية، وبيعملها صاحب الحساب. مفيش دفع بالكارت أو عن طريق فوري دلوقتي.» | "Approval is manual and done by the account owner. There is no card or Fawry checkout today." | Every long-form explanation of payments (carousels, scripts, deck, one-pager, demo, emails) |
| D-3 Demo label | «محتوى تجريبي» | "Demo content" | On every screenshot and every screen recording, on the image itself and in the caption |

---

## 6. Screenshots (SPEC D.2) — real captures in `assets/screenshots/` (20 Oct 2026)
Use the tag `[SS-nnn: slug]`. Every use shows «محتوى تجريبي». Only these IDs are publishable; release still needs AG-5 (checklist + owner spot-check).

| Tag | Screen | Language / device | Status |
|---|---|---|---|
| `[SS-001: academy-home-modern-ar-light]` | Demo academy home, modern-education design | AR · desktop / mobile | ✅ `academy-site-home-{ar,en}-light.webp` + mobile `academy-site-home-mobile-{ar,en}-light.webp` |
| `[SS-002: academy-home-atelier-ar-light]` | Atelier design home | AR · desktop / mobile | ⏳ not captured yet (text-only fallback) |
| `[SS-003: academy-home-manara-ar]` | Manara design home | AR · desktop / mobile | ⏳ not captured yet (text-only fallback) |
| `[SS-004: academy-home-riwaq-ar-light]` | Riwaq design home | AR · desktop / mobile | ⏳ not captured yet (text-only fallback) |
| `[SS-006: checkout-method-ar-mobile]` | Student picks InstaPay / Vodafone Cash, demo details | AR · mobile | ⏳ not captured yet (text-only fallback) |
| `[SS-007: proof-upload-review-ar-mobile]` | Demo receipt uploaded, "under review" | AR · mobile | ⏳ not captured yet (text-only fallback) |
| `[SS-008: payments-review-ar-light]` | Owner payment review sheet: proof, amount, Approve / Reject | AR · desktop | ✅ `payments-review-{ar,en}-light.webp` + proof panel `payments-review-proof-{ar,en}-light.webp` |
| `[SS-009: learner-payments-ar-mobile]` | Student's payments: one approved, one rejected with a reason | AR · mobile | ⏳ not captured yet (text-only fallback) |
| `[SS-018: page-editor-ar-light]` | Website page editor with device preview | AR · desktop | ✅ `website-editor-{ar,en}-light.webp` |
| `[SS-019: brand-studio-palette-ar-light]` | Palette built from a demo logo, with contrast checks | AR · desktop | ⏳ not captured yet (text-only fallback) |
| `[SS-021: add-instructor-dialog-ar-light]` | Invite dialog showing manager and instructor only | AR · desktop | ⏳ not captured yet (text-only fallback) |
| `[SS-022: academy-switcher-ar-light]` | Academy switcher with demo academies | AR · desktop | ⏳ not captured yet (text-only fallback) |
| `[SS-024: quiz-builder-types-ar-light]` | Quiz builder question-type selector | AR · desktop | ✅ `quiz-builder-{ar,en}-light.webp` |
| `[SS-025: assignment-grading-ar-light]` | Graded homework with feedback | AR · desktop | ⏳ not captured yet (text-only fallback) |
| `[SS-026: certificate-verify-ar-mobile]` | Public certificate verification page (demo) | AR · desktop / mobile | ⏳ not captured yet (text-only fallback) |
| `[SS-027: onboarding-theme-picker-ar-light]` | Design picker during setup | AR · desktop / mobile | ⏳ not captured yet (text-only fallback) |


**Extra real captures (no SS ID; use where the post's topic matches, always with «محتوى تجريبي»):**
| File | Screen | Good for |
|---|---|---|
| `course-builder-{ar,en}-light.webp` | Course curriculum editor (sections, YouTube lessons, quiz) | "Add your courses" / how-it-works posts and reels |
| `payment-methods-{ar,en}-light.webp` | Academy payment methods (bank transfer, InstaPay, Vodafone Cash, demo details) | Payments pillar: "you choose the methods" |
| `students-list-{ar,en}-light.webp` | Members / students list | Students & team posts |
| `academy-site-course-{ar,en}-light.webp` | Public course page with EGP price | "Your course page under your name" |

Not used on purpose: dashboard overview (revenue widget, SPEC A.10), learner lesson player (text lesson in frame), reports, sign-up screen.

**Design names** in the slugs (modern-education, atelier, manara, riwaq) are internal. Public copy says «٤ تصميمات» and never names a design (one name matches a competitor profile).
**Never use:** SS-011…017 (player overlay, devices, protection report: gated OC-10), SS-020 (custom domain: no live domain verified), any frame with text lessons, upload UI, live sessions, blog, Google sign-in button, integrity UI, revenue charts, admin/staff roles, real people, testimonials or counts. English captures (`…-en-…`) exist in the same set for LinkedIn and the EN one-pager.

---

## 7. Open decisions for the owner (collected from both kits)
| # | Decision | Where it bites |
|---|---|---|
| OD-01 | Launch date (sets D0 and every `{yyyy-mm}`) and the go-ahead for the held teaser phase (D-7) | launch-calendar, UTMs |
| OD-02 | RV-08 (name + logo public use, social avatars included) cleared or re-opened from B4 | everything public |
| OD-03 | Who creates the social profiles, with which handle (`atlas_edu` recorded under OC-30) and display name | social README |
| OD-04 | WhatsApp Business number, who answers, posted hours | every WhatsApp CTA, SLAs |
| OD-05 | Native Arabic reviewer, or a recorded waiver for RV-14 | every AR string |
| OD-06 | Face on camera (founder) or voice-over only for reels | reels |
| OD-07 | Response times you can keep (internal targets in OQ-23 are not public) | crm-and-pipeline, reply templates |
| OD-08 | Demo academy identity and subdomain (OC-29); fictional name used here | demo-script, screenshots, `/verify` link |
| OD-09 | How to talk about the on-screen code in the lesson player during live demos (no claim is approved) | demo-script |
| OD-10 | Whether the device rule (2 devices / 1 screen) is shown in social posts (COPY-NOTES flags it for owner confirmation) | P26, R-scripts, objections |
| OD-11 | Manual data export on request ("what if I leave?") | objection-handling |
| OD-12 | Referral incentive (none promised in the kit) | outreach-sequences |
| OD-13 | Contact-form marketing consent: no marketing emails to contact leads without the unticked marketing box (SUP-04 not verified) | outreach-sequences |
| OD-14 | Register page may still say "free trial" (B0-CPY-24 in B4, SPEC C-9): fix before any CTA-T link goes out | launch-day checklist |
| OD-15 | Whether managers count against the instructor limit (affects scenario 2) | pricing-faq-and-calculator |
| OD-16 | Paid ads at all, budget, Meta pixel (none in B1; consent and counsel first) | ad-variants |
| OD-17 | Enterprise / larger-than-Organization: price shown or "talk to us" only (C-13) | pricing, deck |
| OD-18 | Contact details for print: [owner contact — pending OC-17] | one-pagers, deck |
