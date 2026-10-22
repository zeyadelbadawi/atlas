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
  BookOpenCheck,
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
};

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
    ...phase3dStarterConfigs(),
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
