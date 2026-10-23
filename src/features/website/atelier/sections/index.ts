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
import { sectionGroup } from '@/features/website/theme-packs/section-groups';

// This theme's phase 3d sections, a chunk per group, imported from the pack
// itself (`section-groups.tsx`).
const trustVisit = sectionGroup(
  'atelier:trust-visit',
  () => import('./atelier-trust-visit-sections')
);
const engage = sectionGroup(
  'atelier:engage',
  () => import('./atelier-engage-sections')
);
const enrol = sectionGroup(
  'atelier:enrol',
  () => import('./atelier-enrol-sections')
);
const journeyProof = sectionGroup(
  'atelier:journey-proof',
  () => import('./atelier-journey-proof-sections')
);
// CMS phase 3c: the custom section, a group of its own.
const custom = sectionGroup(
  'atelier:custom',
  () => import('./atelier-custom-section')
);

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
  whatsappBar: engage('AtelierWhatsappBar'),
  video: engage('AtelierVideo'),
  pricing: engage('AtelierPricing'),
  countdown: engage('AtelierCountdown'),
  // CMS phase 3d (batch C).
  interestForm: enrol('AtelierInterestForm'),
  announcementBar: enrol('AtelierAnnouncementBar'),
  comparison: enrol('AtelierComparison'),
  instructors: AtelierInstructors,
  statistics: AtelierStatistics,
  testimonials: AtelierTestimonials,
  faq: AtelierFaq,
  cta: AtelierCta,
  gallery: AtelierGallery,
  // CMS phase 3d.
  logos: trustVisit('AtelierLogos'),
  map: trustVisit('AtelierMap'),
  schedule: trustVisit('AtelierSchedule'),
  results: trustVisit('AtelierResults'),
  // CMS phase 3d (batch D).
  timeline: journeyProof('AtelierTimeline'),
  videoTestimonials: journeyProof('AtelierVideoTestimonials'),
  downloads: journeyProof('AtelierDownloads'),
  certificates: journeyProof('AtelierCertificates'),
  // CMS phase 3c.
  custom: custom('AtelierCustom'),
};
