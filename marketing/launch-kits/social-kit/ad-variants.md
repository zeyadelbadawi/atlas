# Ad variants: for LATER paid use only

> # NOT TO RUN BEFORE LAUNCH AND OWNER APPROVAL
> This file is copy for a possible later paid test. No ad account is created, no audience is built, no pixel is installed, nothing is boosted, no budget is set. Running any of it needs: the launch go-ahead, the owner's decision to spend (OD-16), counsel's view on consent and tracking (SPEC G.1 #2: no Meta pixel in B1), and per-ad approval like any post.
> Arabic is Egyptian colloquial, **not natively reviewed** (RV-14). Claims → `../INDEX.md` §4. No testimonials, counts, discounts, deadlines or "free" anywhere.

## 1. How the variants are organised
- **4 angles × 3 variants = 12 Meta ads.** Angles: A payments pain · B own-name academy · C team and several academies · D honest fit, commission and trial.
- Each variant: primary text (first ~125 characters show before "See more", so the hook is up front), headline (≤ 40), description (≤ 30). Character counts measured with Python `len()` on the Arabic strings.
- **Objective when tested later:** click-to-WhatsApp (conversations) first, because no pixel or consented conversion tracking exists. Landing-page clicks second.
- **Links (later):** `utm_source=facebook|instagram&utm_medium=paid-social&utm_campaign={yyyy-mm}-paid-test&utm_content=ad-a1…ad-d3`. `{yyyy-mm}-paid-test` and `paid-social` must be added to the UTM register before any ad runs.
- **One variable per test.** Same image, different primary text; or same text, different image. Allow at least ~1,000 impressions per variant before judging (ad-creative skill), and judge on WhatsApp chats that qualify, not clicks.

## 2. Meta variants (Facebook + Instagram feeds, Reels, Stories)

### Angle A · وجع الدفع (payments pain) · claims CL-05, CL-06, CL-07, CL-08, CL-17, CL-20, D-2
| ID | Primary text | Chars | Headline | Chars | Description | Chars |
|---|---|---|---|---|---|---|
| ad-a1 | لسه بتطابق صور التحويلات على الواتساب؟ على أطلس الطالب يرفع الإثبات جوه أكاديميتك، وانت توافق مرة واحدة فيدخل الكورس. الموافقة يدوية، ومفيش دفع بالكارت أو عن طريق فوري دلوقتي. | 175 | طلابك يدفعولك وانت توافق | 24 | تجربة ١٤ يوم من غير كارت | 24 |
| ad-a2 | الطالب حوّلك فودافون كاش. على أطلس بيرفع الإثبات جوه أكاديميتك، وانت تفتحه وتوافق، فيتسجل في الكورس ويوصله إيميل. الموافقة يدوية وبيعملها صاحب الحساب. | 150 | من التحويل للكورس بموافقة واحدة | 31 | من غير عمولة من أطلس | 20 |
| ad-a3 | إيصال مقصوص والمبلغ مش باين؟ على أطلس ترفضه وتكتب السبب، والطالب يرفع إثبات جديد. وكل طلب وكل دفعة في قايمة واحدة بالحالة والإثبات. | 131 | كل الدفعات في قايمة واحدة | 25 | تجربة ١٤ يوم من غير كارت | 24 |

**Creative:** A1 = static VT-01 hook card «كام صورة تحويل راجعت الأسبوع ده؟»; A2 = 15 s cut of R01 (payments flow, «محتوى تجريبي» on screen); A3 = `[SS-009 ⏳ not captured yet, use the text-only fallback]` rejected-with-reason phone frame.

### Angle B · أكاديمية باسمك (own-name academy) · claims CL-01…04, CL-14, CL-20
| ID | Primary text | Chars | Headline | Chars | Description | Chars |
|---|---|---|---|---|---|---|
| ad-b1 | انقل طلابك من جروبات الواتساب لأكاديمية باسمك: موقع بتصميمك وألوان شعارك، بالعربي والإنجليزي، والكورسات والدفع جواه. | 116 | أكاديميتك أونلاين، باسمك | 24 | تجربة ١٤ يوم من غير كارت | 24 |
| ad-b2 | ٤ تصميمات تختار منها، وألوان بتطلع من شعارك، وصفحات بالعربي والإنجليزي. أكاديميتك بتاخد نطاق فرعي على أطلس من لحظة ما تعملها، وتقدر تربط الدومين بتاعك. | 151 | موقع أكاديمية باسمك | 19 | اربط الدومين بتاعك | 18 |
| ad-b3 | بتدرّسي IG أو American؟ أكاديميتك على أطلس ليها نسخة عربي ونسخة إنجليزي لكل صفحة، وطلابك بياخدوا شهادات أي حد يقدر يتأكد منها أونلاين. | 134 | موقع بلغتين وشهادات | 19 | تجربة ١٤ يوم من غير كارت | 24 |

**Creative:** B1 = carousel cut of P07 (designs grid); B2 = R03 (30 s, site in 3 choices); B3 = P25 visual (EN + AR frames side by side). Never a custom-domain screenshot.

### Angle C · فريقك وأكتر من أكاديمية (team, several academies) · claims CL-08, CL-10, CL-11, CL-12, CL-13, CL-19
| ID | Primary text | Chars | Headline | Chars | Description | Chars |
|---|---|---|---|---|---|---|
| ad-c1 | ضيف مساعدينك على أطلس كمدرّسين، وكل واحد يشوف ويصحح الكورسات اللي انت محددها له بس. والموافقة على الدفع بتفضل معاك انت. | 119 | كل مساعد يشوف كورساته بس | 24 | الأكاديمية: لحد ٨ مدرّسين | 25 |
| ad-c2 | مدير يساعدك في إدارة الأكاديمية، ومدرّسين بيصححوا امتحانات وواجبات كورساتهم، وانت صاحب الحساب اللي بيوافق على الدفع. ٣ أدوار واضحة على أطلس. | 140 | ٣ أدوار واضحة لفريقك | 20 | تجربة ١٤ يوم من غير كارت | 24 |
| ad-c3 | عندك أكتر من براند؟ على أطلس كل براند أكاديمية ليها موقعها وطلابها وطرق دفعها، وكلهم من حساب واحد. | 98 | أكتر من أكاديمية، حساب واحد | 27 | المؤسسة: لحد ٥ أكاديميات | 24 |

**Creative:** C1 = R05 cut; C2 = P09 role cards; C3 = R11 (switcher). Plan limits in descriptions carry the launch price/limit check.

### Angle D · بصراحة، والتجربة (honest fit, commission, trial) · claims CL-05, CL-07, CL-19…21, CL-25, honest limits
| ID | Primary text | Chars | Headline | Chars | Description | Chars |
|---|---|---|---|---|---|---|
| ad-d1 | لسه مش موجود على أطلس: تطبيق موبايل، ودفع بالكارت أو عن طريق فوري، وحصص مباشرة. لو ده مش مشكلة ليك، طلابك يدفعولك بالمحافظ وإنستاباي في أكاديمية باسمك وانت توافق. | 162 | بنقولك الحدود من الأول | 22 | تجربة ١٤ يوم من غير كارت | 24 |
| ad-d2 | أطلس مش بياخد عمولة على فلوس طلابك. الطالب بيدفعلك مباشرة، وانت بتدفع تمن الباقة بس. وفي السنوي بتدفع ١٠ شهور وتستخدم ١٢. | 121 | ٠٪ عمولة على فلوس طلابك | 23 | الأسعار بالجنيه المصري | 22 |
| ad-d3 | جرّب أكاديميتك على أطلس ١٤ يوم من غير كارت، بكامل حدود الباقة وبكورساتك انت. ولو تحب، فريق أطلس يجهزها معاك خطوة بخطوة. | 119 | تجربة ١٤ يوم من غير كارت | 24 | أو جهّزها معانا | 15 |

**Creative:** D1 = R13 talking head; D2 = P06 «٠٪» card; D3 = P10 checklist cover.

**CTA buttons (Meta):** "Send message" (WhatsApp) for A and C; "Learn more" (site) for B; "Sign up" (trial) for D3 only. Never "Get offer" (there is no offer).

## 3. TikTok ad hooks (first 2 seconds) and ad text (≤ 80 characters recommended)
Every hook names the teacher, so the ad doesn't read as a student offer. Pair each with the listed script.

| ID | Spoken hook (0–2 s) | On-screen text | Ad text | Script |
|---|---|---|---|---|
| tt-01 | «يا مدرس، الطالب حوّل. وبعدين؟» | الطالب حوّل. وبعدين؟ | الطالب يرفع الإثبات في أكاديميتك وانت توافق مرة واحدة | R01 |
| tt-02 | «الساعة ١٢ بالليل وانت لسه بتطابق إيصالات؟» | ١٢ بالليل وإيصالات | نفس طرق الدفع، والإثبات جوه أكاديمية باسمك | R09 |
| tt-03 | «أطلس بياخد كام من فلوس طلابك؟ ولا حاجة.» | ٠٪ عمولة | الطالب بيدفعلك مباشرة، وانت بتدفع تمن الباقة بس | R10 |
| tt-04 | «الطالب يقدر يسجل الشاشة؟ هقولك بصراحة.» | إجابة صريحة | مفيش موقع يمنع تسجيل الشاشة تمامًا. اسمع الإجابة كاملة | R02 |
| tt-05 | «فيه تطبيق؟ لسه لأ.» | لسه لأ | أكاديميتك بتشتغل من متصفح الموبايل | R04 |
| tt-06 | «ده موقع أكاديمية عملناه بتلات اختيارات.» | ٣ اختيارات | تصميم، وألوان من شعارك، وصفحات بالعربي والإنجليزي | R03 |
| tt-07 | «مساعدك يشوف إيه بالظبط في أكاديميتك؟» | مين يشوف إيه | المدرّس يشوف كورساته بس، والدفع معاك انت | R05 |
| tt-08 | «إيصال الطالب مقصوص؟ ارفضه واكتب السبب.» | ارفض واكتب السبب | والطالب يرفع إثبات جديد | R06 |
| tt-09 | «عندك ٣ براندات؟ خليهم حساب واحد.» | ٣ براندات، حساب واحد | كل براند أكاديمية بموقعها وطلابها | R11 |
| tt-10 | «لو محتاج حاجة من الأربعة دول، أطلس لسه مش ليك.» | ٤ حاجات لسه | بنقولك الحدود قبل ما تجرب | R13 |
| tt-11 | «فيديوهاتك على يوتيوب أصلًا؟ سيبها هناك.» | سيبها هناك | حط لينك يوتيوب في الدرس، والطالب المصمم يقدر ينسخه | R14 |
| tt-12 | «هتجرب ١٤ يوم؟ اعمل الخمس حاجات دول.» | ١٤ يوم من غير كارت | تجربة ١٤ يوم من غير كارت بكورساتك انت | R12 |

## 4. Targeting notes for Egypt (for planning; no numbers, no budget)
| Topic | Note |
|---|---|
| Location | Egypt, nationwide (the product is online). After a first read, compare broad regions rather than single governorates: Greater Cairo (Cairo, Giza, Qalyubia), Alexandria and the Delta (Alexandria, Beheira, Gharbia, Dakahlia, Sharqia, Menoufia, Kafr El Sheikh, Damietta), Canal (Port Said, Ismailia, Suez), Upper Egypt (Fayoum, Beni Suef, Minya, Assiut, Sohag, Qena, Luxor, Aswan). Treat any regional difference as a signal to test, not a finding |
| Age | 24–60 for teachers and team owners. **Never include under-18s**; many students are minors and the ads are not for them. On TikTok start at 25+, because the platform's audience skews young |
| Language | Arabic first; English for the IG/American variant (B3) |
| Interests (verify names in Ads Manager on the day; they change) | Teaching, teachers, education, online learning / e-learning, tutoring, educational technology; for B3: international schools, IGCSE, American Diploma. Avoid exam-authority or ministry pages as interests |
| Behaviour / job titles | Job-title targeting (teacher, مدرس) is thin in Egypt; use it only as one test cell |
| Audiences we cannot build yet | Website visitors, video viewers retargeting, lookalikes and customer lists all need a pixel, consent and counsel review; not in B1 |
| Placements | Feeds, Reels and Stories on Facebook and Instagram; exclude Audience Network at first |
| Timing | Evening hours and weekends; pause or reduce in exam weeks; in Ramadan move delivery after iftar |
| Seasons (GTM §18, dates to verify) | Higher setup interest expected around the mid-year break and Jun–Sep; lower in exam months |
| Policy | Check Meta and TikTok education and financial-claims policies before submission. No before/after income claims, no student images, no guarantee language |
| Stop rules (owner sets numbers) | Pause a variant that gets comments flagging a wrong claim; pause the test if WhatsApp quality rating drops or blocks rise |
