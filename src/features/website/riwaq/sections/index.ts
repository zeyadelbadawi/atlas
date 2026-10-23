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
import { sectionGroup } from '@/features/website/theme-packs/section-groups';

// This theme's phase 3d sections, a chunk per group, imported from the pack
// itself (`section-groups.tsx`).
const trustVisit = sectionGroup(
  'riwaq:trust-visit',
  () => import('./riwaq-trust-visit-sections')
);
const engage = sectionGroup(
  'riwaq:engage',
  () => import('./riwaq-engage-sections')
);
const enrol = sectionGroup(
  'riwaq:enrol',
  () => import('./riwaq-enrol-sections')
);
const journeyProof = sectionGroup(
  'riwaq:journey-proof',
  () => import('./riwaq-journey-proof-sections')
);

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
  whatsappBar: engage('RiwaqWhatsappBar'),
  video: engage('RiwaqVideo'),
  pricing: engage('RiwaqPricing'),
  countdown: engage('RiwaqCountdown'),
  // CMS phase 3d (batch C).
  interestForm: enrol('RiwaqInterestForm'),
  announcementBar: enrol('RiwaqAnnouncementBar'),
  comparison: enrol('RiwaqComparison'),
  // CMS phase 3d.
  logos: trustVisit('RiwaqLogos'),
  map: trustVisit('RiwaqMap'),
  schedule: trustVisit('RiwaqSchedule'),
  results: trustVisit('RiwaqResults'),
  // CMS phase 3d (batch D).
  timeline: journeyProof('RiwaqTimeline'),
  videoTestimonials: journeyProof('RiwaqVideoTestimonials'),
  downloads: journeyProof('RiwaqDownloads'),
  certificates: journeyProof('RiwaqCertificates'),
};
