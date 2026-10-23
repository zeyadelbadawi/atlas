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
import { deferredSection } from '@/features/website/theme-packs/section-groups';

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
  whatsappBar: deferredSection('manara:engage', 'ManaraWhatsappBar'),
  video: deferredSection('manara:engage', 'ManaraVideo'),
  pricing: deferredSection('manara:engage', 'ManaraPricing'),
  countdown: deferredSection('manara:engage', 'ManaraCountdown'),
  // CMS phase 3d (batch C).
  interestForm: deferredSection('manara:enrol', 'ManaraInterestForm'),
  announcementBar: deferredSection('manara:enrol', 'ManaraAnnouncementBar'),
  comparison: deferredSection('manara:enrol', 'ManaraComparison'),
  // CMS phase 3d.
  logos: deferredSection('manara:trust-visit', 'ManaraLogos'),
  map: deferredSection('manara:trust-visit', 'ManaraMap'),
  schedule: deferredSection('manara:trust-visit', 'ManaraSchedule'),
  results: deferredSection('manara:trust-visit', 'ManaraResults'),
  // CMS phase 3d (batch D).
  timeline: deferredSection('manara:journey-proof', 'ManaraTimeline'),
  videoTestimonials: deferredSection(
    'manara:journey-proof',
    'ManaraVideoTestimonials'
  ),
  downloads: deferredSection('manara:journey-proof', 'ManaraDownloads'),
  certificates: deferredSection('manara:journey-proof', 'ManaraCertificates'),
};
