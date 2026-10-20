// FAQ library: two published entries, so the FAQ section editor's "From your
// content library" block has something to pick (it renders nothing when the
// library is empty) and the Content → FAQ tab shows a real list. Owner API
// calls only; idempotent through state.faqEntryIds.
import { state, save, call, attempt, signIn, log } from '../lib.mjs';
import { OWNER, PASSWORD } from '../data.mjs';

const t = (en, ar) => ({ en, ar });

const ENTRIES = [
  {
    question: t('How do I pay for a course?', 'أدفع تمن الكورس إزاي؟'),
    answer: t(
      'Open the course, choose Buy, pick bank transfer, wallet or InstaPay, then upload a photo of your receipt. We review it and open the course for you.',
      'افتح الكورس واختار شراء، وحدد تحويل بنكي أو محفظة أو إنستاباي، وبعدين ارفع صورة الإيصال. هنراجعه ونفتحلك الكورس.'
    ),
  },
  {
    question: t('Can I watch the lessons on my phone?', 'أقدر أتفرج على الدروس من الموبايل؟'),
    answer: t(
      'Yes. Sign in on the academy website from your phone’s browser and open My Learning.',
      'أيوه. ادخل على موقع الأكاديمية من متصفح الموبايل وافتح «تعلّمي».'
    ),
  },
];

export default async function run() {
  const A = state.academyId;
  state.faqEntryIds ??= [];
  if (state.faqEntryIds.length >= ENTRIES.length) return;
  const owner = await signIn(OWNER.email, PASSWORD);
  for (const entry of ENTRIES.slice(state.faqEntryIds.length)) {
    const created = await call('POST', `/academies/${A}/website/faq-entries`, { token: owner.token, body: entry });
    const id = created.json?.id;
    await attempt('publish faq entry', 'POST', `/academies/${A}/website/faq-entries/${id}/publish`, { token: owner.token });
    state.faqEntryIds.push(id);
    save();
  }
  log(`   FAQ library: ${state.faqEntryIds.length} published entries`);
}
