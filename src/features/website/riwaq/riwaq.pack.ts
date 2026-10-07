/**
 * Theme 4 — Riwaq (Reports/THEME_4_RIWAQ_PLAN.md).
 *
 * Every section type, the chrome and the system pages are drawn by Riwaq's
 * own components; the section data, settings and live data are the shared
 * contracts every theme renders. A type without a Riwaq renderer falls
 * back to its base renderer (`pack.renderers[type] ?? BASE_RENDERERS[type]`).
 *
 * Its own chunk, loaded only where Riwaq renders (`theme-pack.loader.ts`);
 * its CSS is `riwaq.stylesheet.css`, linked by `theme-stylesheets.ts`.
 */
import type { ThemePack } from '../theme-packs/theme-pack.types';
import { mapRiwaqBrandPalette } from './riwaq.brand-mapping';
import { RIWAQ_SECTION_RENDERERS } from './sections';
import { RIWAQ_CHROME } from './chrome';
import { RIWAQ_PAGES, RIWAQ_PAGE_RENDERERS } from './pages';
import { RIWAQ_ASSETS } from '../theme-assets/manifests/riwaq.manifest';
import './riwaq.css';

export const RIWAQ_PACK: ThemePack = {
  key: 'riwaq',
  renderers: {
    ...RIWAQ_SECTION_RENDERERS,
    ...RIWAQ_PAGE_RENDERERS,
  },
  pages: RIWAQ_PAGES,
  chrome: RIWAQ_CHROME,
  mapBrandPalette: mapRiwaqBrandPalette,
  assets: RIWAQ_ASSETS,
};
