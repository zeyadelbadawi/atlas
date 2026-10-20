// The academy website on the default theme: the theme's sample copy is
// replaced with the demo academy's own (bilingual) copy through the page
// API, sections that would show testimonials or statistics are removed
// (rule XA-07: no testimonials, reviews/ratings or student counts on public
// pages), the site is published, and two visitors use the contact form.
import { state, save, call, attempt, signIn, clearLimits, log } from '../lib.mjs';
import { OWNER, PASSWORD, ACADEMY, CONTACT_MESSAGES } from '../data.mjs';

const t = (en, ar) => ({ en, ar });
const REMOVED = new Set(['testimonials', 'statistics', 'courseCategories']);

/** The Arabic side names the academy in Arabic. */
function arabicName(node) {
  if (Array.isArray(node)) return node.map(arabicName);
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [k, k === 'ar' && typeof v === 'string' ? v.split(ACADEMY.name.en).join(ACADEMY.name.ar) : arabicName(v)])
    );
  }
  return node;
}

const HOME = {
  hero: (c) => ({
    ...c,
    eyebrow: t('Secondary school · Math, study skills & English', 'ثانوي · رياضيات ومهارات مذاكرة وإنجليزي'),
    title: t('Understand every lesson, step by step', 'افهم كل درس، خطوة بخطوة'),
    highlight: t('step by step', 'خطوة بخطوة'),
    description: t(
      'Short video lessons, worksheets and a quiz after every unit — then pay the way that suits you: bank transfer, wallet or InstaPay.',
      'دروس فيديو قصيرة وأوراق تدريب واختبار بعد كل وحدة — وادفع بالطريقة اللي تناسبك: تحويل بنكي أو محفظة أو إنستاباي.'
    ),
    // Same ids as the theme's sample highlights, demo labels.
    ...(Array.isArray(c.highlights)
      ? {
          highlights: c.highlights.map((h, i) => ({
            ...h,
            label: [t('Explained step by step', 'شرح خطوة بخطوة'), t('A quiz after every unit', 'اختبار بعد كل وحدة'), t('Pay by InstaPay or wallet', 'ادفع بإنستاباي أو المحفظة')][i % 3],
          })),
        }
      : {}),
  }),
  features: (c) => ({
    ...c,
    items: [
      { id: 'feature-video', icon: 'Video', title: t('Short video lessons', 'دروس فيديو قصيرة'), description: t('Each idea in its own lesson, so you can rewatch exactly what you need.', 'كل فكرة في درس لوحدها، فتقدر تعيد اللي محتاجه بالظبط.') },
      { id: 'feature-quiz', icon: 'Award', title: t('A quiz after every unit', 'اختبار بعد كل وحدة'), description: t('Check what you understood before you move on.', 'اتأكد إنك فهمت قبل ما تكمّل.') },
      { id: 'feature-pay', icon: 'ShieldCheck', title: t('Pay your way', 'ادفع بطريقتك'), description: t('Bank transfer, e-wallet or InstaPay — upload the receipt and start.', 'تحويل بنكي أو محفظة أو إنستاباي — ارفع الإيصال وابدأ.') },
    ],
  }),
  featuredCourses: (c) => ({ ...c, title: t('Our courses', 'كورساتنا'), description: t('Start with the free study-skills course, then pick your subject.', 'ابدأ بكورس مهارات المذاكرة المجاني، وبعدين اختار مادتك.') }),
  featureSplit: (c) => ({
    ...c,
    title: t('Learn at your own pace', 'اتعلّم على راحتك'),
    items: [
      { id: 'benefit-units', title: t('Clear units', 'وحدات واضحة'), description: t('Every course is split into short units with a worksheet.', 'كل كورس مقسّم لوحدات قصيرة معاها ورقة تدريب.') },
      { id: 'benefit-feedback', title: t('Feedback on your work', 'تعليق على شغلك'), description: t('Your teacher reviews essays and problem sets.', 'المدرّس بيراجع إجاباتك المقالية وواجباتك.') },
    ],
  }),
  instructors: (c) => ({ ...c, title: t('Meet your teachers', 'تعرّف على المدرّسين'), description: t('The people who teach at Al-Nour Academy.', 'المدرّسين اللي بيشرحوا في أكاديمية النور.') }),
  cta: (c) => ({ ...c, title: t('Start with a free course today', 'ابدأ بكورس مجاني النهارده'), description: t('Create your account in a minute and open your first lesson.', 'اعمل حسابك في دقيقة وافتح أول درس.') }),
};

export default async function run() {
  const A = state.academyId;
  const o = await signIn(OWNER.email, PASSWORD);
  const pages = (await call('GET', `/academies/${A}/website/pages`, { token: o.token })).json;
  const items = pages.items ?? pages;
  state.pages = {};
  for (const summary of items) {
    state.pages[summary.coreType ?? summary.slug] = summary.id;
    const page = (await call('GET', `/academies/${A}/website/pages/${summary.id}`, { token: o.token })).json;
    let sections = arabicName(page.sections).filter((s) => !REMOVED.has(s.type));
    if (page.coreType === 'home') sections = sections.map((s) => (HOME[s.type] ? { ...s, config: HOME[s.type](s.config ?? {}) } : s));
    if (JSON.stringify(sections) === JSON.stringify(page.sections)) continue;
    await attempt(`page ${page.coreType}`, 'PATCH', `/academies/${A}/website/pages/${summary.id}`, {
      token: o.token,
      body: { sections, ...(page.version ? { expectedVersion: page.version } : {}) },
    });
  }
  state.homePageId = state.pages.home;
  state.pageId = state.pages.home;
  state.aboutPageId = state.pages.about;
  save();
  const pub = await attempt('website publish', 'POST', `/academies/${A}/website/publish`, { token: o.token });
  log('website publish', pub.status);

  if (!state.contactSubmitted) {
    for (const msg of CONTACT_MESSAGES) {
      clearLimits();
      await attempt('contact message', 'POST', `/public/websites/${A}/contact`, { body: msg });
    }
    state.contactSubmitted = true;
    save();
  }

  // The owner has finished the guided setup (otherwise /dashboard redirects to /onboarding).
  // Its required steps (academy, payment methods, a course, the website) are done by now.
  const ob = await attempt('onboarding complete', 'POST', `/organizations/${state.organizationId}/onboarding/complete`, {
    token: o.token,
    body: { mode: 'finish' },
  });
  if (ob.status >= 300) log('onboarding steps', JSON.stringify((await call('GET', `/organizations/${state.organizationId}/onboarding`, { token: o.token, ok: false })).json).slice(0, 600));
}
