/**
 * The holding page's copy, English and Arabic (owner decision D6).
 *
 * Kept beside the page instead of in the shared translation namespaces so
 * the page is self-contained: it renders in the language its URL names
 * (`/` English, `/ar` Arabic) whatever language the visitor last chose in
 * the app, and the replacement site (B1, behind `ATLAS_MARKETING_STATIC`)
 * removes it by deleting this folder and its two routes.
 *
 * Deliberately one factual sentence and four destinations. No sign-up
 * call to action, no prices or plans, no feature list, no testimonials,
 * metrics, logos or claims, and never "free" / «مجاني» —
 * `holding-page.test.tsx` fails if any of that comes back.
 */

export type HoldingPageLocale = 'en' | 'ar';

export interface HoldingPageCopy {
  readonly direction: 'ltr' | 'rtl';
  /** The product's name in this language, as the app writes it. */
  readonly productName: string;
  readonly sentence: string;
  readonly signIn: string;
  readonly contact: string;
  readonly privacyPolicy: string;
  readonly terms: string;
  /** Accessible name of the page's links. */
  readonly linksLabel: string;
  /** Accessible name of the legal links. */
  readonly legalLabel: string;
  /** The other language, named in its own script. */
  readonly otherLanguageName: string;
}

export const HOLDING_PAGE_COPY: Readonly<
  Record<HoldingPageLocale, HoldingPageCopy>
> = {
  en: {
    direction: 'ltr',
    productName: 'Atlas',
    sentence:
      'Atlas is a platform for running an online academy. Our new website is being prepared.',
    signIn: 'Sign in',
    contact: 'Contact',
    privacyPolicy: 'Privacy Policy',
    terms: 'Terms of Service',
    linksLabel: 'Atlas',
    legalLabel: 'Legal',
    otherLanguageName: 'العربية',
  },
  ar: {
    direction: 'rtl',
    productName: 'أطلس',
    // Needs a native Arabic review before release (D6 report).
    sentence:
      'أطلس منصة لإدارة أكاديمية عبر الإنترنت. نعمل حاليًا على إعداد موقعنا الجديد.',
    signIn: 'تسجيل الدخول',
    contact: 'تواصل معنا',
    privacyPolicy: 'سياسة الخصوصية',
    terms: 'شروط الخدمة',
    linksLabel: 'أطلس',
    legalLabel: 'الشؤون القانونية',
    otherLanguageName: 'English',
  },
};
