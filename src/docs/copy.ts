/**
 * Interface copy of the help center, per language. Article text lives in
 * content/docs/; this is only the chrome (header, search, footer, labels).
 * Arabic is simple Arabic with an Egyptian, friendly tone (DL-57 owner
 * decision), never a word-for-word translation.
 */
import type { Audience, DocLang } from './types';

export interface DocsCopy {
  readonly lang: DocLang;
  readonly locale: string;
  readonly brand: string;
  readonly brandShort: string;
  readonly homeTitle: string;
  readonly homeDescription: string;
  readonly skip: string;
  readonly search: {
    readonly label: string;
    readonly placeholder: string;
    readonly shortcut: string;
    readonly submit: string;
    readonly resultsTitle: string;
    readonly resultsFor: string;
    readonly noResults: string;
    readonly noResultsHint: string;
    readonly emptyHint: string;
    readonly loading: string;
    readonly open: string;
    readonly close: string;
    readonly count: { readonly one: string; readonly other: string };
  };
  readonly nav: {
    readonly backToAtlas: string;
    readonly signIn: string;
    /** Replaces "Sign in" when the `atlas_signed_in` hint cookie is set (client/auth-cta.ts). */
    readonly openDashboard: string;
    readonly startTrial: string;
    readonly browse: string;
    readonly topics: string;
    readonly breadcrumbs: string;
    readonly home: string;
    readonly onThisPage: string;
    readonly previous: string;
    readonly next: string;
    readonly inCategory: string;
    readonly allArticles: string;
    readonly mainMenu: string;
  };
  /** Full-screen notice shown while the header button navigates to the app. */
  readonly authOverlay: { readonly signedIn: string; readonly signedOut: string };
  readonly theme: { readonly label: string; readonly light: string; readonly dark: string; readonly system: string };
  readonly languageSwitch: { readonly label: string; readonly name: string };
  readonly article: {
    readonly updated: string;
    readonly forAudience: string;
    readonly related: string;
    readonly steps: { readonly one: string; readonly other: string };
    readonly copyLink: string;
    readonly linkCopied: string;
  };
  readonly helpful: { readonly question: string; readonly yes: string; readonly no: string; readonly thanks: string };
  readonly audience: Readonly<Record<Audience, string>>;
  readonly home: {
    readonly eyebrow: string;
    readonly title: string;
    readonly subtitle: string;
    readonly startHere: string;
    readonly allTopics: string;
    readonly popular: string;
    readonly articles: { readonly one: string; readonly other: string };
  };
  readonly contact: {
    readonly title: string;
    readonly body: string;
    readonly ticket: string;
    readonly contact: string;
  };
  readonly notFound: { readonly title: string; readonly body: string; readonly home: string };
  readonly footer: {
    readonly about: string;
    readonly topics: string;
    readonly atlas: string;
    readonly legal: string;
    readonly home: string;
    readonly pricing: string;
    readonly security: string;
    readonly contact: string;
    readonly privacy: string;
    readonly terms: string;
    readonly rights: string;
  };
}

