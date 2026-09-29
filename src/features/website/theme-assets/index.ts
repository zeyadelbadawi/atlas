/**
 * Theme assets — public entry point (plan §E).
 */
export { ThemeImage } from './ThemeImage';
export type { ThemeImageProps } from './ThemeImage';
export {
  hasRenderableImage,
  isThemeAssetReference,
  resolveImageUrl,
  resolveThemeAsset,
  themeAssetUrl,
} from './resolve-theme-asset';
export type { ResolvedThemeAsset } from './resolve-theme-asset';
export {
  THEME_ASSET_MANIFESTS,
  THEME_ASSET_PUBLIC_ROOT,
  buildThemeAssetPrompt,
  findThemeAsset,
} from './theme-asset.registry';
export { themeAssetManifestSchema } from './theme-asset.schema';
export type {
  ThemeAssetEntry,
  ThemeAssetManifest,
  ThemeAssetProvenance,
} from './theme-asset.types';
