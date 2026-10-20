# Atlas social media marketing kit: README

> **NO PUBLISHING BEFORE LAUNCH.** Owner instruction: "prepare only, NOTHING is published or scheduled before launch."
> Nothing in this folder may be posted, scheduled in any tool, boosted, sent to a group, or shown publicly until (1) the owner gives the launch go-ahead in writing and (2) the owner approves that specific post. This includes the teaser posts. Drafts in a scheduling tool count as "scheduled": do not load them before launch.

## 1. What's inside
| File | Use it for |
|---|---|
| `strategy.md` | Why each platform, who we talk to, the five pillars, voice rules in Egyptian Arabic, hashtags, cadence, how to answer comments, what to do when something goes wrong, what to measure |
| `launch-calendar.md` | The day-by-day plan from D-7 (teaser, held) to D+28, with the post ID, CTA and UTM for every slot |
| `posts-facebook-instagram.md` | 33 ready posts (P01–P33): hook, body, CTA, hashtags, visual brief, alt text, claim IDs |
| `reels-tiktok-shorts.md` | 14 short-video scripts (R01–R14) for TikTok, Instagram/Facebook Reels and YouTube Shorts |
| `whatsapp-and-groups.md` | WhatsApp Status series, broadcast messages (opt-in only), teacher-group posts, reply templates |
| `linkedin.md` | 6 posts for academy teams and organisations |
| `ad-variants.md` | Paid copy for LATER. **Not to run before launch and owner approval** |
| `visual-briefs.md` | Templates, sizes, fonts, colours, logo rules, RTL rules, screenshot framing |
| `../INDEX.md` | Links, UTM register, claim IDs (CL-xx), disclosures (D-1/D-2/D-3), screenshot tags |
| `../COMPLIANCE-CHECK.md` | Banned-string grep results and the claims used |

## 2. Rules that apply to every asset
1. **Facts only from the claims list** (INDEX §4). Every post names its claim IDs. If a fact isn't there, it isn't posted.
2. **Disclosures:** D-1 (YouTube honesty line) whenever lessons or videos come up; D-2 (manual approval, no card or Fawry) in every long-form payments explanation; D-3 «محتوى تجريبي» on every screenshot and screen recording.
3. **Prices** appear only with "[check live price at launch]" in this master file. On launch day the owner checks `https://atlass.dpdns.org/ar/pricing` and removes the tag from the published copy only if the number still matches.
4. **No social proof of any kind** until real, consented evidence exists: no reviews, ratings, quotes from teachers, logos, case studies, customer or student counts.
5. **No student data**: no real names, faces, phone numbers, chats, receipts. Demo academy and demo accounts only.
6. **One CTA per post.** Links go in the first comment on Facebook (links in the body cut reach), in the bio on Instagram/TikTok, in the description or pinned comment on YouTube.
7. **Arabic is not natively reviewed** (RV-14). Each AR post carries "Pending: not reviewed" in the approval log until a reviewer signs, or the owner records a waiver.

## 3. Approval workflow (owner approves each post before it goes live)
| Step | Who | What | Output |
|---|---|---|---|
| 1. Draft | Claude (done) | Post written from claims list, with claim IDs, UTM, visual brief | This kit |
| 2. Visual | Designer / owner | Build the image or video from `visual-briefs.md`; screenshots only from released captures with «محتوى تجريبي» | File named `{postID}_v{n}_{ar}.png` / `.mp4` |
| 3. Arabic review | Native reviewer (OD-05) | Tone, Egyptian wording, typos, digits; no new claims added | Reviewer initials + date |
| 4. Fact check | Owner | Claim IDs still true in the live product; price and trial checked on the live pricing page; links open (200) with the right UTM | Tick in the log |
| 5. Approval | **Owner only** | Approves the exact text + visual + link. Any edit after approval sends it back to step 3 | "Approved" + date in the log |
| 6. Publish | Owner (or a named person the owner authorises in writing) | Publish manually or load into a scheduler **only after launch go-ahead** | Live URL in the log |
| 7. First hour | Whoever publishes | Reply to comments with `strategy.md` §7 templates | — |

