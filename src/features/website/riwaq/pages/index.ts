/**
 * Riwaq inner pages (Reports/THEME_4_RIWAQ_PLAN.md §4): the pages a pack
 * may redesign (`RIWAQ_PAGES`) and the inner-page section renderers
 * (`RIWAQ_PAGE_RENDERERS`: the plate, the faceted catalogue and contact).
 */
import type {
  SectionRenderers,
  ThemePages,
} from '@/features/website/theme-packs/theme-pack.types';
import { RiwaqPageHeader, RiwaqPageIntro } from './RiwaqPageHeader';
import { RiwaqCourseCatalog } from './RiwaqCourseCatalog';
import { RiwaqContact } from './RiwaqContact';
import { RiwaqCourseDetails } from './RiwaqCourseDetails';
import { RiwaqComingSoon, RiwaqNotFound } from './RiwaqSystemPages';

export {
  RiwaqPageHeader,
  RiwaqPageIntro,
  RiwaqCourseCatalog,
  RiwaqContact,
  RiwaqCourseDetails,
  RiwaqComingSoon,
  RiwaqNotFound,
};
export { RiwaqCourseSheet, RiwaqCourseSheetSkeleton } from './RiwaqCourseSheet';

export const RIWAQ_PAGES: ThemePages = {
  PageIntro: RiwaqPageIntro,
  CourseDetails: RiwaqCourseDetails,
  NotFound: RiwaqNotFound,
  ComingSoon: RiwaqComingSoon,
};

export const RIWAQ_PAGE_RENDERERS: Partial<SectionRenderers> = {
  pageHeader: RiwaqPageHeader,
  courseCatalog: RiwaqCourseCatalog,
  contact: RiwaqContact,
};
