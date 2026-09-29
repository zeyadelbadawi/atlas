/**
 * Theme asset manifests by theme key, and the prompt builder. Only themes
 * that ship photographs have a manifest.
 */
import { MODERN_EDUCATION_ASSETS } from './manifests/modern-education.manifest';
import type { ThemeAssetEntry, ThemeAssetManifest } from './theme-asset.types';

export const THEME_ASSET_MANIFESTS: Readonly<
  Record<string, ThemeAssetManifest>
> = {
  [MODERN_EDUCATION_ASSETS.theme]: MODERN_EDUCATION_ASSETS,
};

/** Public URL root the derivatives are served from (same origin, immutable). */
export const THEME_ASSET_PUBLIC_ROOT = '/theme-assets';

export function findThemeAsset(
  theme: string,
  key: string,
  manifests: Readonly<
    Record<string, ThemeAssetManifest>
  > = THEME_ASSET_MANIFESTS
): { manifest: ThemeAssetManifest; entry: ThemeAssetEntry } | undefined {
  const manifest = manifests[theme];
  const entry = manifest?.assets.find((asset) => asset.key === key);
  return manifest && entry ? { manifest, entry } : undefined;
}

/**
 * The generation prompt for one asset (plan §E.3 step 3): subject and
 * composition, framing ratio, the theme's shared art direction, and the
 * exclusions. Recorded verbatim in the entry's provenance once generated.
 */
export function buildThemeAssetPrompt(
  manifest: ThemeAssetManifest,
  entry: ThemeAssetEntry
): string {
  return [
    entry.direction,
    `Framing: ${entry.ratio} aspect ratio.`,
    manifest.artDirection,
    `Strictly avoid: ${manifest.exclusions}`,
  ].join(' ');
}
