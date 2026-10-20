# Live demo scripts: 15 minutes and 30 minutes

> PREPARED ONLY. No demo is booked or given before launch and owner approval. Talk track is spoken Egyptian Arabic, not natively reviewed (RV-14).
> Click paths follow the product as of the 20 Oct 2026 build (routes from the frontend source; UI labels from the Arabic locale files). **Re-walk the path on the demo machine the day before**: labels and menu positions can change.

## 1. The demo academy (fictional)
Identity is pending the owner (OC-29 / OD-08). Use this fictional setup until then, and keep «تجريبي» in every name so nobody mistakes it for a real teacher.
| Item | Value |
|---|---|
| Academy | «أكاديمية الفيزياء التجريبية» (subject: physics, 3rd secondary) |
| Teacher (owner account) | «أ. سامي (تجريبي)» |
| Second academy (for the switcher) | «أكاديمية الكيمياء التجريبية» (Organization-plan demo only) |
| Address | `[demo-subdomain].atlass.dpdns.org` (e.g. `demo-physics`; names are reserved forever once used, so pick it once) |
| Team | Manager «مريم (تجريبي)», instructor «أحمد (تجريبي)» with one assigned course |
| Students | «طالب تجريبي ١/٢/٣», masked emails `d•••@<demo-domain>` |
| Payment methods | Vodafone Cash + InstaPay + bank transfer with clearly fake details «حساب تجريبي» |
| Content | 3–5 short YouTube lessons owned by Atlas (unlisted), one quiz with all five question types, one graded homework, one issued certificate with a known demo code |
| Payments in the list | one approved, one under review (waiting for the live approval), one rejected with a reason |
| Registration | **Invite or approval** so no stranger can pay into the demo |
| Hero notice | «أكاديمية تجريبية، من فضلك ما تدفعش» |

## 2. Before every demo (10 minutes)
- [ ] Two browser profiles open: **Owner** (dashboard) and **Student** (academy site), plus a phone (or responsive view) for the student side.
- [ ] One fresh "under review" proof waiting in the payments list (upload it as «طالب تجريبي ٢» before the call, with the demo receipt «إيصال تجريبي — Demo receipt»).
- [ ] Notifications muted; other tabs closed; no personal email or real customer data on screen; never open the Platform Owner console.
- [ ] «محتوى تجريبي» visible: say it out loud at the start.
- [ ] Prices checked on `/ar/pricing` today.
- [ ] Know the prospect's numbers from discovery (students, assistants, payment methods, brands).

## 3. What we never show or say in a demo
- Never open the **lesson player full-screen or comment on any on-screen overlay**. No claim about the player overlay is approved (OD-09). If the buyer points at a code on the video: «ده مربوط بحساب الطالب. مش بنقول عليه إنه بيمنع أو بيكشف أي تسريب، ولو حابب تفاصيل أكتر هخلّي صاحب أطلس يرد عليك.»
- Never show: text lessons, video upload screens, live sessions, the academy blog, the Google sign-in button, integrity settings, revenue charts presented as sales reporting, the custom-domain tab, admin/staff roles.
- Never promise: dates, reply times, "it's ready in minutes", income, "students can't record".
- Devices page (`/my/devices`): show only if OD-10 allows; otherwise describe the rule in one sentence.

---

