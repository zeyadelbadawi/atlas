/**
 * Riwaq's Home section renderers (Reports/THEME_4_RIWAQ_PLAN.md §4). The
 * pack spreads `RIWAQ_SECTION_RENDERERS` into its `renderers`; a type
 * absent here falls back to its base renderer.
 */
import type { SectionRenderers } from '@/features/website/theme-packs/theme-pack.types';
import {
  RiwaqLogos,
  RiwaqMap,
  RiwaqResults,
  RiwaqSchedule,
} from './riwaq-trust-visit-sections';
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
import {
  RiwaqCountdown,
  RiwaqPricing,
  RiwaqVideo,
  RiwaqWhatsappBar,
} from './riwaq-engage-sections';
import {
  RiwaqCertificates,
  RiwaqDownloads,
  RiwaqTimeline,
  RiwaqVideoTestimonials,
} from './riwaq-journey-proof-sections';

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
  // CMS phase 3d (batch A).
  whatsappBar: RiwaqWhatsappBar,
  video: RiwaqVideo,
  pricing: RiwaqPricing,
  countdown: RiwaqCountdown,
  // CMS phase 3d.
  logos: RiwaqLogos,
  map: RiwaqMap,
  schedule: RiwaqSchedule,
  results: RiwaqResults,
  // CMS phase 3d (batch D).
  timeline: RiwaqTimeline,
  videoTestimonials: RiwaqVideoTestimonials,
  downloads: RiwaqDownloads,
  certificates: RiwaqCertificates,
};
