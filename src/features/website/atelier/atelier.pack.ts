/**
 * Theme 2 — Atelier (Reports/THEME_2_ATELIER_PLAN.md).
 *
 * Every section type, the chrome and the system pages are drawn by Atelier's
 * own components; the section data, settings and live data are the shared
 * contracts every theme renders. A type without an Atelier renderer falls
 * back to its base renderer (`pack.renderers[type] ?? BASE_RENDERERS[type]`).
 */
import type { ThemePack } from '../theme-packs/theme-pack.types';
import './atelier.css';
import { mapAtelierBrandPalette } from './atelier.brand-mapping';
import { ATELIER_SECTION_RENDERERS } from './sections';
import { ATELIER_CHROME } from './chrome';
import { ATELIER_PAGES, ATELIER_PAGE_RENDERERS } from './pages';

export const ATELIER_PACK: ThemePack = {
  key: 'atelier',
  renderers: {
    ...ATELIER_SECTION_RENDERERS,
    ...ATELIER_PAGE_RENDERERS,
  },
  pages: ATELIER_PAGES,
  chrome: ATELIER_CHROME,
  mapBrandPalette: mapAtelierBrandPalette,
};
