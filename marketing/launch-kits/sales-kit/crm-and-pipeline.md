# CRM and pipeline

> PREPARED ONLY. No CRM tool is set up and no record is created by this kit. Recommended setup (lead-gen §10): **one shared spreadsheet + WhatsApp Business labels** until volume justifies a tool. Access: the owner and people the owner names. It holds personal data, so it belongs in the privacy policy's processing description and needs a retention rule [LEGAL].
> All response times below are **[owner to confirm]**. Nothing here is a public promise.

## 1. Pipeline stages
| # | Stage | Enters when | Exits when | WhatsApp label |
|---|---|---|---|---|
| 1 | **New** | A lead arrives from any source (§3) | First reply sent | New |
| 2 | **Contacted** | First reply sent (W1 / CF1) | They answer discovery questions, or 3 follow-ups go unanswered → Not now | Contacted |
| 3 | **Qualified** | Fit confirmed, no knock-out, score ≥ 45 (`discovery-and-qualification.md` §2) | Demo booked, or trial started without a demo | Qualified |
| 4 | **Demo booked** | Date agreed | Demo held or no-show (reschedule once) | Demo booked |
| 5 | **Demo held** | Demo done; recap sent (W4) | Trial started, or decision to wait | Demo held |
| 6 | **Trial** | Trial started (self-serve or after a demo) | Activated, paid, or trial ended | Trial |
| 7 | **Activated** | Website published **and** at least one course with a YouTube lesson **and** at least one student enrolled through an approved payment or an invitation (GTM §10.1) | First Atlas plan payment approved | Activated |
| 8 | **Paying** | First Atlas plan payment approved by the Atlas team | Cancels or doesn't renew → Not now | Paying |
| 9 | **Not now** | Silence after the sequence, or "later"; set a **recycle date** (e.g. two weeks before the next term) | Re-engaged on the recycle date (one message) | Not now |
| 10 | **Not a fit** | A knock-out K1–K10 | Only if the missing piece ships and the owner approves telling them | Not a fit |

**Flag on any stage:** `opted-out` (stop every message on every channel at once; keep the row with the opt-out date as evidence).

## 2. Lead fields (Leads tab)
| Field | Type / values | Notes |
|---|---|---|
| lead_id | L-0001… | |
| created_at | date | |
| name | text | As given; never a student's name |
| role | teacher · assistant · team-owner · partner · other | |
| subject / stage taught | text | e.g. physics 3rd secondary |
| governorate | list | Optional |
| source_channel | facebook · instagram · tiktok · youtube · whatsapp · linkedin · email · contact-form · trial-signup · referral · qr · other | Matches the UTM source list + forms |
| source_detail | text | WhatsApp code (`FB-P05`), `utm_campaign` + `utm_content`, referrer, or Q18 answer |
| first_contact_channel | whatsapp · email · social-dm · call | |
| consent_whatsapp | yes/no + date + wording | Needed before any WhatsApp follow-up we start |
| consent_marketing | yes/no + date + wording | Needed before any marketing email (OD-13) |
| paying_students_now / peak | number / number | From Q4 |
| courses_running | number | Q6 |
| instructors_needed | number | Q11 |
| academies_needed | number | Q12 |
| payment_methods | multi: vodafone-cash · orange-cash · etisalat-cash · we-pay · instapay · bank · cash · card-required | Q7 |
| knock_out | none · K1…K10 | |
| score / tier | 0–100 / hot · warm · cold | |
| plan_fit | teacher · academy · organization · larger | From discovery §3 |
| stage | §1 | |
| next_step + next_date | text + date | Every open lead has one |
| owner_notes | text | No student data |
| lost_reason | price · app · card · live · parents-messaging · guarantee · assistant-approval · coupons · timing · no-reply · other | For win/loss review |
| closed_at | date | |

Other tabs: **Interactions** (lead_id, date, channel, summary, objection numbers, next step) · **Consent & opt-out log** · **UTM register** (from `../INDEX.md` §3) · **WhatsApp code register** · **Approval log** (social assets) · **Weekly review**.

## 3. Hand-offs: where leads come from and what happens first
| Source | Where it shows up | First action | Sequence |
|---|---|---|---|
| **Contact form, `topic=sales`** | Platform Owner contact submissions inbox (`/dashboard/platform/contact-submissions`) + the email/in-app notification | Copy into Leads (source `contact-form`, consent fields as submitted); reply by email (CF1); WhatsApp only if they gave a number for that and ticked contact consent | S3 |
| **Self-serve trial signup** | Platform Owner organisations console (plan, trial status, onboarding status) | Add to Leads (source `trial-signup`); stage Trial; email T0 unless the product's welcome already covers it; check onboarding status on days 1, 3, 5 | S4 (+ S5 only if they opted in to WhatsApp) |
| **WhatsApp chat** (from posts, statuses, QR, referrals) | WhatsApp Business | Label New; reply W1; record the pre-filled source code | S1 |
| **Social comment or DM** | Facebook / Instagram / TikTok inbox | Public answer from the reply templates, then the DM hand-off line to WhatsApp | S1 once on WhatsApp |
| **LinkedIn message** (teams, Organization) | Founder's LinkedIn | Reply; move to email or WhatsApp; flag `academies_needed` | Discovery call, then 30-min demo |
| **Referral** | WhatsApp introduction | Thank the referrer (RF3); W1 to the new lead with their permission | S1 |
| **Larger than Organization** | Any of the above | Owner handles personally | Sales-led |

**Assist triggers on trials (GTM §11):** no academy at 24 h; website not published by day 3; more than 400 students declared; any Organization trial; any reply to any message. Everything else stays self-serve.

## 4. Follow-up SLAs [owner to confirm]
Internal targets only. The owner confirms each line he can keep (OQ-23: "publish only what can be kept"). No public wording promises any of these.
| Trigger | Proposed internal target (lead-gen §5.1) | Confirmed by owner |
|---|---|---|
| Inbound WhatsApp message | First reply within 2 business hours, during posted hours | [owner to confirm] |
| Contact form `topic=sales` | Same business day | [owner to confirm] |
| New trial signup | Welcome within 1 business day (email) | [owner to confirm] |
| Demo request | Two slots offered within 4 business hours; demo within 3 business days | [owner to confirm] |
| After a demo | Recap within 24 hours | [owner to confirm] |
| Atlas plan payment proof (subscription activation) | Daily check of the proof queue (there is no alert for new proofs) | [owner to confirm] |
| Support question from a customer | Daily check | [owner to confirm] |
| Opt-out request | Immediately, every channel | Required (not optional) |
| Posted business hours | [owner to set] | [owner to confirm] |

## 5. Weekly pipeline review (30 minutes)
1. Count per stage; conversions New → Qualified → Trial → Activated → Paying (counts, with n; no percentages on tiny numbers).
2. Every open lead has a next step and a date. Fix the ones that don't.
3. Leads in Trial without activation by day 7: who gets a TA2 or a call?
4. Lost reasons this week; any reason appearing 3+ times goes to the owner as a product or messaging question.
5. Sources: which post IDs or codes produced qualified chats (feeds `../social-kit/strategy.md` §10).
6. Opt-outs and complaints: anything to change in the templates?

## 6. Data rules
- No student data in the sheet. No screenshots of receipts or chats.
- Delete or anonymise cold leads after a retention period set by counsel [LEGAL] (lead-gen suggests 12 months without contact).
- Restrict sharing to named people; never export the sheet to third-party tools without the owner's approval and a privacy-policy update.
- Record consent wording and date exactly as given.
