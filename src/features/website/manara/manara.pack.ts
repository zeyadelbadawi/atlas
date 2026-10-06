/**
 * Theme 3 — Manara (Reports/THEME_3_MANARA_PLAN.md).
 *
 * Every section type, the chrome and the system pages are drawn by Manara's
 * own components; the section data, settings and live data are the shared
 * contracts every theme renders. A type without a Manara renderer falls
 * back to its base renderer (`pack.renderers[type] ?? BASE_RENDERERS[type]`).
 *
 * Its own chunk, loaded only where Manara renders (`theme-pack.loader.ts`);
 * its CSS is `manara.stylesheet.css`, linked by `theme-stylesheets.ts`.
 */
import type { ThemePack } from '../theme-packs/theme-pack.types';
import { mapManaraBrandPalette } from './manara.brand-mapping';
import { MANARA_SECTION_RENDERERS } from './sections';
import { MANARA_CHROME } from './chrome';
import { MANARA_PAGES, MANARA_PAGE_RENDERERS } from './pages';
import { MANARA_ASSETS } from '../theme-assets/manifests/manara.manifest';

export const MANARA_PACK: ThemePack = {
  key: 'manara',
  renderers: {
    ...MANARA_SECTION_RENDERERS,
    ...MANARA_PAGE_RENDERERS,
  },
  pages: MANARA_PAGES,
  chrome: MANARA_CHROME,
  mapBrandPalette: mapManaraBrandPalette,
  assets: MANARA_ASSETS,
};