## 4. 15-minute demo (one teacher, often after a WhatsApp chat)
| Time | Scene | Click path | Talk track (Egyptian Arabic) | Ask |
|---|---|---|---|---|
| 0:00–1:00 | Open | — | «هوريك في ربع ساعة ٣ حاجات: شكل أكاديميتك، وإزاي الطالب يدفعلك وانت توافق، وإزاي تضيف مساعد. اللي هتشوفه محتوى تجريبي. ولو حاجة مش مناسبة ليك هقولك.» | «فيه حاجة معينة عايز تشوفها؟» |
| 1:00–3:30 | Your site | Student profile → `[demo academy]/ar` home → scroll courses → switch to `/` (EN) | «ده موقع الأكاديمية على نطاق فرعي من أطلس، اتعمل من لحظة ما الأكاديمية اتعملت. وكل صفحة ليها نسخة عربي وإنجليزي. ولو عندك دومين تقدر تربطه.» | «عندك دومين أصلًا؟» |
| 3:30–5:00 | Design and logo | Owner → `/dashboard/academy/:academyId/website` (الموقع) → design / brand settings → show the four designs and the palette from the demo logo | «تختار تصميم من أربعة، وترفع شعارك، والألوان بتطلع منه ويتأكد إن الكلام واضح.» | — |
| 5:00–10:00 | **Get paid** | Student → course page → buy → checkout `/my/courses/:courseId/checkout` → pick InstaPay → see the demo payment details → (already uploaded proof) → Owner → `/dashboard/academy/:academyId/payments` (المدفوعات) → open the under-review payment → check amount → **Approve** → Student → «دوراتي»: the course is now open | «الطالب بيختار من الطرق اللي انت ضفتها، ويشوف بياناتك، ويرفع صورة الإيصال. عندك هنا بيظهر قيد المراجعة. تفتحه، تتأكد من المبلغ، وتوافق. خلاص، اتسجل في الكورس ووصله إيميل. ولو الصورة مش واضحة، ترفض وتكتب السبب، وهو يرفع تاني.» Then, **always**: «الموافقة يدوية وبتعملها انت كصاحب الحساب، ومفيش دفع بالكارت أو عن طريق فوري دلوقتي. والفلوس بتروح لك على طول، ومن غير عمولة مننا على المدفوعات دي.» | «في الموسم، بتأكد كام دفعة في الأسبوع تقريبًا؟» |
| 10:00–12:00 | Your assistant | Owner → `/dashboard/academy/:academyId/members` (الأعضاء) → invite → role select shows **مدير / مدرّس** → assign a course to the instructor | «مساعدك بتضيفه بالإيميل. المدرّس بيشوف ويصحح الكورسات اللي انت محددها له بس. والموافقة على الدفع بتفضل معاك.» | «مين بيتابع الدفع عندك النهارده؟» |
| 12:00–13:30 | **Honest limits** | — (look at the buyer, not the screen) | «قبل ما تقرر، حاجات لازم تعرفها: مفيش تطبيق، الأكاديمية بتشتغل من متصفح الموبايل. الدروس فيديوهات يوتيوب بتتعرض جوه أكاديميتك، والطالب اللي مصمم يقدر ينسخ لينك يوتيوب نفسه. مفيش حصص مباشرة، ومفيش رسايل واتساب لأولياء الأمور.» | «فيه حاجة من دول توقفك؟» |
| 13:30–15:00 | Close | Open `/ar/pricing` | Recommend one plan from their numbers. «تقدر تبدأ تجربة ١٤ يوم من غير كارت النهارده، وأنا أتابع معاك على الواتساب، أو نحدد ميعاد نجهزها سوا.» | Agree one next step and a date |

