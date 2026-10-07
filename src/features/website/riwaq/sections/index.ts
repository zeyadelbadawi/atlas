/**
 * Riwaq's Home section renderers (Reports/THEME_4_RIWAQ_PLAN.md §4). The
 * pack spreads `RIWAQ_SECTION_RENDERERS` into its `renderers`; a type
 * absent here falls back to its base renderer.
 */
import type { SectionRenderers } from '@/features/website/theme-packs/theme-pack.types';
import { RiwaqHero } from './RiwaqHero';
import {
  RiwaqAbout,
  RiwaqCta,
  RiwaqFeatureSplit,
  RiwaqFeatures,
  RiwaqGallery,
  RiwaqSteps,
} from './riwaq-content-sections';
import {
  RiwaqCourseCategories,
  RiwaqFeaturedCourses,
  RiwaqInstructors,
  RiwaqStatistics,
} from './riwaq-live-sections';
import { RiwaqSpotlight } from './RiwaqSpotlight';
import { RiwaqTestimonials } from './RiwaqTestimonials';
import { RiwaqFaq } from './RiwaqFaq';

export {
  RiwaqAbout,
  RiwaqCourseCategories,
  RiwaqCta,
  RiwaqFaq,
  RiwaqFeatureSplit,
  RiwaqFeaturedCourses,
  RiwaqFeatures,
  RiwaqGallery,
  RiwaqHero,
  RiwaqInstructors,
  RiwaqSpotlight,
  RiwaqStatistics,
  RiwaqSteps,
  RiwaqTestimonials,
};

export const RIWAQ_SECTION_RENDERERS: Partial<SectionRenderers> = {
  hero: RiwaqHero,
  about: RiwaqAbout,
  features: RiwaqFeatures,
  courseCategories: RiwaqCourseCategories,
  featuredCourses: RiwaqFeaturedCourses,
  courseSpotlight: RiwaqSpotlight,
  steps: RiwaqSteps,
  featureSplit: RiwaqFeatureSplit,
  instructors: RiwaqInstructors,
  statistics: RiwaqStatistics,
  testimonials: RiwaqTestimonials,
  faq: RiwaqFaq,
  cta: RiwaqCta,
  gallery: RiwaqGallery,
};
