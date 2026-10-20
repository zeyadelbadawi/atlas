/**
 * Help center categories (DL-57), in display order. The folder name of an
 * article (`content/docs/<lang>/<category>/…`) must be one of these ids;
 * the id is also the URL segment (`/selling/…`, `/ar/selling/…`).
 *
 * Live classes have no category yet: every page in it is deferred (CF-15).
 */
import type { DocCategory } from './types';

export const DOC_CATEGORIES: readonly DocCategory[] = [
  {
    id: 'getting-started',
    order: 1,
    icon: 'rocket',
    featured: true,
    title: { en: 'Getting started', ar: 'البداية مع أطلس' },
    description: {
      en: 'Create your account, set up your academy and get ready to launch.',
      ar: 'اعمل حسابك، جهّز أكاديميتك، واستعد للإطلاق.',
    },
  },
  {
    id: 'roles',
    order: 2,
    icon: 'users-round',
    featured: true,
    title: { en: 'Guides by role', ar: 'أدلة حسب دورك' },
    description: {
      en: 'What owners, managers, instructors and learners can do.',
      ar: 'إيه اللي يقدر يعمله المالك والمدير والمدرّب والمتعلم.',
    },
  },
  {
    id: 'tasks',
    order: 3,
    icon: 'list-checks',
    featured: true,
    title: { en: 'Common tasks', ar: 'مهام شائعة' },
    description: {
      en: 'Step-by-step paths for the jobs you do most.',
      ar: 'خطوات واضحة للحاجات اللي بتعملها كتير.',
    },
  },
  {
    id: 'academy',
    order: 4,
    icon: 'building-2',
    title: { en: 'Academy settings', ar: 'إعدادات الأكاديمية' },
    description: {
      en: 'Profile, language, brand, web address and your own domain.',
      ar: 'البيانات، اللغة، الهوية، عنوان الموقع ودومينك الخاص.',
    },
  },
  {
    id: 'website',
    order: 5,
    icon: 'layout-template',
    title: { en: 'Website builder', ar: 'منشئ الموقع' },
    description: {
      en: 'Themes, pages, sections, publishing and SEO for your academy site.',
      ar: 'القوالب والصفحات والأقسام والنشر وتحسين الظهور لموقع أكاديميتك.',
    },
  },
  {
    id: 'courses',
    order: 6,
    icon: 'book-open',
    title: { en: 'Courses, quizzes and certificates', ar: 'الدورات والاختبارات والشهادات' },
    description: {
      en: 'Build courses, add lessons and quizzes, and issue certificates.',
      ar: 'ابنِ دوراتك، ضيف الدروس والاختبارات، واصدر الشهادات.',
    },
  },
  {
    id: 'for-learners',
    order: 7,
    icon: 'graduation-cap',
    title: { en: 'For learners', ar: 'للمتعلمين' },
    description: {
      en: 'Join an academy, take courses and quizzes, and get your certificate.',
      ar: 'انضم لأكاديمية، اتعلم، حل الاختبارات، وخد شهادتك.',
    },
  },
  {
    id: 'protection',
    order: 8,
    icon: 'shield-check',
    title: { en: 'Content protection and media', ar: 'حماية المحتوى والوسائط' },
    description: {
      en: 'Device limits, the forensic watermark, and what protection can and cannot do.',
      ar: 'حدود الأجهزة والعلامة المائية، وإيه اللي الحماية تقدر وماتقدرش تعمله.',
    },
  },
  {
    id: 'selling',
    order: 9,
    icon: 'wallet',
    title: { en: 'Selling and payments', ar: 'البيع والمدفوعات' },
    description: {
      en: 'Bank transfer, e-wallets and InstaPay, payment proofs, orders and refunds.',
      ar: 'التحويل البنكي والمحافظ وإنستاباي، إثباتات الدفع، الطلبات والاسترداد.',
    },
  },
  {
    id: 'billing',
    order: 10,
    icon: 'receipt',
    title: { en: 'Your Atlas subscription', ar: 'اشتراكك في أطلس' },
    description: {
      en: 'The trial, paying for your plan, renewing, changing plans and usage.',
      ar: 'الفترة التجريبية، دفع خطتك، التجديد، تغيير الخطة والاستهلاك.',
    },
  },
  {
    id: 'team',
    order: 11,
    icon: 'user-plus',
    title: { en: 'Team and learners', ar: 'الفريق والمتعلمين' },
    description: {
      en: 'Add managers and instructors, invite and approve learners, manage enrollments.',
      ar: 'ضيف مديرين ومدرّبين، ادعُ المتعلمين ووافق عليهم، وأدِر التسجيلات.',
    },
  },
  {
    id: 'account',
    order: 12,
    icon: 'circle-user',
    title: { en: 'Account and sign-in', ar: 'الحساب وتسجيل الدخول' },
    description: {
      en: 'Signing in, passwords, sign-in codes, two-step verification and your profile.',
      ar: 'تسجيل الدخول، كلمة السر، أكواد الدخول، التحقق بخطوتين وملفك الشخصي.',
    },
  },
  {
    id: 'notifications',
    order: 13,
    icon: 'bell',
    title: { en: 'Notifications and messages', ar: 'الإشعارات والرسائل' },
    description: {
      en: 'Notifications, email preferences, messages and announcements.',
      ar: 'الإشعارات، تفضيلات البريد، الرسائل والإعلانات.',
    },
  },
  {
    id: 'support',
    order: 14,
    icon: 'life-buoy',
    title: { en: 'Getting help', ar: 'طلب المساعدة' },
    description: {
      en: 'Open a support ticket, request a service and help your learners.',
      ar: 'افتح تذكرة دعم، اطلب خدمة، وساعد متعلمينك.',
    },
  },
  {
    id: 'analytics',
    order: 15,
    icon: 'chart-column',
    title: { en: 'Analytics and reports', ar: 'التحليلات والتقارير' },
    description: {
      en: 'Dashboards, learner progress, reports and the activity log.',
      ar: 'لوحات المتابعة، تقدم المتعلمين، التقارير وسجل النشاط.',
    },
  },
  {
    id: 'security',
    order: 16,
    icon: 'lock',
    title: { en: 'Security and privacy', ar: 'الأمان والخصوصية' },
    description: {
      en: 'How Atlas separates academies, protects accounts and handles learner data.',
      ar: 'إزاي أطلس بيفصل الأكاديميات، بيحمي الحسابات، وبيتعامل مع بيانات المتعلمين.',
    },
  },
  {
    id: 'reference',
    order: 17,
    icon: 'book-marked',
    title: { en: 'Reference', ar: 'مراجع' },
    description: {
      en: 'Plan limits, file sizes, DNS records, URLs, emails and what is new.',
      ar: 'حدود الخطط، أحجام الملفات، سجلات DNS، العناوين، الرسائل والجديد.',
    },
  },
  {
    id: 'troubleshooting',
    order: 18,
    icon: 'wrench',
    title: { en: 'Troubleshooting', ar: 'حل المشاكل' },
    description: {
      en: 'Fixes for sign-in, devices, lessons, domains, payments and more.',
      ar: 'حلول لمشاكل الدخول والأجهزة والدروس والدومين والمدفوعات وغيرها.',
    },
  },
  {
    id: 'faq',
    order: 19,
    icon: 'circle-help',
    title: { en: 'FAQ and glossary', ar: 'أسئلة شائعة ومصطلحات' },
    description: {
      en: 'Short answers to common questions, and the words Atlas uses.',
      ar: 'إجابات سريعة على الأسئلة الشائعة، ومعاني الكلمات اللي أطلس بيستخدمها.',
    },
  },
];

const BY_ID = new Map(DOC_CATEGORIES.map((c) => [c.id, c]));

export function categoryById(id: string): DocCategory | undefined {
  return BY_ID.get(id);
}