## 5. 30-minute demo (teacher with assistants, or a team with several brands)
| Time | Scene | Click path | Talk track | Ask |
|---|---|---|---|---|
| 0:00–2:00 | Open + agenda | — | «النص ساعة دي: ٥ دقايق أفهم شغلك، وبعدين الموقع، والدفع، والفريق، والامتحانات والشهادات، وفي الآخر الحاجات اللي لسه مش موجودة والأسعار. المحتوى تجريبي.» | «مين كمان بياخد القرار معاك؟» |
| 2:00–7:00 | Discovery recap | — | Repeat back what you heard (discovery file §1, closing): «يعني عندك حوالي {عدد} طالب، و{عدد} مساعدين، والدفع فودافون كاش وإنستاباي، والمشكلة الأكبر {المشكلة}. صح كده؟» | Confirm the top problem |
| 7:00–10:00 | Your site | Student → `[demo academy]/ar` → EN `/` → Owner → onboarding preview `/onboarding/website` or website settings → designs + palette (SS-019) → page editor `/dashboard/academy/:academyId/website/pages` → preview mobile/desktop → publish state | «تصميم من أربعة، والألوان من شعارك، والصفحات من أقسام جاهزة بالعربي والإنجليزي. بتعاين على الموبايل والكمبيوتر وتنشر وقت ما تحب.» | «أنهي تصميم شبه براندك؟» |
| 10:00–16:00 | **Get paid** (as in the 15-min path) + payment methods | Owner → `/dashboard/academy/:academyId/payment-methods` (show the methods list) → Student checkout → proof → Owner payments → approve one, **reject one with a reason** → Student `/my/...` payments page shows the reason → Owner `/orders` list | Same talk track as §4, plus: «كل طلب وكل دفعة في قايمة واحدة بالإثبات والحالة. وبصراحة، الرسوم البيانية للإيرادات لسه مش بتحسب المدفوعات اليدوية، فالقايمة دي هي مرجعك.» + required payments line (D-2) | «مين اللي بيأكد التحويلات دلوقتي؟ لما يبقى انت بس اللي بتوافق، ده هيفرق معاك؟» |
| 16:00–19:00 | Your team | Members → invite manager and instructor → switch to the instructor's view (pre-logged second profile) → instructor sees only the assigned course and its grading | «المدير بيساعدك في إدارة الأكاديمية. المدرّس هنا مش شايف غير الكورس بتاعه. والموافقة على المدفوعات مع صاحب الحساب بس.» | «كام مساعد هيشتغل معاك في الموسم؟» |
| 19:00–22:00 | Quizzes, homework, certificates | Owner → `/dashboard/academy/:academyId/courses` (الدورات) → course → quiz builder → question-type list (five types; crop out any integrity settings) → a graded homework with feedback → Student `/my/certificates` → open `/verify/:code` (demo code) on the phone | «خمس أنواع أسئلة، واللي محتاج تصحيح منك بتصححه بإيدك. الواجب ليه ميعاد وسياسة تأخير وملاحظات. والشهادة ليها صفحة أي حد يقدر يفتحها ويتأكد.» | «بتدي شهادات النهارده؟» |
| 22:00–24:00 | Several academies (Organization leads only) | Top-bar academy switcher (SS-022) → open the second demo academy → its own site and payment methods | «كل براند أكاديمية ليها موقعها وطلابها وطرق دفعها، والحساب واحد. والطالب في أكاديمية مش بيظهر في التانية.» | «عندك كام براند أو مادة منفصلة؟» |
| 24:00–25:30 | Students | Registration setting (open / approval / invite) → student reports (progress, falling behind) → announcements `/dashboard/academy/:academyId/announcements` | «انت اللي بتحدد مين يدخل. والتقارير بتوريك مين بطّل يفتح. والإعلانات بالإيميل من جوه الأكاديمية.» (Device rule in one sentence only if OD-10 allows.) | — |
| 25:30–27:30 | **Honest limits** | Show `/ar/pricing#limits` | Read the list: no app; manual approval by the owner; no card or Fawry; lessons are YouTube videos and a determined student can copy the YouTube link; no live classes; no video uploads; no WhatsApp or SMS to parents; no self-service export; the team can't reset a student's devices. | «فيه حاجة من دول توقفك؟» |
| 27:30–30:00 | Plan + close | `/ar/pricing` | Recommend from `pricing-faq-and-calculator.md` §4. «السنوي بيوفّر تمن شهرين لو هتكمل السنة. وتقدر تبدأ تجربة ١٤ يوم من غير كارت، أو نجهزها معاك.» Agree who else must see it and the next date. | «إيه اللي محتاج تشوفه تاني علشان تقرر؟» |

## 6. After the demo
- Within the posted hours, send the recap (`outreach-sequences.md` W4) with: what they saw (2 workflows they cared about), the limits you discussed, the next step and date, and one link.
- Log the call in the CRM: stage "Demo held", objections heard, plan fit, next step.
- If they asked something not covered by the claims list, write it down and ask the owner; don't improvise in the recap.

**Claims used:** CL-01…25 as spoken above; D-1, D-2, D-3.
