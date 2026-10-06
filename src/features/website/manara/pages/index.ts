/**
 * Manara inner pages (Reports/THEME_3_MANARA_PLAN.md §3.11): the pages a
 * pack may redesign (`MANARA_PAGES`) and the inner-page section renderers
 * (`MANARA_PAGE_RENDERERS`: the banner block, the catalogue and contact).
 */
import type {
  SectionRenderers,
  ThemePages,
} from '@/features/website/theme-packs/theme-pack.types';
import { ManaraPageHeader, ManaraPageIntro } from './ManaraPageHeader';
import { ManaraCourseCatalog } from './ManaraCourseCatalog';
import { ManaraContact } from './ManaraContact';
import { ManaraCourseDetails } from './ManaraCourseDetails';
import { ManaraComingSoon, ManaraNotFound } from './ManaraSystemPages';

export {
  ManaraPageHeader,
  ManaraPageIntro,
  ManaraCourseCatalog,
  ManaraContact,
  ManaraCourseDetails,
  ManaraComingSoon,
  ManaraNotFound,
};
export { ManaraCourseCard, ManaraCourseCardSkeleton } from './ManaraCourseCard';

export const MANARA_PAGES: ThemePages = {
  PageIntro: ManaraPageIntro,
  CourseDetails: ManaraCourseDetails,
  NotFound: ManaraNotFound,
  ComingSoon: ManaraComingSoon,
};

export const MANARA_PAGE_RENDERERS: Partial<SectionRenderers> = {
  pageHeader: ManaraPageHeader,
  courseCatalog: ManaraCourseCatalog,
  contact: ManaraContact,
};
