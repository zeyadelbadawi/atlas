/**
 * Theme asset manifests by theme key, and the prompt builder. Only themes
 * that ship photographs have a manifest.
 *
 * A manifest arrives with its theme's pack: `registerThemePack` registers
 * `pack.assets`, so a public site carries only its own theme's manifest
 * (the pack is loaded before anything of that theme renders). Every
 * manifest at once, for tests and tooling: `manifests/index.ts`.
 */
import type { ThemeAssetEntry, ThemeAssetManifest } from './theme-asset.types';

const registered: Record<string, ThemeAssetManifest> = {};

/** The manifests of the themes loaded on this page, by theme key. */
export const THEME_ASSET_MANIFESTS: Readonly<
  Record<string, ThemeAssetManifest>
> = registered;

/** Makes a theme's manifest resolvable (called when its pack loads). */
export function registerThemeAssetManifest(manifest: ThemeAssetManifest): void {
  registered[manifest.theme] = manifest;
}

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
