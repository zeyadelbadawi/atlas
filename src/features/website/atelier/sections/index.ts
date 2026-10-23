/**
 * Atelier's Home section renderers (Reports/THEME_2_ATELIER_PLAN.md §3,
 * §5a). The pack spreads `ATELIER_SECTION_RENDERERS` into its `renderers`;
 * a type absent here falls back to its base renderer.
 */
import type { SectionRenderers } from '@/features/website/theme-packs/theme-pack.types';
import { AtelierHero } from './AtelierHero';
import {
  AtelierAbout,
  AtelierCta,
  AtelierFeatureSplit,
  AtelierFeatures,
  AtelierGallery,
  AtelierSteps,
} from './atelier-content-sections';
import {
  AtelierCourseCategories,
  AtelierFeaturedCourses,
  AtelierInstructors,
  AtelierStatistics,
} from './atelier-live-sections';
import { AtelierTestimonials } from './AtelierTestimonials';
import { AtelierFaq } from './AtelierFaq';
import {
  AtelierCountdown,
  AtelierPricing,
  AtelierVideo,
  AtelierWhatsappBar,
} from './atelier-engage-sections';
import {
  AtelierCertificates,
  AtelierDownloads,
  AtelierTimeline,
  AtelierVideoTestimonials,
} from './atelier-journey-proof-sections';
import {
  AtelierLogos,
  AtelierMap,
  AtelierResults,
  AtelierSchedule,
} from './atelier-trust-visit-sections';

export {
  AtelierAbout,
  AtelierCourseCategories,
  AtelierCta,
  AtelierFaq,
  AtelierFeatureSplit,
  AtelierFeaturedCourses,
  AtelierFeatures,
  AtelierGallery,
  AtelierHero,
  AtelierInstructors,
  AtelierStatistics,
  AtelierSteps,
  AtelierTestimonials,
};

export const ATELIER_SECTION_RENDERERS: Partial<SectionRenderers> = {
  hero: AtelierHero,
  about: AtelierAbout,
  featureSplit: AtelierFeatureSplit,
  features: AtelierFeatures,
  steps: AtelierSteps,
  courseCategories: AtelierCourseCategories,
  featuredCourses: AtelierFeaturedCourses,
  // CMS phase 3d (batch A).
  whatsappBar: AtelierWhatsappBar,
  video: AtelierVideo,
  pricing: AtelierPricing,
  countdown: AtelierCountdown,
  instructors: AtelierInstructors,
  statistics: AtelierStatistics,
  testimonials: AtelierTestimonials,
  faq: AtelierFaq,
  cta: AtelierCta,
  gallery: AtelierGallery,
  // CMS phase 3d.
  logos: AtelierLogos,
  map: AtelierMap,
  schedule: AtelierSchedule,
  results: AtelierResults,
  // CMS phase 3d (batch D).
  timeline: AtelierTimeline,
  videoTestimonials: AtelierVideoTestimonials,
  downloads: AtelierDownloads,
  certificates: AtelierCertificates,
};
