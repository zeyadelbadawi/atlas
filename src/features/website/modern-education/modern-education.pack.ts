/**
 * Theme 1 — Modern Education.
 *
 * - **Phase 4:** its own brand mapping (§F.5 — the canvas stays neutral
 *   and the brand fills only the defined slots), its visual system
 *   (`modern-education.css`) and its chrome (header, footer, auth frame).
 * - **Phase 5:** the Home renderers (§C.1 #1–11), plus the v1 `about`
 *   block existing Theme 1 Homes carry.
 * - **Phase 6:** the inner pages — page heroes (`pageHeader`), catalog,
 *   contact and gallery renderers; Course Details, "page not found" and
 *   Coming Soon pages; and a hero for existing pages that open without one.
 *
 * A renderer serves its section type wherever it appears; every type
 * Theme 1 doesn't redesign keeps its base renderer
 * (`pack.renderers[type] ?? BASE_RENDERERS[type]`).
 *
 * Its own chunk, loaded only where Theme 1 renders (`theme-pack.loader.ts`);
 * its CSS is `modern-education.css`, linked by `theme-stylesheets.ts`.
 */
import type { ThemePack } from '../theme-packs/theme-pack.types';
import { mapModernEducationBrandPalette } from './modern-education.brand-mapping';
import { ModernEducationHeader } from './ModernEducationHeader';
import { ModernEducationFooter } from './ModernEducationFooter';
import { ModernEducationAuthFrame } from './ModernEducationAuthFrame';
import { T1Hero } from './T1Hero';
import {
  T1About,
  T1Cta,
  T1FeatureSplit,
  T1Features,
  T1Steps,
} from './t1-content-sections';
import {
  T1CourseCategories,
  T1FeaturedCourses,
  T1Instructors,
  T1Statistics,
  T1Testimonials,
} from './t1-live-sections';
import { T1Faq } from './T1Faq';
import { T1PageHeader, T1PageIntro } from './T1PageHeader';
import { T1CourseCatalog } from './T1CourseCatalog';
import { T1Contact, T1Gallery } from './t1-page-sections';
import { T1CourseDetails } from './T1CourseDetails';
import { T1ComingSoon, T1NotFound } from './T1SystemPages';
import { MODERN_EDUCATION_ASSETS } from '../theme-assets/manifests/modern-education.manifest';
import { sectionGroup } from '../theme-packs/section-groups';

// This theme's phase 3d sections, a chunk per group, imported from the pack
// itself (`section-groups.tsx`).
const trustVisit = sectionGroup(
  'modern-education:trust-visit',
  () => import('./t1-trust-visit-sections')
);
const engage = sectionGroup(
  'modern-education:engage',
  () => import('./t1-engage-sections')
);
const enrol = sectionGroup(
  'modern-education:enrol',
  () => import('./t1-enrol-sections')
);
const journeyProof = sectionGroup(
  'modern-education:journey-proof',
  () => import('./t1-journey-proof-sections')
);
// CMS phase 3c: the custom section, a group of its own.
const custom = sectionGroup(
  'modern-education:custom',
  () => import('./t1-custom-section')
);

export const MODERN_EDUCATION_PACK: ThemePack = {
  key: 'modern-education',
  renderers: {
    hero: T1Hero,
    features: T1Features,
    courseCategories: T1CourseCategories,
    featuredCourses: T1FeaturedCourses,
    featureSplit: T1FeatureSplit,
    steps: T1Steps,
    instructors: T1Instructors,
    statistics: T1Statistics,
    testimonials: T1Testimonials,
    faq: T1Faq,
    cta: T1Cta,
    about: T1About,
    pageHeader: T1PageHeader,
    courseCatalog: T1CourseCatalog,
    contact: T1Contact,
    gallery: T1Gallery,
    // CMS phase 3d (batch A).
    whatsappBar: engage('T1WhatsappBar'),
    video: engage('T1Video'),
    pricing: engage('T1Pricing'),
    countdown: engage('T1Countdown'),
    // CMS phase 3d (batch C).
    interestForm: enrol('T1InterestForm'),
    announcementBar: enrol('T1AnnouncementBar'),
    comparison: enrol('T1Comparison'),
    // CMS phase 3d.
    logos: trustVisit('T1Logos'),
    map: trustVisit('T1Map'),
    schedule: trustVisit('T1Schedule'),
    results: trustVisit('T1Results'),
    // CMS phase 3d (batch D).
    timeline: journeyProof('T1Timeline'),
    videoTestimonials: journeyProof('T1VideoTestimonials'),
    downloads: journeyProof('T1Downloads'),
    certificates: journeyProof('T1Certificates'),
    // CMS phase 3c.
    custom: custom('T1Custom'),
  },
  pages: {
    PageIntro: T1PageIntro,
    CourseDetails: T1CourseDetails,
    NotFound: T1NotFound,
    ComingSoon: T1ComingSoon,
  },
  chrome: {
    Header: ModernEducationHeader,
    Footer: ModernEducationFooter,
    AuthFrame: ModernEducationAuthFrame,
  },
  mapBrandPalette: mapModernEducationBrandPalette,
  assets: MODERN_EDUCATION_ASSETS,
};
