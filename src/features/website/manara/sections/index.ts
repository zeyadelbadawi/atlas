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
import { sectionGroup } from '@/features/website/theme-packs/section-groups';

// This theme's phase 3d sections, a chunk per group, imported from the pack
// itself (`section-groups.tsx`).
const trustVisit = sectionGroup(
  'manara:trust-visit',
  () => import('./manara-trust-visit-sections')
);
const engage = sectionGroup(
  'manara:engage',
  () => import('./manara-engage-sections')
);
const enrol = sectionGroup(
  'manara:enrol',
  () => import('./manara-enrol-sections')
);
const journeyProof = sectionGroup(
  'manara:journey-proof',
  () => import('./manara-journey-proof-sections')
);

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
  // CMS phase 3d (batch A).
  whatsappBar: engage('ManaraWhatsappBar'),
  video: engage('ManaraVideo'),
  pricing: engage('ManaraPricing'),
  countdown: engage('ManaraCountdown'),
  // CMS phase 3d (batch C).
  interestForm: enrol('ManaraInterestForm'),
  announcementBar: enrol('ManaraAnnouncementBar'),
  comparison: enrol('ManaraComparison'),
  // CMS phase 3d.
  logos: trustVisit('ManaraLogos'),
  map: trustVisit('ManaraMap'),
  schedule: trustVisit('ManaraSchedule'),
  results: trustVisit('ManaraResults'),
  // CMS phase 3d (batch D).
  timeline: journeyProof('ManaraTimeline'),
  videoTestimonials: journeyProof('ManaraVideoTestimonials'),
  downloads: journeyProof('ManaraDownloads'),
  certificates: journeyProof('ManaraCertificates'),
};
