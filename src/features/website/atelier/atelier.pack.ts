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

export const ATELIER_PACK: ThemePack = {
  key: 'atelier',
  renderers: {},
  mapBrandPalette: mapAtelierBrandPalette,
};
