/**
 * Section Metadata Registry.
 *
 * The catalog the "Add section" picker reads: display metadata plus a
 * default-config factory per `SectionType`. Deliberately separate from
 * the renderer-component map (`section-renderer.registry.ts`, alongside
 * the actual section components) so the Page Composer's picker UI never
 * needs to import 11 rendering components just to list their names.
 *
 * Adding a 12th section type means adding one entry here and one
 * component — never touching an existing section's entry.
 */
import {
  Award,
  BellRing,
  BookOpenCheck,
  ClipboardList,
  Table2,
  CalendarClock,
  Handshake,
  MapPin,
  Trophy,
  Columns2,
  Heading1,
  ListOrdered,
  Shapes,
  Contact as ContactIcon,
  Grid3x3,
  HelpCircle,
  Image as ImageIcon,
  LayoutGrid,
  LibraryBig,
  MessageSquareQuote,
  Megaphone,
  MessageCircle,
  PlayCircle,
  Sparkles,
  Tags,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { SectionConfigMap, SectionType } from '@types';
import { EMPTY_LOCALIZED_TEXT } from '../utils/localized-text.utils';
import {
  DEFAULT_COURSE_CATALOG_PAGE_SIZE,
  DEFAULT_COURSE_CATEGORIES_COUNT,
  DEFAULT_FEATURED_COURSES_COUNT,
  DEFAULT_INSTRUCTORS_COUNT,
  DEFAULT_SPOTLIGHT_MODULES,
} from '../constants/website.constants';

export interface SectionMetadataEntry {
  readonly type: SectionType;
  readonly labelKey: string;
  readonly icon: LucideIcon;
}

export const SECTION_METADATA: Record<SectionType, SectionMetadataEntry> = {
  hero: {
    type: 'hero',
    labelKey: 'website:sections.hero.label',
    icon: Sparkles,
  },
  about: {
    type: 'about',
    labelKey: 'website:sections.about.label',
    icon: LayoutGrid,
  },
  featuredCourses: {
    type: 'featuredCourses',
    labelKey: 'website:sections.featuredCourses.label',
    icon: Grid3x3,
  },
  statistics: {
    type: 'statistics',
    labelKey: 'website:sections.statistics.label',
    icon: Award,
  },
  features: {
    type: 'features',
    labelKey: 'website:sections.features.label',
    icon: Sparkles,
  },
  testimonials: {
    type: 'testimonials',
    labelKey: 'website:sections.testimonials.label',
    icon: MessageSquareQuote,
  },
  faq: {
    type: 'faq',
    labelKey: 'website:sections.faq.label',
    icon: HelpCircle,
  },
  cta: { type: 'cta', labelKey: 'website:sections.cta.label', icon: Megaphone },
  instructors: {
    type: 'instructors',
    labelKey: 'website:sections.instructors.label',
    icon: Users,
  },
  gallery: {
    type: 'gallery',
    labelKey: 'website:sections.gallery.label',
    icon: ImageIcon,
  },
  contact: {
    type: 'contact',
    labelKey: 'website:sections.contact.label',
    icon: ContactIcon,
  },
  courseCatalog: {
    type: 'courseCatalog',
    labelKey: 'website:sections.courseCatalog.label',
    icon: LibraryBig,
  },
  pageHeader: {
    type: 'pageHeader',
    labelKey: 'website:sections.pageHeader.label',
    icon: Heading1,
  },
  courseCategories: {
    type: 'courseCategories',
    labelKey: 'website:sections.courseCategories.label',
    icon: Shapes,
  },
  steps: {
    type: 'steps',
    labelKey: 'website:sections.steps.label',
    icon: ListOrdered,
  },
  featureSplit: {
    type: 'featureSplit',
    labelKey: 'website:sections.featureSplit.label',
    icon: Columns2,
  },
  courseSpotlight: {
    type: 'courseSpotlight',
    labelKey: 'website:sections.courseSpotlight.label',
    icon: BookOpenCheck,
  },
  logos: {
    type: 'logos',
    labelKey: 'website:sections.logos.label',
    icon: Handshake,
  },
  map: { type: 'map', labelKey: 'website:sections.map.label', icon: MapPin },
  schedule: {
    type: 'schedule',
    labelKey: 'website:sections.schedule.label',
    icon: CalendarClock,
  },
  results: {
    type: 'results',
    labelKey: 'website:sections.results.label',
    icon: Trophy,
  },
  whatsappBar: {
    type: 'whatsappBar',
    labelKey: 'website:sections.whatsappBar.label',
    icon: MessageCircle,
  },
  video: {
    type: 'video',
    labelKey: 'website:sections.video.label',
    icon: PlayCircle,
  },
  pricing: {
    type: 'pricing',
    labelKey: 'website:sections.pricing.label',
    icon: Tags,
  },
  countdown: {
    type: 'countdown',
    labelKey: 'website:sections.countdown.label',
    icon: Timer,
  },
  // CMS phase 3d (batch C).
  interestForm: {
    type: 'interestForm',
    labelKey: 'website:sections.interestForm.label',
    icon: ClipboardList,
  },
  announcementBar: {
    type: 'announcementBar',
    labelKey: 'website:sections.announcementBar.label',
    icon: BellRing,
  },
  comparison: {
    type: 'comparison',
    labelKey: 'website:sections.comparison.label',
    icon: Table2,
  },
};

/**
 * CMS phase 3d — starter rows and results. They are samples (`sample:
 * true`): shown labelled "Sample" in previews, never on the public site
 * (the API strips them and the renderers filter them), until the Owner
 * replaces them or marks each one real. A starter timetable or "top
 * student" must never pass for a real one.
 */
const SAMPLE_SCHEDULE_ROWS: SectionConfigMap['schedule']['items'] = [
  {
    id: 'sample-row-1',
    sample: true,
    day: 'sat',
    start: '16:00',
    end: '17:30',
    title: {
      en: 'Mathematics — Grade 9',
      ar: 'الرياضيات — الصف الثالث الإعدادي',
    },
    teacher: { en: 'Mr. Ahmed', ar: 'أ. أحمد' },
    location: { en: 'Hall 1', ar: 'القاعة ١' },
  },
  {
    id: 'sample-row-2',
    sample: true,
    day: 'mon',
    start: '18:00',
    end: '19:30',
    title: {
      en: 'Physics — Secondary 3',
      ar: 'الفيزياء — الصف الثالث الثانوي',
    },
    teacher: { en: 'Ms. Salma', ar: 'أ. سلمى' },
    location: { en: 'Online', ar: 'عبر الإنترنت' },
  },
  {
    id: 'sample-row-3',
    sample: true,
    day: 'wed',
    start: '16:00',
    end: '17:00',
    title: {
      en: 'Arabic — Grade 6',
      ar: 'اللغة العربية — الصف السادس الابتدائي',
    },
    teacher: { en: 'Mr. Ahmed', ar: 'أ. أحمد' },
    location: { en: 'Hall 2', ar: 'القاعة ٢' },
  },
];

const SAMPLE_RESULTS: SectionConfigMap['results']['items'] = [
  {
    id: 'sample-result-1',
    sample: true,
    top: true,
    studentName: 'Mariam A.',
    result: { en: '99.2%', ar: '٩٩٫٢٪' },
    detail: {
      en: 'Secondary school certificate, science',
      ar: 'الثانوية العامة، شعبة علمي علوم',
    },
  },
  {
    id: 'sample-result-2',
    sample: true,
    studentName: 'Omar K.',
    result: { en: 'First in the governorate', ar: 'الأول على المحافظة' },
    detail: { en: 'Preparatory certificate', ar: 'الشهادة الإعدادية' },
  },
  {
    id: 'sample-result-3',
    sample: true,
    studentName: 'Youssef H.',
    result: { en: '98%', ar: '٩٨٪' },
    detail: { en: 'Grade 6 final exams', ar: 'امتحانات الصف السادس الابتدائي' },
  },
];

/** Every registered section type's metadata, in the Page Composer's "Add section" display order. */
export function listSectionMetadata(
  order: readonly SectionType[]
): readonly SectionMetadataEntry[] {
  return order.map((type) => SECTION_METADATA[type]);
}

/** A safe, minimal default config for a newly-added section instance of the given type. */
export function getDefaultSectionConfig<TType extends SectionType>(
  type: TType
): SectionConfigMap[TType] {
  const defaults: SectionConfigMap = {
    hero: { title: EMPTY_LOCALIZED_TEXT },
    about: { title: EMPTY_LOCALIZED_TEXT, body: EMPTY_LOCALIZED_TEXT },
    featuredCourses: {
      title: EMPTY_LOCALIZED_TEXT,
      mode: 'latest',
      layout: 'grid',
      count: DEFAULT_FEATURED_COURSES_COUNT,
      showPrice: true,
      showInstructor: true,
    },
    statistics: { items: [] },
    features: { items: [] },
    testimonials: { items: [] },
    faq: { items: [] },
    cta: { title: EMPTY_LOCALIZED_TEXT, cta: { label: EMPTY_LOCALIZED_TEXT } },
    instructors: { count: DEFAULT_INSTRUCTORS_COUNT },
    gallery: { images: [] },
    contact: { showForm: true },
    courseCatalog: {
      title: EMPTY_LOCALIZED_TEXT,
      pageSize: DEFAULT_COURSE_CATALOG_PAGE_SIZE,
      defaultSort: 'newest',
      showSearch: true,
      showLevelFilter: true,
      showPricingFilter: true,
      showSort: true,
    },
    pageHeader: { title: EMPTY_LOCALIZED_TEXT },
    courseCategories: {
      maxItems: DEFAULT_COURSE_CATEGORIES_COUNT,
      showCounts: true,
    },
    steps: { items: [] },
    featureSplit: {
      title: EMPTY_LOCALIZED_TEXT,
      imagePosition: 'start',
      items: [],
    },
    courseSpotlight: {
      showOutcomes: true,
      showSyllabus: true,
      maxModules: DEFAULT_SPOTLIGHT_MODULES,
    },
    logos: {
      title: { en: 'Accreditations and partners', ar: 'الاعتمادات والشركاء' },
      description: {
        en: 'The organisations that accredit us and work with us.',
        ar: 'الجهات التي تعتمدنا ونتعاون معها.',
      },
      items: [],
    },
    map: {
      title: { en: 'Visit us', ar: 'زورونا' },
      address: EMPTY_LOCALIZED_TEXT,
    },
    schedule: {
      title: { en: 'Weekly class schedule', ar: 'جدول الحصص الأسبوعي' },
      description: {
        en: 'Find your group’s day and time.',
        ar: 'اعرف يوم مجموعتك وموعدها.',
      },
      items: SAMPLE_SCHEDULE_ROWS,
    },
    results: {
      title: { en: 'Our top students', ar: 'أوائلنا' },
      description: {
        en: 'Results our students achieved this year.',
        ar: 'نتائج حققها طلابنا هذا العام.',
      },
      items: SAMPLE_RESULTS,
    },
    ...phase3dStarterConfigs(),
    ...phase3dBatchCStarterConfigs(),
  };

  return defaults[type] as SectionConfigMap[TType];
}

/**
 * CMS phase 3d (batch A) — starter content in both languages, so a new
 * section arrives looking like itself. What only the Owner can know is left
 * empty, and the public site leaves it out until it is filled: the WhatsApp
 * and call numbers (the buttons stay hidden), the video (the section stays
 * hidden) and the deadline (the section stays hidden). Ids are fresh per
 * section, like an added item's.
 */
function phase3dStarterConfigs(): Pick<
  SectionConfigMap,
  'whatsappBar' | 'video' | 'pricing' | 'countdown'
> {
  const id = () => crypto.randomUUID();
  const feature = (en: string, ar: string, included: boolean) => ({
    id: id(),
    text: { en, ar },
    included,
  });
  return {
    whatsappBar: {
      title: { en: 'Questions? Talk to us', ar: 'لديك سؤال؟ تحدّث إلينا' },
      description: {
        en: 'Ask us about courses, schedules and prices.',
        ar: 'اسألنا عن الدورات والمواعيد والأسعار.',
      },
      cta: {
        label: { en: 'Chat on WhatsApp', ar: 'راسلنا على واتساب' },
        whatsapp: '',
      },
      secondaryCta: { label: { en: 'Call us', ar: 'اتصل بنا' }, phone: '' },
    },
    video: {
      title: { en: 'See a lesson in action', ar: 'شاهد درسًا من دروسنا' },
      description: {
        en: 'A short look at how we teach.',
        ar: 'نظرة قصيرة على طريقة تدريسنا.',
      },
      videoId: '',
    },
    pricing: {
      title: { en: 'Plans and prices', ar: 'الباقات والأسعار' },
      description: {
        en: 'Choose the plan that suits you.',
        ar: 'اختر الباقة التي تناسبك.',
      },
      plans: [
        {
          id: id(),
          name: { en: 'Monthly', ar: 'الباقة الشهرية' },
          price: { en: '450 EGP', ar: '450 ج.م' },
          period: { en: 'per month', ar: 'شهريًا' },
          description: {
            en: 'One subject, paid month by month.',
            ar: 'مادة واحدة تدفع اشتراكها شهرًا بشهر.',
          },
          features: [
            feature('A weekly live class', 'حصة مباشرة كل أسبوع', true),
            feature('Recorded lessons', 'دروس مسجّلة', true),
            feature('Printed notes', 'مذكرات مطبوعة', false),
          ],
          cta: {
            label: { en: 'Choose monthly', ar: 'اختر الشهرية' },
            authAction: 'signUp',
          },
        },
        {
          id: id(),
          name: { en: 'Full term', ar: 'باقة الترم' },
          price: { en: '1,200 EGP', ar: '1200 ج.م' },
          period: { en: 'per term', ar: 'للترم' },
          description: {
            en: 'Every lesson of the term, for less.',
            ar: 'كل دروس الترم بسعر أقل.',
          },
          features: [
            feature('A weekly live class', 'حصة مباشرة كل أسبوع', true),
            feature('Recorded lessons', 'دروس مسجّلة', true),
            feature('Printed notes', 'مذكرات مطبوعة', true),
          ],
          highlighted: true,
          badge: { en: 'Best value', ar: 'الأوفر' },
          cta: {
            label: { en: 'Choose the term', ar: 'اختر باقة الترم' },
            authAction: 'signUp',
          },
        },
      ],
    },
    countdown: {
      title: {
        en: 'Registration for the new term closes soon',
        ar: 'التسجيل في الترم الجديد يُغلق قريبًا',
      },
      description: {
        en: 'Book your seat before the deadline.',
        ar: 'احجز مقعدك قبل انتهاء الموعد.',
      },
      deadline: '',
      endedMessage: {
        en: 'Registration has closed. Message us to join the waiting list.',
        ar: 'أُغلق التسجيل. راسلنا للانضمام إلى قائمة الانتظار.',
      },
      cta: {
        label: { en: 'Book your seat', ar: 'احجز مقعدك' },
        authAction: 'signUp',
      },
    },
  };
}

/**
 * CMS phase 3d (batch C) — starter content in both languages. The interest
 * form starts with the three secondary grades as its choice (Egypt's most
 * common case; the Owner edits or hides the list), the notice strip with an
 * open-registration line and a sign-up button, and the comparison with
 * "Our academy" against "Studying alone". Ids are fresh per section.
 */
function phase3dBatchCStarterConfigs(): Pick<
  SectionConfigMap,
  'interestForm' | 'announcementBar' | 'comparison'
> {
  const id = () => crypto.randomUUID();
  const us = id();
  const alone = id();
  const row = (
    en: string,
    ar: string,
    cells: SectionConfigMap['comparison']['rows'][number]['cells']
  ) => ({ id: id(), label: { en, ar }, cells });
  return {
    interestForm: {
      title: { en: 'Register your interest', ar: 'سجّل اهتمامك' },
      description: {
        en: 'Leave your name and number and we will call you about the new term.',
        ar: 'اترك اسمك ورقمك وسنتصل بك بخصوص الترم الجديد.',
      },
      emailField: 'optional',
      choiceField: 'required',
      choiceLabel: { en: 'Grade', ar: 'الصف الدراسي' },
      options: [
        {
          id: id(),
          label: { en: 'First secondary', ar: 'الصف الأول الثانوي' },
        },
        {
          id: id(),
          label: { en: 'Second secondary', ar: 'الصف الثاني الثانوي' },
        },
        {
          id: id(),
          label: { en: 'Third secondary', ar: 'الصف الثالث الثانوي' },
        },
      ],
      messageField: 'hidden',
      submitLabel: { en: 'Send', ar: 'أرسل' },
      successMessage: {
        en: 'Thank you! We will call you soon.',
        ar: 'شكرًا لك! سنتصل بك قريبًا.',
      },
    },
    announcementBar: {
      text: {
        en: 'Registration for 2026/2027 is open',
        ar: 'التسجيل للعام الدراسي 2026/2027 مفتوح الآن',
      },
      tone: 'brand',
      cta: {
        label: { en: 'Register now', ar: 'سجّل الآن' },
        authAction: 'signUp',
      },
    },
    comparison: {
      title: {
        en: 'Our academy or studying alone?',
        ar: 'أكاديميتنا أم المذاكرة وحدك؟',
      },
      description: {
        en: 'What you get when you study with us.',
        ar: 'ما تحصل عليه عندما تدرس معنا.',
      },
      columns: [
        {
          id: us,
          label: { en: 'Our academy', ar: 'أكاديميتنا' },
          highlighted: true,
        },
        { id: alone, label: { en: 'Studying alone', ar: 'المذاكرة وحدك' } },
      ],
      rows: [
        row('Live classes with a teacher', 'حصص مباشرة مع مدرس', [
          { column: us, value: 'yes' },
          { column: alone, value: 'no' },
        ]),
        row('Answers to your questions', 'إجابات عن أسئلتك', [
          {
            column: us,
            value: 'text',
            text: { en: 'Same day', ar: 'في نفس اليوم' },
          },
          {
            column: alone,
            value: 'text',
            text: { en: 'Search alone', ar: 'تبحث وحدك' },
          },
        ]),
        row('Weekly tests and follow-up', 'اختبارات ومتابعة أسبوعية', [
          { column: us, value: 'yes' },
          { column: alone, value: 'no' },
        ]),
      ],
    },
  };
}
