/**
 * Atelier inner pages (Reports/THEME_2_ATELIER_PLAN.md §5a): the pages a
 * pack may redesign (`ATELIER_PAGES`) and the inner-page section renderers
 * (`ATELIER_PAGE_RENDERERS`: the masthead, the catalog and the letter).
 */
import type {
  SectionRenderers,
  ThemePages,
} from '@/features/website/theme-packs/theme-pack.types';
import { AtelierPageHeader, AtelierPageIntro } from './AtelierPageHeader';
import { AtelierCourseCatalog } from './AtelierCourseCatalog';
import { AtelierContact } from './AtelierContact';
import { AtelierCourseDetails } from './AtelierCourseDetails';
import { AtelierComingSoon, AtelierNotFound } from './AtelierSystemPages';

export {
  AtelierPageHeader,
  AtelierPageIntro,
  AtelierCourseCatalog,
  AtelierContact,
  AtelierCourseDetails,
  AtelierComingSoon,
  AtelierNotFound,
};

export const ATELIER_PAGES: ThemePages = {
  PageIntro: AtelierPageIntro,
  CourseDetails: AtelierCourseDetails,
  NotFound: AtelierNotFound,
  ComingSoon: AtelierComingSoon,
};

export const ATELIER_PAGE_RENDERERS: Partial<SectionRenderers> = {
  pageHeader: AtelierPageHeader,
  courseCatalog: AtelierCourseCatalog,
  contact: AtelierContact,
};
