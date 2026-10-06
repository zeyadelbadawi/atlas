/**
 * Manara's Home section renderers (Reports/THEME_3_MANARA_PLAN.md §3.10).
 * The pack spreads `MANARA_SECTION_RENDERERS` into its `renderers`; a type
 * absent here falls back to its base renderer.
 */
import type { SectionRenderers } from '@/features/website/theme-packs/theme-pack.types';
import { ManaraHero } from './ManaraHero';
import {
  ManaraAbout,
  ManaraCta,
  ManaraFeatureSplit,
  ManaraFeatures,
  ManaraGallery,
  ManaraSteps,
} from './manara-content-sections';
import {
  ManaraCourseCategories,
  ManaraFeaturedCourses,
  ManaraInstructors,
  ManaraStatistics,
} from './manara-live-sections';
import { ManaraTestimonials } from './ManaraTestimonials';
import { ManaraFaq } from './ManaraFaq';

export {
  ManaraAbout,
  ManaraCourseCategories,
  ManaraCta,
  ManaraFaq,
  ManaraFeatureSplit,
  ManaraFeaturedCourses,
  ManaraFeatures,
  ManaraGallery,
  ManaraHero,
  ManaraInstructors,
  ManaraStatistics,
  ManaraSteps,
  ManaraTestimonials,
};
export {
  ManaraLiveDataUnavailable,
  ManaraPreviewNote,
  ManaraPreviewSample,
} from './manara-section-utils';

export const MANARA_SECTION_RENDERERS: Partial<SectionRenderers> = {
  hero: ManaraHero,
  about: ManaraAbout,
  featureSplit: ManaraFeatureSplit,
  features: ManaraFeatures,
  steps: ManaraSteps,
  courseCategories: ManaraCourseCategories,
  featuredCourses: ManaraFeaturedCourses,
  instructors: ManaraInstructors,
  statistics: ManaraStatistics,
  testimonials: ManaraTestimonials,
  faq: ManaraFaq,
  cta: ManaraCta,
  gallery: ManaraGallery,
};
