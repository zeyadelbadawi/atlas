# Compliance check: Atlas launch kits

> Run on 20 Oct 2026 over every `.md` file in `launch-kits/` except this file (20 files). Tool: a Python regex scan (`scratchpad/kit-tools/scan.py`, case-insensitive), equivalent to:
> `grep -rniE "free|مجان|ببلاش|DRM|100 ?%|watermark|علامة مائية|تطبيق|لايف|فوري|Fawry|most popular|الأكثر|testimonial|السناتر|USD|premium" launch-kits/ --include=*.md`
> Each hit was then classified and every line read by hand. **Result: no banned string appears as a claim. Every remaining hit is a rule, an honest limit, a quoted question, a launch gate or a false positive.** No legal, Arabic or trademark review is implied by this check.

## 1. Fixes made during the check
| File | Was | Now | Why |
|---|---|---|---|
| `social-kit/posts-facebook-instagram.md` (P29 visual) | "progress bar at 100 %" | "progress bar filled to the end" | Avoid the 100 % string entirely in production briefs |
| `social-kit/posts-facebook-instagram.md` (P18 visual) | 'no highlighted "best" column' | "no highlighted column" | Keep "best" out of briefs |
| `social-kit/posts-facebook-instagram.md` (P23, P27) | Captions implied earlier conversations with teachers | Neutral captions | No invented experience before launch |
| `social-kit/whatsapp-and-groups.md` (G01) | «فورًا» | «من الأول» | Keep the root of «فوري» out of non-limit lines |
| `social-kit/whatsapp-and-groups.md` (G04) | «مفيش تطبيق، ومفيش… ومفيش…» | «اللي لسه مش موجود: تطبيق موبايل، ودفع…، وحصص مباشرة» | Negation list (AI tell) |
| `social-kit/linkedin.md` (L03) | "In most teams we hear about…" | Plain reason | No invented evidence |
| `sales-kit/objection-handling.md` (O11, O22) | «ناس كتير…» / «فالأفضل» | Removed | No invented evidence; no superlative |
| `sales-kit/battle-card.md` | "Best fit"; "often a store app…" about other platforms | "Strongest fit (hypothesis)"; "buyers may expect…, ask what theirs includes" | No superlative; no competitor facts |
| `social-kit/strategy.md` | "Best times" | "Posting times that work…" | No "best" |
| `sales-kit/one-pager-ar.md` | Heading «حماية الحساب» | «الحساب والبيانات» | "Protection" framing is not approved (DL-50) |
| `sales-kit/outreach-sequences.md` (RF2) | Referrer text said «أنا شغال على أطلس» | «أنا بستخدم أطلس لأكاديميتي» | Accurate for the person forwarding it |

## 2. Banned-string hits (after fixes)
| Pattern | Hits (unique lines) |
|---|---|
| `free` | 11 |
| `مجان` | 4 |
| `ببلاش` | 4 |
| `DRM` | 2 |
| `100%` | 5 |
| `watermark` | 1 |
| `علامة مائية` | 1 |
| `تطبيق` | 38 |
| `لايف` | 4 |
| `فوري` | 36 |
| `Fawry` | 15 |
| `most popular` | 1 |
| `الأكثر` | 1 |
| `testimonial` | 6 |
| `السناتر` | 0 |
| `USD` | 0 |
| `premium` | 0 |

| Justification | Meaning | Hits |
|---|---|---|
| J1 | Rule or prohibition text (internal guidance that names the banned word so people avoid it) | 33 |
| J2 | Honest-limit line (allowed: SPEC A.10 permits app / live / Fawry / card only as "not available") | 64 |
| J3 | Quoted question in the buyer's or commenter's own words, answered honestly in the same row | 25 |
| J4 | Launch gate: checking that the register page no longer says "free trial" (B0-CPY-24) | 4 |
| J5 | False positive (the letters appear inside another word, e.g. "freelancer") | 1 |
| J6 | Discovery question asking whether the buyer needs an app (qualification, not a claim) | 2 |

