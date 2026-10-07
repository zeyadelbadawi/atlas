/**
 * Every theme's asset manifest at once — for tests and tooling. The app
 * never imports this: each manifest ships with its theme's pack
 * (`registerThemeAssetManifest`).
 */
import { ATELIER_ASSETS } from './atelier.manifest';
import { MANARA_ASSETS } from './manara.manifest';
import { MODERN_EDUCATION_ASSETS } from './modern-education.manifest';
import { RIWAQ_ASSETS } from './riwaq.manifest';
import type { ThemeAssetManifest } from '../theme-asset.types';

export const ALL_THEME_ASSET_MANIFESTS: Readonly<
  Record<string, ThemeAssetManifest>
> = {
  [MODERN_EDUCATION_ASSETS.theme]: MODERN_EDUCATION_ASSETS,
  [ATELIER_ASSETS.theme]: ATELIER_ASSETS,
  [MANARA_ASSETS.theme]: MANARA_ASSETS,
  [RIWAQ_ASSETS.theme]: RIWAQ_ASSETS,
};
