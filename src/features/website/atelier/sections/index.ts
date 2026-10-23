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
import { deferredSection } from '@/features/website/theme-packs/section-groups';

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
  whatsappBar: deferredSection('atelier:engage', 'AtelierWhatsappBar'),
  video: deferredSection('atelier:engage', 'AtelierVideo'),
  pricing: deferredSection('atelier:engage', 'AtelierPricing'),
  countdown: deferredSection('atelier:engage', 'AtelierCountdown'),
  // CMS phase 3d (batch C).
  interestForm: deferredSection('atelier:enrol', 'AtelierInterestForm'),
  announcementBar: deferredSection('atelier:enrol', 'AtelierAnnouncementBar'),
  comparison: deferredSection('atelier:enrol', 'AtelierComparison'),
  instructors: AtelierInstructors,
  statistics: AtelierStatistics,
  testimonials: AtelierTestimonials,
  faq: AtelierFaq,
  cta: AtelierCta,
  gallery: AtelierGallery,
  // CMS phase 3d.
  logos: deferredSection('atelier:trust-visit', 'AtelierLogos'),
  map: deferredSection('atelier:trust-visit', 'AtelierMap'),
  schedule: deferredSection('atelier:trust-visit', 'AtelierSchedule'),
  results: deferredSection('atelier:trust-visit', 'AtelierResults'),
  // CMS phase 3d (batch D).
  timeline: deferredSection('atelier:journey-proof', 'AtelierTimeline'),
  videoTestimonials: deferredSection(
    'atelier:journey-proof',
    'AtelierVideoTestimonials'
  ),
  downloads: deferredSection('atelier:journey-proof', 'AtelierDownloads'),
  certificates: deferredSection('atelier:journey-proof', 'AtelierCertificates'),
};
