/**
 * Theme 1 — Modern Education.
 *
 * - **Phase 4:** its own brand mapping (§F.5 — the canvas stays neutral
 *   and the brand fills only the defined slots), its visual system
 *   (`modern-education.css`) and its chrome (header, footer, auth frame).
 * - **Phase 5:** the Home renderers (§C.1 #1–11), plus the v1 `about`
 *   block existing Theme 1 Homes carry.
 *
 * A renderer serves its section type wherever it appears. Page heroes and
 * the inner-page compositions are Phase 6. Every other type keeps its base
 * renderer (`pack.renderers[type] ?? BASE_RENDERERS[type]`).
 */
import type { ThemePack } from '../theme-packs/theme-pack.types';
import './modern-education.css';
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
  },
  chrome: {
    Header: ModernEducationHeader,
    Footer: ModernEducationFooter,
    AuthFrame: ModernEducationAuthFrame,
  },
  mapBrandPalette: mapModernEducationBrandPalette,
};