**Approval log** (copy into the CRM sheet, one row per asset):
| Post ID | Version | Platform(s) | AR review (name, date) | Fact check (date) | Approved by owner (date) | Published by | Date / time | Live URL | Notes |
|---|---|---|---|---|---|---|---|---|---|
| P04 | v1 | FB, IG | | | | | | | |

## 4. Gates before anything goes public (from SPEC §0.2 and §G)
These are owner gates. The kit does not decide them.
- [ ] **Launch go-ahead** from the owner in writing (B1 not started on 20 Oct 2026; DL-49).
- [ ] **RV-08 / B0-OC-25**: name and logo cleared for public use, **social avatars and cover images included** (moved to B4; must be re-opened or recorded).
- [ ] **RV-14**: Arabic review done, or waiver recorded (OD-05).
- [ ] **Screenshots released** (AG-5: checklist + owner spot-check). Until then, posts that need a screenshot wait or use the text-only fallback in their visual brief.
- [ ] **Marketing site live** at `https://atlass.dpdns.org/ar` (switch passed). If the site is still in holding state, no post links to it.
- [ ] **Register page wording** checked: no "free trial" / «تجربة مجانية» on `/auth/register` (B0-CPY-24, SPEC C-9, OD-14). If it still says so, hold every CTA-T link.
- [ ] **WhatsApp Business number** live with the profile, away message and quick replies (OD-04).
- [ ] **UTM register rows** added for every value in INDEX §3 before the first link is posted.

## 5. Launch-day checklist (D0)
**Morning, before the first post**
- [ ] Open `https://atlass.dpdns.org/ar`, `/ar/pricing`, `/ar/contact?topic=sales`, `/auth/register?lang=ar`: all load, Arabic, correct plan names.
- [ ] Prices on `/ar/pricing` match CL-19. If not, edit P18, P19, R10, WS04 and the reply template "بكام؟" before approval.
- [ ] Trial shows 14 days and "no card" on the pricing page and the register page.
- [ ] Profiles (created by the owner, OD-03): display name «أطلس | Atlas», bio from `strategy.md` §2, avatar and cover only if RV-08 is cleared, link in bio with `utm_medium=bio`.
- [ ] WhatsApp: number tested from a second phone; away message on; quick replies loaded (`whatsapp-and-groups.md` §4).
- [ ] Pinned post ready: P04 on Facebook, P04 first on the Instagram grid.
- [ ] Comment templates open on the phone of the person answering (`strategy.md` §7).
- [ ] Demo academy online and its registration set to **invite or approval** so nobody can pay into it by mistake (lead-gen §8). Demo academy hero shows «أكاديمية تجريبية».

**Publishing (D0 slots in `launch-calendar.md`)**
- [ ] P04 (FB + IG), R01 (TikTok, Reels, Shorts), WS01 (Status), L01 (LinkedIn). Each from the approved file, with its own UTM.
- [ ] Facebook: link in the **first comment**, posted by the Page right after publishing.
- [ ] No boosting, no ads, no paid promotion (ad-variants.md stays parked).

**First 24 hours**
- [ ] Reply to every comment within the posted hours (no public promise of speed).
- [ ] Move buying questions to WhatsApp with the DM hand-off line (strategy §7.1).
- [ ] Log every chat in the CRM sheet with its source code (e.g. `FB-P04`).
- [ ] Note any question the kit doesn't answer. Owner writes the answer; add it to the templates before reusing it.

**End of D0**
- [ ] Approval log updated with live URLs.
- [ ] Any problem (wrong price, broken link, a claim someone challenges) goes to the owner the same day, using the crisis playbook (strategy §8).

## 6. What this kit does not do
It does not create accounts, post, schedule, send messages or emails, run ads, buy anything, or contact anyone. It does not claim that any Arabic, legal or trademark review happened. It does not invent customers, numbers or quotes.
