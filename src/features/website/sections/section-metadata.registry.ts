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
  Contact as ContactIcon,
  Grid3x3,
  HelpCircle,
  Image as ImageIcon,
  LayoutGrid,
  MessageSquareQuote,
  Megaphone,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { SectionConfigMap, SectionType } from '@types';
import { DEFAULT_FEATURED_COURSES_COUNT, DEFAULT_INSTRUCTORS_COUNT } from '../constants/website.constants';

export interface SectionMetadataEntry {
  readonly type: SectionType;
  readonly labelKey: string;
  readonly icon: LucideIcon;
}

export const SECTION_METADATA: Record<SectionType, SectionMetadataEntry> = {
  hero: { type: 'hero', labelKey: 'website:sections.hero.label', icon: Sparkles },
  about: { type: 'about', labelKey: 'website:sections.about.label', icon: LayoutGrid },
  featuredCourses: {
    type: 'featuredCourses',
    labelKey: 'website:sections.featuredCourses.label',
    icon: Grid3x3,
  },
  statistics: { type: 'statistics', labelKey: 'website:sections.statistics.label', icon: Award },
  features: { type: 'features', labelKey: 'website:sections.features.label', icon: Sparkles },
  testimonials: {
    type: 'testimonials',
    labelKey: 'website:sections.testimonials.label',
    icon: MessageSquareQuote,
  },
  faq: { type: 'faq', labelKey: 'website:sections.faq.label', icon: HelpCircle },
  cta: { type: 'cta', labelKey: 'website:sections.cta.label', icon: Megaphone },
  instructors: { type: 'instructors', labelKey: 'website:sections.instructors.label', icon: Users },
  gallery: { type: 'gallery', labelKey: 'website:sections.gallery.label', icon: ImageIcon },
  contact: { type: 'contact', labelKey: 'website:sections.contact.label', icon: ContactIcon },
};

/** Every registered section type's metadata, in the Page Composer's "Add section" display order. */
export function listSectionMetadata(order: readonly SectionType[]): readonly SectionMetadataEntry[] {
  return order.map((type) => SECTION_METADATA[type]);
}

/** A safe, minimal default config for a newly-added section instance of the given type. */
export function getDefaultSectionConfig<TType extends SectionType>(
  type: TType
): SectionConfigMap[TType] {
  const defaults: SectionConfigMap = {
    hero: { title: '' },
    about: { title: '', body: '' },
    featuredCourses: {
      title: '',
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
    cta: { title: '', cta: { label: '' } },
    instructors: { count: DEFAULT_INSTRUCTORS_COUNT },
    gallery: { images: [] },
    contact: { showForm: true },
  };

  return defaults[type] as SectionConfigMap[TType];
}