### Every hit
| # | Pattern | File | Line | Context (trimmed) | Justification |
|---|---|---|---|---|---|
| 1 | `free` | `INDEX.md` | 129 | per customer ¦ CAT-05 verified; live copy (BIL-5) ¦ Never "free"; say «تجربة ١٤ يوم من غير كارت» ¦ | J1 |
| 2 | `100%` | `INDEX.md` | 137 | termark / tracing / anti-piracy; "can't be recorded" or any 100 % wording; hosted video upload; a mobile app ( | J1 |
| 3 | `Fawry` | `INDEX.md` | 137 | y "no app yet"); live classes (only "not available"); card, Fawry or automatic payment (only "not available"); | J1 |
| 4 | `free` | `INDEX.md` | 137 | "most popular"; "in minutes"/"in a day"; best/#1/leading; "free" in any language; "on every plan" for custom d | J1 |
| 5 | `most popular` | `INDEX.md` | 137 | s; competitor names; the Arabic word for tutoring centres; "most popular"; "in minutes"/"in a day"; best/#1/le | J1 |
| 6 | `testimonial` | `INDEX.md` | 137 | ilable"); WhatsApp or SMS features for students or parents; testimonials, ratings, reviews, logos, case studie | J1 |
| 7 | `watermark` | `INDEX.md` | 137 | Viewer code / watermark / tracing / anti-piracy; "can't be recorded" or any 100 % w | J1 |
| 8 | `Fawry` | `INDEX.md` | 145 | s manual and done by the account owner. There is no card or Fawry checkout today." ¦ Every long-form explanati | J1 |
| 9 | `فوري` | `INDEX.md` | 145 | قة يدوية، وبيعملها صاحب الحساب. مفيش دفع بالكارت أو عن طريق فوري دلوقتي.» ¦ "Approval is manual and done by th | J1 |
| 10 | `testimonial` | `INDEX.md` | 173 | tegrity UI, revenue charts, admin/staff roles, real people, testimonials or counts. English captures ('…-en-…' | J1 |
| 11 | `free` | `INDEX.md` | 193 | ¦ OD-14 ¦ Register page may still say "free trial" (B0-CPY-24 in B4, SPEC C-9): fix before any CTA-T li | J4 |
| 12 | `Fawry` | `sales-kit/00-README.md` | 25 | pproval is manual and done by the account owner; no card or Fawry checkout; lessons are YouTube videos played  | J1 |
| 13 | `free` | `sales-kit/00-README.md` | 29 | 6. **No "free"** in any language. The trial is «تجربة ١٤ يوم من غير كارت» | J1 |
| 14 | `free` | `sales-kit/00-README.md` | 39 | - [ ] Register page shows no "free trial" wording (OD-14). | J4 |
| 15 | `تطبيق` | `sales-kit/battle-card.md` | 56 | ؟ وإيه اللي مضايقك؟» · «طلابك بيدفعوا إزاي عليها؟» · «محتاج تطبيق أو دفع بالكارت ضروري؟» | J3 |
| 16 | `free` | `sales-kit/battle-card.md` | 66 | ## Card 3 · A custom-built website (freelancer or agency quote) | J5 |
| 17 | `Fawry` | `sales-kit/battle-card.md` | 89 | ¦ Needs card or Fawry checkout ¦ Agree; not a fit yet (K2) ¦ | J2 |
| 18 | `فوري` | `sales-kit/demo-script.md` | 44 | وية وبتعملها انت كصاحب الحساب، ومفيش دفع بالكارت أو عن طريق فوري دلوقتي. والفلوس بتروح لك على طول، ومن غير عمو | J2 |
| 19 | `تطبيق` | `sales-kit/demo-script.md` | 46 | er, not the screen) ¦ «قبل ما تقرر، حاجات لازم تعرفها: مفيش تطبيق، الأكاديمية بتشتغل من متصفح الموبايل. الدروس | J2 |
| 20 | `Fawry` | `sales-kit/demo-script.md` | 60 | the list: no app; manual approval by the owner; no card or Fawry; lessons are YouTube videos and a determined  | J2 |
| 21 | `Fawry` | `sales-kit/discovery-and-qualification.md` | 27 | ank = fit (CL-05). Cash mostly = weaker. Insists on card or Fawry = not yet fit ¦ | J6 |
| 22 | `تطبيق` | `sales-kit/discovery-and-qualification.md` | 41 | ¦ Q13 ¦ محتاج تطبيق على الموبايل ضروري، ولا موقع يشتغل من الموبايل يكفي؟ ¦ App | J6 |
| 23 | `تطبيق` | `sales-kit/discovery-and-qualification.md` | 61 | ¦ K1 ¦ A student app in the store, now ¦ «لو التطبيق شرط دلوقتي، أطلس لسه مش مناسب.» ¦ | J2 |
| 24 | `Fawry` | `sales-kit/discovery-and-qualification.md` | 62 | ¦ K2 ¦ Card or Fawry checkout, or automatic activation without a person approvin | J2 |
| 25 | `فوري` | `sales-kit/discovery-and-qualification.md` | 62 | ع عندنا بالمحافظ وإنستاباي والتحويل، بموافقتك. مفيش كارت أو فوري دلوقتي.» ¦ | J2 |
| 26 | `تطبيق` | `sales-kit/objection-handling.md` | 12 | ¦ O4 ¦ «فيه تطبيق؟» ¦ لسه لأ، الأكاديمية بتشتغل من متصفح الموبايل ¦ honest li | J3 |
| 27 | `فوري` | `sales-kit/objection-handling.md` | 13 | ¦ O5 ¦ «عايز كارت / فوري» ¦ مفيش دلوقتي؛ المحافظ وإنستاباي والتحويل بموافقتك ¦ CL-05 | J2 |
| 28 | `ببلاش` | `sales-kit/objection-handling.md` | 23 | ¦ O15 ¦ «فيه تجربة ببلاش؟» ¦ تجربة ١٤ يوم من غير كارت، ومفيش باقة من غير اشتراك ¦ CL | J3 |
| 29 | `لايف` | `sales-kit/objection-handling.md` | 26 | ¦ O18 ¦ «عايز حصص لايف» ¦ الحصص المباشرة مش موجودة ¦ honest limit ¦ «الحصص المباشر | J2 |
| 30 | `100%` | `sales-kit/objection-handling.md` | 58 | on video, tracing, "we'll find who leaked it", DRM or any "100 %" wording. (Device sentence follows OD-10.) | J1 |
| 31 | `DRM` | `sales-kit/objection-handling.md` | 58 | ention codes on video, tracing, "we'll find who leaked it", DRM or any "100 %" wording. (Device sentence follo | J1 |
| 32 | `تطبيق` | `sales-kit/objection-handling.md` | 60 | ### O4 · «فيه تطبيق؟» | J3 |
| 33 | `تطبيق` | `sales-kit/objection-handling.md` | 61 | - **Say:** «لسه مفيش تطبيق. أكاديميتك بتشتغل من متصفح الموبايل، ليك ولطلابك، والطالب ب | J2 |
| 34 | `تطبيق` | `sales-kit/objection-handling.md` | 62 | - **Follow-up:** «التطبيق شرط، ولا المهم إنه يشتغل كويس من الموبايل؟» | J3 |
| 35 | `فوري` | `sales-kit/objection-handling.md` | 65 | ### O5 · «عايز الدفع بالكارت» / «فيه فوري؟» | J3 |
| 36 | `فوري` | `sales-kit/objection-handling.md` | 66 | - **Say:** «لا، مفيش دفع بالكارت أو عن طريق فوري دلوقتي. الطلاب بيدفعولك بفودافون كاش أو أورنج كاش أو اتصالا | J2 |
| 37 | `100%` | `sales-kit/objection-handling.md` | 78 | - **Never:** certifications, "100 % secure", "tenant isolation", backup promises (backup wordin | J1 |
| 38 | `فوري` | `sales-kit/objection-handling.md` | 97 | وافقة يدوية وانت اللي بتعملها، ومفيش دفع بالكارت أو عن طريق فوري دلوقتي. اللي بيتغير إن كل الإثباتات في قايمة  | J2 |
| 39 | `ببلاش` | `sales-kit/objection-handling.md` | 114 | ### O15 · «فيه تجربة ببلاش؟» / «فيه باقة مجانية؟» | J3 |
| 40 | `مجان` | `sales-kit/objection-handling.md` | 114 | ### O15 · «فيه تجربة ببلاش؟» / «فيه باقة مجانية؟» | J3 |
| 41 | `لايف` | `sales-kit/objection-handling.md` | 126 | ### O18 · «عايز حصص لايف» | J3 |
| 42 | `تطبيق` | `sales-kit/one-pager-ar.md` | 47 | لا يوجد تطبيق موبايل (الأكاديمية تعمل من متصفح الموبايل). لا توجد حصص مبا | J2 |
| 43 | `فوري` | `sales-kit/one-pager-ar.md` | 47 | قوم بها صاحب الحساب، ولا يوجد حاليًا دفع بالكارت أو عن طريق فوري. الدروس فيديوهات يوتيوب تُعرض داخل أكاديميتك، | J2 |
| 44 | `free` | `sales-kit/one-pager-ar.md` | 59 | ** testimonials, customer counts, logos, competitor names, "free", "app" (except "no app"), any protection pro | J2 |
| 45 | `testimonial` | `sales-kit/one-pager-ar.md` | 59 | **Not on this page by design:** testimonials, customer counts, logos, competitor names, "free", "app" ( | J1 |
| 46 | `Fawry` | `sales-kit/one-pager-en.md` | 45 | s manual and done by the account owner; there is no card or Fawry checkout today. Lessons are YouTube videos p | J2 |
| 47 | `free` | `sales-kit/one-pager-en.md` | 57 | ** testimonials, customer counts, logos, competitor names, "free", protection promises, response-time promises | J1 |
| 48 | `testimonial` | `sales-kit/one-pager-en.md` | 57 | **Not on this page by design:** testimonials, customer counts, logos, competitor names, "free", protect | J1 |
| 49 | `تطبيق` | `sales-kit/outreach-sequences.md` | 39 | اتكلمنا بصراحة إن الموافقة على الدفع يدوية ومعاك انت، ومفيش تطبيق ولا دفع بالكارت أو عن طريق فوري، والطالب الل | J2 |
| 50 | `فوري` | `sales-kit/outreach-sequences.md` | 39 | دفع يدوية ومعاك انت، ومفيش تطبيق ولا دفع بالكارت أو عن طريق فوري، والطالب اللي مصمم يقدر ينسخ لينك يوتيوب نفسه | J2 |
| 51 | `تطبيق` | `sales-kit/outreach-sequences.md` | 62 | احب الحساب، ومفيش دفع بالكارت أو عن طريق فوري دلوقتي، ومفيش تطبيق موبايل. | J2 |
| 52 | `فوري` | `sales-kit/outreach-sequences.md` | 62 | لاب يدوية ويعملها صاحب الحساب، ومفيش دفع بالكارت أو عن طريق فوري دلوقتي، ومفيش تطبيق موبايل. | J2 |
| 53 | `تطبيق` | `sales-kit/outreach-sequences.md` | 89 | لأكاديميتك، حابين تعرف من الأول اللي لسه مش موجود على أطلس: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص م | J2 |
| 54 | `فوري` | `sales-kit/outreach-sequences.md` | 89 | سه مش موجود على أطلس: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص مباشرة، ورفع ملفات فيديو، ورسايل واتساب | J2 |
| 55 | `فوري` | `sales-kit/sales-deck.md` | 54 | يقوم بها صاحب الحساب. لا يوجد حاليًا دفع بالكارت أو عن طريق فوري. | J2 |
| 56 | `تطبيق` | `sales-kit/sales-deck.md` | 90 | - لا يوجد تطبيق موبايل. الأكاديمية تعمل من متصفح الموبايل. | J2 |
| 57 | `فوري` | `sales-kit/sales-deck.md` | 91 | - لا يوجد دفع بالكارت أو عن طريق فوري، والموافقة يدوية. | J2 |
| 58 | `Fawry` | `sales-kit/sales-deck.md` | 130 | s manual and done by the account owner. There is no card or Fawry checkout today." ¦ | J2 |
| 59 | `Fawry` | `sales-kit/sales-deck.md` | 136 | ¦ 13 ¦ Plainly: what we don't do yet ¦ No app, no card/Fawry, manual approval, no live classes, no video uploa | J2 |
| 60 | `Fawry` | `social-kit/00-README.md` | 22 | lessons or videos come up; D-2 (manual approval, no card or Fawry) in every long-form payments explanation; D- | J1 |
| 61 | `free` | `social-kit/00-README.md` | 52 | - [ ] **Register page wording** checked: no "free trial" / «تجربة مجانية» on '/auth/register' (B0-CPY-24, SPE | J4 |
| 62 | `مجان` | `social-kit/00-README.md` | 52 | **Register page wording** checked: no "free trial" / «تجربة مجانية» on '/auth/register' (B0-CPY-24, SPEC C-9,  | J4 |
| 63 | `free` | `social-kit/ad-variants.md` | 5 | X.md' §4. No testimonials, counts, discounts, deadlines or "free" anywhere. | J1 |
| 64 | `testimonial` | `social-kit/ad-variants.md` | 5 | natively reviewed** (RV-14). Claims → '../INDEX.md' §4. No testimonials, counts, discounts, deadlines or "free | J1 |
| 65 | `فوري` | `social-kit/ad-variants.md` | 19 | فيدخل الكورس. الموافقة يدوية، ومفيش دفع بالكارت أو عن طريق فوري دلوقتي. ¦ 175 ¦ طلابك يدفعولك وانت توافق ¦ 24  | J2 |
| 66 | `تطبيق` | `social-kit/ad-variants.md` | 46 | ¦ ad-d1 ¦ لسه مش موجود على أطلس: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص مباشرة. لو ده مش | J2 |
| 67 | `فوري` | `social-kit/ad-variants.md` | 46 | سه مش موجود على أطلس: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص مباشرة. لو ده مش مشكلة ليك، طلابك يدفعو | J2 |
| 68 | `تطبيق` | `social-kit/ad-variants.md` | 63 | ¦ tt-05 ¦ «فيه تطبيق؟ لسه لأ.» ¦ لسه لأ ¦ أكاديميتك بتشتغل من متصفح الموبايل ¦ R | J3 |
| 69 | `Fawry` | `social-kit/linkedin.md` | 26 | nual and done by the account owner, and there is no card or Fawry checkout today. | J2 |
| 70 | `فوري` | `social-kit/linkedin.md` | 37 | قوم بها صاحب الحساب، ولا يوجد حاليًا دفع بالكارت أو عن طريق فوري. | J2 |
| 71 | `Fawry` | `social-kit/linkedin.md` | 93 | s manual and done by the account owner, there is no card or Fawry checkout today, and revenue charts do not in | J2 |
| 72 | `فوري` | `social-kit/linkedin.md` | 104 | دوية ويقوم بها صاحب الحساب، ولا يوجد دفع بالكارت أو عن طريق فوري حاليًا، والرسوم البيانية للإيرادات لا تشمل هذ | J2 |
| 73 | `Fawry` | `social-kit/linkedin.md` | 112 | a mobile app (academies run in the phone browser), card or Fawry checkout, live classes, video file uploads, p | J2 |
| 74 | `تطبيق` | `social-kit/linkedin.md` | 121 | هذه الميزة. وهذه القائمة المختصرة لما لا يقدمه أطلس اليوم: تطبيق موبايل (الأكاديميات تعمل من متصفح الموبايل)،  | J2 |
| 75 | `فوري` | `social-kit/linkedin.md` | 121 | كاديميات تعمل من متصفح الموبايل)، والدفع بالكارت أو عن طريق فوري، والحصص المباشرة، ورفع ملفات الفيديو، والمواف | J2 |
| 76 | `تطبيق` | `social-kit/posts-facebook-instagram.md` | 27 | ¦ P08 ¦ D4 ¦ FIT ¦ Single image ¦ فيه تطبيق؟ لسه لأ ¦ PRICING#limits ¦ | J3 |
| 77 | `تطبيق` | `social-kit/posts-facebook-instagram.md` | 102 | 4. اللي لسه مش موجود: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص مباشرة، ورسايل و | J2 |
| 78 | `فوري` | `social-kit/posts-facebook-instagram.md` | 102 | 4. اللي لسه مش موجود: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص مباشرة، ورسايل واتساب لأولياء الأمور. | J2 |
| 79 | `فوري` | `social-kit/posts-facebook-instagram.md` | 137 | قة يدوية وبيعملها صاحب الحساب، ومفيش دفع بالكارت أو عن طريق فوري دلوقتي. | J2 |
| 80 | `فوري` | `social-kit/posts-facebook-instagram.md` | 157 | فقة يدوية وبيعملها صاحب الحساب. مفيش دفع بالكارت أو عن طريق فوري دلوقتي. | J2 |
| 81 | `فوري` | `social-kit/posts-facebook-instagram.md` | 162 | قة يدوية وبيعملها صاحب الحساب، ومفيش دفع بالكارت أو عن طريق فوري دلوقتي. | J2 |
| 82 | `تطبيق` | `social-kit/posts-facebook-instagram.md` | 212 | **Hook:** أول سؤال بيتسأل: فيه تطبيق؟ لسه لأ. | J3 |
| 83 | `تطبيق` | `social-kit/posts-facebook-instagram.md` | 215 | أول سؤال بيتسأل: فيه تطبيق؟ لسه لأ. | J3 |
| 84 | `تطبيق` | `social-kit/posts-facebook-instagram.md` | 217 | بيفتح لينك أكاديميتك، يسجل، يدفع، ويتفرج. ولو طلابك محتاجين تطبيق على المتجر دلوقتي، يبقى أطلس لسه مش مناسب لي | J2 |
| 85 | `تطبيق` | `social-kit/posts-facebook-instagram.md` | 224 | **Alt text:** رسم لموبايل مفتوح عليه متصفح، وجملة: فيه تطبيق؟ لسه لأ. | J3 |
| 86 | `تطبيق` | `social-kit/posts-facebook-instagram.md` | 289 | ولسه مش مناسب لو محتاج تطبيق موبايل لطلابك، أو دفع بالكارت أو عن طريق فوري، أو حصص مباشر | J2 |
| 87 | `فوري` | `social-kit/posts-facebook-instagram.md` | 289 | اسب لو محتاج تطبيق موبايل لطلابك، أو دفع بالكارت أو عن طريق فوري، أو حصص مباشرة، أو رسايل واتساب أو SMS لأوليا | J2 |
| 88 | `تطبيق` | `social-kit/posts-facebook-instagram.md` | 582 | 2. فيه تطبيق؟ لسه لأ. أكاديميتك بتشتغل من متصفح الموبايل. | J3 |
| 89 | `تطبيق` | `social-kit/posts-facebook-instagram.md` | 674 | 5. لسه مش موجود: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص مباشرة. | J2 |
| 90 | `فوري` | `social-kit/posts-facebook-instagram.md` | 674 | 5. لسه مش موجود: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص مباشرة. | J2 |
| 91 | `تطبيق` | `social-kit/reels-tiktok-shorts.md` | 22 | ¦ R04 ¦ 15 s ¦ FIT ¦ Talking head ¦ فيه تطبيق؟ ¦ Pricing (limits) ¦ | J3 |
| 92 | `فوري` | `social-kit/reels-tiktok-shorts.md` | 45 | فقة يدوية وبيعملها صاحب الحساب. مفيش دفع بالكارت أو عن طريق فوري دلوقتي. · تجربة ١٤ يوم من غير كارت ¦ «جرّبها  | J2 |
| 93 | `فوري` | `social-kit/reels-tiktok-shorts.md` | 47 | توافق مرة واحدة فيدخل الكورس. الموافقة يدوية ومفيش كارت أو فوري دلوقتي. #مدرسين_مصر #ثانوية_عامة #أطلس | J2 |
| 94 | `تطبيق` | `social-kit/reels-tiktok-shorts.md` | 85 | ### R04 · 15 s · FIT · "فيه تطبيق؟" | J3 |
| 95 | `تطبيق` | `social-kit/reels-tiktok-shorts.md` | 89 | ¦ 0–2 s ¦ Talking head, holding a phone up ¦ فيه تطبيق؟ ¦ «فيه تطبيق؟ لسه لأ.» ¦ | J3 |
| 96 | `تطبيق` | `social-kit/reels-tiktok-shorts.md` | 90 | تك بتشتغل من متصفح الموبايل، ليك ولطلابك. ولو طلابك محتاجين تطبيق دلوقتي، أطلس لسه مش مناسب ليك.» ¦ | J2 |
| 97 | `تطبيق` | `social-kit/reels-tiktok-shorts.md` | 93 | **Caption:** لسه مفيش تطبيق، والأكاديمية بتشتغل من متصفح الموبايل. بنقولها من الأول. #م | J2 |
| 98 | `تطبيق` | `social-kit/reels-tiktok-shorts.md` | 94 | **Shorts title:** أطلس فيه تطبيق موبايل؟ | J3 |
| 99 | `فوري` | `social-kit/reels-tiktok-shorts.md` | 168 | nd card ¦ الموافقة يدوية وبيعملها صاحب الحساب. مفيش كارت أو فوري دلوقتي. ¦ «الموافقة لسه يدوية ومعاك انت. جرّب | J2 |
| 100 | `تطبيق` | `social-kit/reels-tiktok-shorts.md` | 229 | ¦ 2–8 s ¦ Same + text ¦ تطبيق موبايل ¦ «تطبيق موبايل لطلابك.» ¦ | J2 |
| 101 | `فوري` | `social-kit/reels-tiktok-shorts.md` | 230 | ¦ 8–14 s ¦ Same ¦ دفع بالكارت أو فوري ¦ «دفع بالكارت أو عن طريق فوري.» ¦ | J2 |
| 102 | `Fawry` | `social-kit/strategy.md` | 49 | ely, don't chase):** needs a student app now; needs card or Fawry checkout; needs live classes; needs WhatsApp | J2 |
| 103 | `free` | `social-kit/strategy.md` | 80 | ¦ مجاني / ببلاش / تجربة مجانية / free ¦ No free plan; it's a trial ¦ «تجربة ١٤ يوم من غير كارت» ¦ | J1 |
| 104 | `ببلاش` | `social-kit/strategy.md` | 80 | ¦ مجاني / ببلاش / تجربة مجانية / free ¦ No free plan; it's a trial ¦ «تجربة | J1 |
| 105 | `مجان` | `social-kit/strategy.md` | 80 | ¦ مجاني / ببلاش / تجربة مجانية / free ¦ No free plan; it's a trial | J1 |
| 106 | `تطبيق` | `social-kit/strategy.md` | 81 | ¦ تطبيق (as something we have) ¦ There is no app ¦ «أكاديميتك بتشتغ | J1 |
| 107 | `لايف` | `social-kit/strategy.md` | 82 | ¦ لايف / حصص لايف ¦ Not available ¦ Only «الحصص المباشرة مش موجودة | J1 |
| 108 | `فوري` | `social-kit/strategy.md` | 83 | ¦ دفع أوتوماتيك / فوري (instant) / فوري (the network) / كارت ¦ Not available ¦ «ال | J1 |
| 109 | `100%` | `social-kit/strategy.md` | 84 | ¦ حماية 100% / مستحيل يتسرب / يمنع التسجيل / علامة مائية / DRM / بنعرف م | J1 |
| 110 | `DRM` | `social-kit/strategy.md` | 84 | ¦ حماية 100% / مستحيل يتسرب / يمنع التسجيل / علامة مائية / DRM / بنعرف مين سرّب ¦ Not true or not approved ¦ « | J1 |
| 111 | `علامة مائية` | `social-kit/strategy.md` | 84 | ¦ حماية 100% / مستحيل يتسرب / يمنع التسجيل / علامة مائية / DRM / بنعرف مين سرّب ¦ Not true or not approved ¦ « | J1 |
| 112 | `الأكثر` | `social-kit/strategy.md` | 87 | ¦ الأكثر اختيارًا / الأفضل / رقم ١ ¦ No proof; banned ¦ Describe who | J1 |
| 113 | `ببلاش` | `social-kit/strategy.md` | 156 | ¦ CM-02 ¦ «مجاني؟» / «ببلاش؟» / «فيه فري تريال؟» ¦ مفيش باقة من غير اشتراك. اللي موجود | J3 |
| 114 | `مجان` | `social-kit/strategy.md` | 156 | ¦ CM-02 ¦ «مجاني؟» / «ببلاش؟» / «فيه فري تريال؟» ¦ مفيش باقة من غير اشتراك. | J3 |
| 115 | `تطبيق` | `social-kit/strategy.md` | 157 | ¦ CM-03 ¦ «فيه تطبيق؟» ¦ لسه مفيش تطبيق. أكاديميتك بتشتغل من متصفح الموبايل لحضر | J3 |
| 116 | `لايف` | `social-kit/strategy.md` | 160 | ¦ CM-06 ¦ «فيه لايف؟» / «حصص مباشرة؟» ¦ لا، الحصص المباشرة مش موجودة على أطلس د | J3 |
| 117 | `فوري` | `social-kit/strategy.md` | 161 | ¦ CM-07 ¦ «الدفع بالفيزا؟» / «فيه فوري؟» ¦ لا. الطلاب بيدفعوا لحضرتك بفودافون كاش أو أورنج كاش أو | J3 |
| 118 | `100%` | `social-kit/strategy.md` | 185 | ابعته من صفحة التواصل.» (CL-18) ¦ Mention certifications, "100 %" safety, or jargon ¦ | J1 |
| 119 | `testimonial` | `social-kit/visual-briefs.md` | 54 | ers or emails (demo emails are masked), any review, rating, testimonial or student count. | J1 |
| 120 | `فوري` | `social-kit/whatsapp-and-groups.md` | 23 | ترفع جوه أكاديميتك وانت توافق. الموافقة يدوية ومفيش كارت أو فوري دلوقتي. ¦ TRIAL 'ws02' ¦ CL-06, D-2, D-3 ¦ | J2 |
| 121 | `تطبيق` | `social-kit/whatsapp-and-groups.md` | 26 | ¦ WS05 ¦ D8 ¦ فيه تطبيق؟ لسه لأ ¦ الأكاديمية بتشتغل من متصفح الموبايل. ولو طلابك مح | J3 |
| 122 | `فوري` | `social-kit/whatsapp-and-groups.md` | 44 | قة يدوية وبيعملها صاحب الحساب، ومفيش دفع بالكارت أو عن طريق فوري دلوقتي. | J2 |
| 123 | `تطبيق` | `social-kit/whatsapp-and-groups.md` | 81 | اللي لسه: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص مباشرة، ورسايل و | J2 |
| 124 | `فوري` | `social-kit/whatsapp-and-groups.md` | 81 | اللي لسه: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص مباشرة، ورسايل واتساب لأولياء الأمور. | J2 |
| 125 | `فوري` | `social-kit/whatsapp-and-groups.md` | 107 | فيدخل الكورس. الموافقة يدوية، ومفيش دفع بالكارت أو عن طريق فوري. لو حد عايز يشوفه، أنا موجود في الكومنتات. | J2 |
| 126 | `تطبيق` | `social-kit/whatsapp-and-groups.md` | 116 | ير عمولة منّا على المدفوعات دي. وبصراحة، اللي لسه مش موجود: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص م | J2 |
| 127 | `فوري` | `social-kit/whatsapp-and-groups.md` | 116 | ة، اللي لسه مش موجود: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص مباشرة. ولو دول مش مشكلة ليك، فيه تجربة | J2 |
| 128 | `تطبيق` | `social-kit/whatsapp-and-groups.md` | 139 | they decide, always ¦ قبل ما تقرر، حاجات لازم تعرفها: مفيش تطبيق (الأكاديمية بتشتغل من متصفح الموبايل)، والموا | J2 |
| 129 | `فوري` | `social-kit/whatsapp-and-groups.md` | 139 | فقة على الدفع يدوية ومعاك انت، ومفيش دفع بالكارت أو عن طريق فوري، والدروس فيديوهات يوتيوب جوه أكاديميتك والطال | J2 |

**Allowed by SPEC A.10 / TAC A-8:** "WhatsApp" and "YouTube" as the visitor's current tools; app, live, Fawry and card only as "not available" honest limits (live site `fit` and `honestLimits` blocks do the same). «لايف» is never used in Atlas's own sentences; it appears only inside quoted buyer questions (J3) and the don't-list (J1). `USD`, `premium`, «السناتر» and `watermark` claims: zero claim hits (the only `watermark` and «علامة مائية» lines are the never-say lists).

## 3. Other checks
| Check | Pattern | Result |
|---|---|---|
| Speed claims | in minutes · في دقائق · في يوم واحد | 4 hits, all rule text (INDEX never-list, sales README rule 5, demo "never promise", strategy don't-list) |
| Superlatives | best · #1 · leading · الأفضل · رقم ١ | 7 hits: rule text (INDEX, strategy don't-list) and one CSS class name `rtl:leading-[1.5]` in `visual-briefs.md` (false positive) |
| AI-tell stock phrases | seamless · unlock · revolution · game-changer · Arabic-first · عربي بالكامل · مش مجرد | 5 hits, all in don't-lists (the «مش مجرد…» line is the "instead of" example) |
| Exclamation marks | ! | 0 |
| Automatic payment | تلقائي · أوتوماتيك · automatic | 7 hits: rule text or honest limits («موافقة تلقائية على المدفوعات» listed as not available, matching the live pricing page) |
| Em dashes in publishable copy | — | None inside post, reel, status, ad, email or WhatsApp copy. Remaining uses: the placeholder `[owner contact — pending OC-17]` (format given in the brief), the demo-receipt label «إيصال تجريبي — Demo receipt» (SPEC D.1), empty table cells and internal notes |
| Prices | numbers in EGP | Every price block carries "[check live price at launch]" (posts P09, P18, P19, P20; reels R05, R10, R11; WS04, WS08; WR-04; WB04; L02, L06; CM-01; one-pagers; deck slides 10 and 14; pricing file; T12; ad descriptions noted in `ad-variants.md` §2) |
| Social proof | testimonial · review · rating · customers count | Only in "never/not on this page" lines. No asset contains a quote, count, logo or case study |
| Competitor names | every name in `04-market/competitor-profiles/` (31 profiles) | No competitor is named. Pattern hits were false positives ("drawn" for *raw*, "Typography" for *graphy*, a "First steps" column header) plus one internal note: the Atlas academy design called "manara" in the screenshot slug `[SS-003: academy-home-manara-ar ⏳ not captured yet, use the text-only fallback]` (INDEX §6) shares its name with a competitor profile. **Rule added: never name the four designs in public copy**; posts say «٤ تصميمات» only |
| D-1 coverage | posts/reels/LinkedIn mentioning YouTube | Every asset that describes lessons on Atlas carries D-1. Four mention YouTube only as the teacher's current tool (P02, P04 slide 2, P30, L01), which SPEC A.10 allows without the line |
| D-2 coverage | long-form payment explanations | P04, P05, P14 (short form), R01, R09, WB01, G02, L01, L04, deck slides 7 and 13, both one-pagers, demo scripts, CF1, W4, WR-05, objections O5 and O11 |
| D-3 coverage | every screenshot or screen recording | Every `[SS-…]` use and every recorded reel shot specifies «محتوى تجريبي»; `visual-briefs.md` §5 makes it a template rule |

## 4. Claims used and their claims-register lines
Counts are files that cite the claim ID (ranges like CL-05…08 included). "D-1" also matches the calendar's day label "D-1", so its file list is wider than its real use.
| ID | Claim used | Claims-register line / source | Files | Where |
|---|---|---|---|---|
| CL-01 | Own Atlas subdomain the moment the academy is created | A.11 row 1 "May say" (ACD-6.2 prod-verified) | 12 | battle-card.md, demo-script.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, pricing-faq-and-calculator.md, sales-deck.md, ad-variants.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-02 | Connect a domain you already own (never "on every plan") | A.11 row 2 "May say generically" (ACD-6.3); C-26 | 12 | battle-card.md, demo-script.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, pricing-faq-and-calculator.md, sales-deck.md, ad-variants.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-03 | Four designs; logo sets the colours with a contrast check | A.11 row 1 (WEB-2.1, ACD-5) | 11 | battle-card.md, demo-script.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, sales-deck.md, ad-variants.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-04 | Arabic and English pages; ready-made sections; preview; publish when ready | A.11 row 1 (WEB-6.7, WEB-1.3.1, WEB-1.4) | 10 | battle-card.md, demo-script.md, one-pager-ar.md, one-pager-en.md, sales-deck.md, ad-variants.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-05 | Students pay by Vodafone Cash / Orange Cash / Etisalat Cash / WE Pay / InstaPay / bank transfer | A.11 row 3 "May say" (COM-2; OC-09 done, DL-48) | 14 | battle-card.md, demo-script.md, discovery-and-qualification.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, sales-deck.md, ad-variants.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-06 | Upload proof; approve once; enrolled + emailed; reject with a reason, student pays again | A.11 row 3 (COM-1.5, COM-3.1, COM-3.2) | 13 | battle-card.md, demo-script.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, sales-deck.md, ad-variants.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-07 | Money straight to the teacher; 0 % Atlas commission on these payments | A.11 row 3 (COM-2) | 14 | battle-card.md, demo-script.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, pricing-faq-and-calculator.md, sales-deck.md, ad-variants.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-08 | Only the account owner approves payments | A.11 row 3 "Say you approve (owner-only)" (COM-2.0) | 15 | battle-card.md, demo-script.md, discovery-and-qualification.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, pricing-faq-and-calculator.md, sales-deck.md, ad-variants.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-09 | Two devices, one screen at a time; third device refused; student removes a device | A.11 row 4 "May say" (MED-6.1–6.3); owner to confirm use (OD-10) | 10 | battle-card.md, demo-script.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, sales-deck.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-10 | Owner / manager / instructor; instructors see only their courses | A.11 row 7 (ORG-2.2, ORG-2.3, LRN-10) | 13 | battle-card.md, demo-script.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, sales-deck.md, ad-variants.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-11 | Several academies in one account per plan (1 / 1 / 5) | A.11 row 7 "counts from the catalog" (ACD-8, ORG-4.2) | 11 | battle-card.md, demo-script.md, objection-handling.md, pricing-faq-and-calculator.md, sales-deck.md, ad-variants.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-12 | Quizzes with five question types; manual grading | A.11 row 8 (LRN-7.1, LRN-7.4); no integrity wording | 12 | battle-card.md, demo-script.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, sales-deck.md, ad-variants.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-13 | Homework with due dates, late policy, feedback | A.11 row 8 (LRN-9) | 12 | battle-card.md, demo-script.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, sales-deck.md, ad-variants.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-14 | Certificates verifiable on a public page | A.11 row 8 (LRN-11, LRN-11.5) | 11 | battle-card.md, demo-script.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, sales-deck.md, ad-variants.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-15 | Lessons are YouTube videos played inside the academy | Live site copy (LRN-3.2) + A.12 disclosure D-1 | 12 | demo-script.md, discovery-and-qualification.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, sales-deck.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-16 | Sign-up modes; student reports; email announcements | Live site copy, home "students" block (ORG-3.2, ANL-2, MSG-9) | 7 | demo-script.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, sales-deck.md, posts-facebook-instagram.md, strategy.md |
| CL-17 | Orders and payments in one list; revenue charts exclude manual payments | Live site FAQ (COM-3.0, COM-4.1) | 11 | battle-card.md, demo-script.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, sales-deck.md, ad-variants.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md |
| CL-18 | Academy data separated in the database (checked in production); new-device email code | A.11 row 9 /security list, subject to RV-13 (ORG-5.2, ORG-3.1, IAM-4.1) | 10 | demo-script.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, pricing-faq-and-calculator.md, sales-deck.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md |
| CL-19 | Plan prices and limits in EGP [check live price at launch] | Catalog verified 19 Oct 2026 (B0-OC-27, CAT-02); 05-pricing | 14 | battle-card.md, demo-script.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, sales-deck.md, 00-README.md, ad-variants.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-20 | 14-day trial, full plan limits, no card, one per customer | CAT-05 verified; live copy (BIL-5) | 13 | demo-script.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, pricing-faq-and-calculator.md, sales-deck.md, ad-variants.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, whatsapp-and-groups.md |
| CL-21 | Yearly: pay for 10 months, use 12 | A.10 replacement wording (REC R-03) | 12 | demo-script.md, discovery-and-qualification.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, sales-deck.md, ad-variants.md, linkedin.md, posts-facebook-instagram.md, strategy.md, whatsapp-and-groups.md |
| CL-22 | Atlas plan paid by InstaPay / wallet / bank with proof; a person reviews and activates | Live pricing copy "How do I pay for Atlas?" | 8 | demo-script.md, outreach-sequences.md, pricing-faq-and-calculator.md, sales-deck.md, linkedin.md, posts-facebook-instagram.md, strategy.md, whatsapp-and-groups.md |
| CL-23 | At a limit nothing is deleted; upgrade any time; downgrade in last 7 days; cancel keeps paid period | Live pricing copy "changes" block | 8 | demo-script.md, discovery-and-qualification.md, objection-handling.md, pricing-faq-and-calculator.md, sales-deck.md, linkedin.md, posts-facebook-instagram.md, strategy.md |
| CL-24 | Dashboard in Arabic and English, light or dark | Live site copy, home "languages" block | 4 | battle-card.md, demo-script.md, sales-deck.md, strategy.md |
| CL-25 | "Set it up with us": the Atlas team sets the academy up with you | Live site copy, home "assisted" block (CTA-C) | 8 | demo-script.md, objection-handling.md, outreach-sequences.md, sales-deck.md, ad-variants.md, posts-facebook-instagram.md, strategy.md, whatsapp-and-groups.md |
| D-1 | YouTube honesty line | SPEC A.12 as adapted in the live copy (code sentence removed per DL-50 brief) | 20 | 00-README.md, battle-card.md, crm-and-pipeline.md, demo-script.md, discovery-and-qualification.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, pricing-faq-and-calculator.md, sales-deck.md, 00-README.md, ad-variants.md, launch-calendar.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, visual-briefs.md, whatsapp-and-groups.md |
| D-2 | Payments honest limit | SPEC A.12 (IA L185) | 15 | demo-script.md, objection-handling.md, one-pager-ar.md, one-pager-en.md, outreach-sequences.md, sales-deck.md, 00-README.md, ad-variants.md, launch-calendar.md, linkedin.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, strategy.md, visual-briefs.md, whatsapp-and-groups.md |
| D-3 | «محتوى تجريبي» / "Demo content" on every screenshot | SPEC A.12 (ASP A.1 rule 3) | 8 | demo-script.md, one-pager-ar.md, one-pager-en.md, sales-deck.md, 00-README.md, posts-facebook-instagram.md, reels-tiktok-shorts.md, whatsapp-and-groups.md |

**Claims deliberately not used** (gated or banned on 20 Oct 2026): viewer code / watermark / trace lookup (OC-10 → B4 and the owner's DL-50 brief); "custom domain on every plan" (CF-28); 17 section types (allowed, not needed); security backups wording (owner wording pending, SPEC A.11); response times (C-25); integrity / anti-cheating (C-18); Google sign-in (C-18); hosted video (DL-33); founding or design-partner offers (not in B1).

## 5. Open items this check cannot close
- RV-14 Arabic native review: not done. Every AR string stays "Pending: not reviewed".
- RV-08 name and logo public use: not cleared; blocks avatars, covers, OG images and any logo on posts.
- OD-10 device-rule posts (P26 and the device sentence in P15, R02, G05, O3, O22, one-pagers): hold until the owner confirms.
- OD-14 register page "free trial" wording (B0-CPY-24): must be fixed before any trial link is posted.
- Prices: re-check on launch day; the tag stays until then.