export const DOCS_COPY: Readonly<Record<DocLang, DocsCopy>> = {
  en: {
    lang: 'en',
    locale: 'en-US',
    brand: 'Atlas Help Center',
    brandShort: 'Help',
    homeTitle: 'Atlas Help Center',
    homeDescription:
      'Step-by-step guides for running your academy on Atlas: courses, quizzes, your website, payments, learners and your account.',
    skip: 'Skip to content',
    search: {
      label: 'Search the help center',
      placeholder: 'Search for an answer…',
      shortcut: 'Press / to search',
      submit: 'Search',
      resultsTitle: 'Search the help center',
      resultsFor: 'Results for “{q}”',
      noResults: 'No articles match “{q}”.',
      noResultsHint: 'Try fewer or different words, or start from one of these:',
      emptyHint: 'Type a question or a word, for example “payment proof” or “custom domain”.',
      loading: 'Searching…',
      open: 'Open search',
      close: 'Close search',
      count: { one: '{count} result', other: '{count} results' },
    },
    nav: {
      backToAtlas: 'Back to Atlas',
      signIn: 'Sign in',
      openDashboard: 'Open dashboard',
      startTrial: 'Start your trial',
      browse: 'Browse topics',
      topics: 'Help topics',
      breadcrumbs: 'Breadcrumbs',
      home: 'Help Center',
      onThisPage: 'On this page',
      previous: 'Previous',
      next: 'Next',
      inCategory: 'In this topic',
      allArticles: 'All articles in this topic',
      mainMenu: 'Main menu',
    },
    authOverlay: { signedIn: 'Opening your dashboard…', signedOut: 'Opening the sign-in page…' },
    theme: { label: 'Theme', light: 'Light', dark: 'Dark', system: 'Use device setting' },
    languageSwitch: { label: 'اقرأ بالعربي', name: 'العربية' },
    article: {
      updated: 'Updated {date}',
      forAudience: 'For',
      related: 'Related articles',
      steps: { one: '{count} step', other: '{count} steps' },
      copyLink: 'Copy link to this section',
      linkCopied: 'Link copied',
    },
    helpful: {
      question: 'Was this article helpful?',
      yes: 'Yes',
      no: 'No',
      thanks: 'Thanks for telling us.',
    },
    audience: {
      owner: 'Owners',
      manager: 'Managers',
      instructor: 'Instructors',
      learner: 'Learners',
      everyone: 'Everyone',
    },
    home: {
      eyebrow: 'Atlas Help Center',
      title: 'How can we help?',
      subtitle: 'Clear, step-by-step answers with a screenshot for every step, in Arabic and English.',
      startHere: 'Start here',
      allTopics: 'All topics',
      popular: 'Popular articles',
      articles: { one: '{count} article', other: '{count} articles' },
    },
    contact: {
      title: 'Still need help?',
      body: 'Our team answers support tickets from inside your Atlas dashboard.',
      ticket: 'Open a support ticket',
      contact: 'Contact Atlas',
    },
    notFound: {
      title: 'We couldn’t find that page',
      body: 'The link may be old or mistyped. Search the help center or go back to the start.',
      home: 'Go to the Help Center',
    },
    footer: {
      about: 'Guides for running an online academy on Atlas, in Arabic and English.',
      topics: 'Help topics',
      atlas: 'Atlas',
      legal: 'Legal',
      home: 'Atlas home',
      pricing: 'Pricing',
      security: 'Security',
      contact: 'Contact',
      privacy: 'Privacy policy',
      terms: 'Terms',
      rights: '© {year} Atlas. All rights reserved.',
    },
  },
  ar: {
    lang: 'ar',
    locale: 'ar-EG',
    brand: 'مركز مساعدة أطلس',
    brandShort: 'المساعدة',
    homeTitle: 'مركز مساعدة أطلس',
    homeDescription:
      'شرح خطوة بخطوة لإدارة أكاديميتك على أطلس: الدورات والاختبارات والموقع والمدفوعات والمتعلمين وحسابك.',
    skip: 'انتقل للمحتوى',
    search: {
      label: 'ابحث في مركز المساعدة',
      placeholder: 'ابحث عن إجابة…',
      shortcut: 'اضغط / للبحث',
      submit: 'ابحث',
      resultsTitle: 'البحث في مركز المساعدة',
      resultsFor: 'نتايج «{q}»',
      noResults: 'مفيش مقالات مناسبة لـ «{q}».',
      noResultsHint: 'جرّب كلمات أقل أو مختلفة، أو ابدأ من هنا:',
      emptyHint: 'اكتب سؤالك أو كلمة، مثلًا «إثبات الدفع» أو «دومين خاص».',
      loading: 'بندوّر…',
      open: 'افتح البحث',
      close: 'اقفل البحث',
      count: { one: 'نتيجة واحدة', other: '{count} نتيجة' },
    },
    nav: {
      backToAtlas: 'رجوع لأطلس',
      signIn: 'تسجيل الدخول',
      openDashboard: 'افتح لوحة التحكم',
      startTrial: 'ابدأ الفترة التجريبية',
      browse: 'تصفّح الموضوعات',
      topics: 'موضوعات المساعدة',
      breadcrumbs: 'مسار الصفحة',
      home: 'مركز المساعدة',
      onThisPage: 'في الصفحة دي',
      previous: 'اللي قبلها',
      next: 'اللي بعدها',
      inCategory: 'في الموضوع ده',
      allArticles: 'كل مقالات الموضوع ده',
      mainMenu: 'القائمة الرئيسية',
    },
    authOverlay: { signedIn: 'بنفتحلك لوحة التحكم…', signedOut: 'بنفتحلك صفحة الدخول…' },
    theme: { label: 'المظهر', light: 'فاتح', dark: 'داكن', system: 'حسب إعداد الجهاز' },
    languageSwitch: { label: 'Read in English', name: 'English' },
    article: {
      updated: 'آخر تحديث {date}',
      forAudience: 'مناسبة لـ',
      related: 'مقالات ليها علاقة',
      steps: { one: 'خطوة واحدة', other: '{count} خطوات' },
      copyLink: 'انسخ رابط الجزء ده',
      linkCopied: 'اتنسخ الرابط',
    },
    helpful: {
      question: 'المقالة دي فادتك؟',
      yes: 'أيوه',
      no: 'لأ',
      thanks: 'شكرًا إنك قلت لنا.',
    },
    audience: {
      owner: 'ملاك الأكاديميات',
      manager: 'المديرين',
      instructor: 'المدرّبين',
      learner: 'المتعلمين',
      everyone: 'الكل',
    },
    home: {
      eyebrow: 'مركز مساعدة أطلس',
      title: 'محتاج مساعدة في إيه؟',
      subtitle: 'إجابات واضحة خطوة بخطوة، ومع كل خطوة صورة من الشاشة، بالعربي والإنجليزي.',
      startHere: 'ابدأ من هنا',
      allTopics: 'كل الموضوعات',
      popular: 'مقالات بيقرأها الناس كتير',
      articles: { one: 'مقالة واحدة', other: '{count} مقالة' },
    },
    contact: {
      title: 'لسه محتاج مساعدة؟',
      body: 'فريقنا بيرد على تذاكر الدعم من جوه لوحة التحكم بتاعتك في أطلس.',
      ticket: 'افتح تذكرة دعم',
      contact: 'تواصل مع أطلس',
    },
    notFound: {
      title: 'مش لاقيين الصفحة دي',
      body: 'ممكن يكون الرابط قديم أو فيه غلطة. دوّر في مركز المساعدة أو ارجع للبداية.',
      home: 'روح لمركز المساعدة',
    },
    footer: {
      about: 'شرح إدارة أكاديمية أونلاين على أطلس، بالعربي والإنجليزي.',
      topics: 'موضوعات المساعدة',
      atlas: 'أطلس',
      legal: 'قانوني',
      home: 'الصفحة الرئيسية لأطلس',
      pricing: 'الأسعار',
      security: 'الأمان',
      contact: 'تواصل معنا',
      privacy: 'سياسة الخصوصية',
      terms: 'الشروط',
      rights: '© {year} أطلس. كل الحقوق محفوظة.',
    },
  },
};

export function fmt(text: string, values: Readonly<Record<string, string | number>>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

export function formatCount(lang: DocLang, forms: { one: string; other: string }, count: number): string {
  const n = new Intl.NumberFormat(DOCS_COPY[lang].locale).format(count);
  // Arabic 3–10 takes the plural noun ("٥ خطوات"); 11+ the singular ("١٢ خطوة").
  if (lang === 'ar') {
    if (count === 1) return forms.one;
    if (forms === DOCS_COPY.ar.article.steps && count >= 11) return `${n} خطوة`;
    if (forms === DOCS_COPY.ar.home.articles && count >= 3 && count <= 10) return `${n} مقالات`;
    return fmt(forms.other, { count: n });
  }
  return fmt(count === 1 ? forms.one : forms.other, { count: n });
}

export function formatDocDate(lang: DocLang, iso: string): string {
  return new Intl.DateTimeFormat(DOCS_COPY[lang].locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
