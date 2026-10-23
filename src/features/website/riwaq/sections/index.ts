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
import { deferredSection } from '@/features/website/theme-packs/section-groups';

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
  whatsappBar: deferredSection('riwaq:engage', 'RiwaqWhatsappBar'),
  video: deferredSection('riwaq:engage', 'RiwaqVideo'),
  pricing: deferredSection('riwaq:engage', 'RiwaqPricing'),
  countdown: deferredSection('riwaq:engage', 'RiwaqCountdown'),
  // CMS phase 3d (batch C).
  interestForm: deferredSection('riwaq:enrol', 'RiwaqInterestForm'),
  announcementBar: deferredSection('riwaq:enrol', 'RiwaqAnnouncementBar'),
  comparison: deferredSection('riwaq:enrol', 'RiwaqComparison'),
  // CMS phase 3d.
  logos: deferredSection('riwaq:trust-visit', 'RiwaqLogos'),
  map: deferredSection('riwaq:trust-visit', 'RiwaqMap'),
  schedule: deferredSection('riwaq:trust-visit', 'RiwaqSchedule'),
  results: deferredSection('riwaq:trust-visit', 'RiwaqResults'),
  // CMS phase 3d (batch D).
  timeline: deferredSection('riwaq:journey-proof', 'RiwaqTimeline'),
  videoTestimonials: deferredSection(
    'riwaq:journey-proof',
    'RiwaqVideoTestimonials'
  ),
  downloads: deferredSection('riwaq:journey-proof', 'RiwaqDownloads'),
  certificates: deferredSection('riwaq:journey-proof', 'RiwaqCertificates'),
};
