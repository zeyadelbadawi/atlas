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
  Sparkles,
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
  };

  return defaults[type] as SectionConfigMap[TType];
}
