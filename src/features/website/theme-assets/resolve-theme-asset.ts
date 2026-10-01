/**
 * `theme-asset:<theme>/<key>` → what `<ThemeImage>` renders (plan §E.4):
 * AVIF/WebP `srcset`s from the released version folder, intrinsic size,
 * LQIP and the focal point as `object-position`. A reference to an unknown
 * or still-pending asset resolves to `null` — the caller shows its designed
 * no-image state.
 */
import { THEME_ASSET_REFERENCE_PATTERN } from '../constants/website.constants';
import {
  THEME_ASSET_PUBLIC_ROOT,
  findThemeAsset,
} from './theme-asset.registry';
import type { ThemeAssetFormat, ThemeAssetManifest } from './theme-asset.types';

const MIME: Record<ThemeAssetFormat, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
};

export interface ResolvedThemeAsset {
  readonly sources: readonly {
    readonly type: string;
    readonly srcSet: string;
  }[];
  /** The last format's mid-size file, for browsers without `<picture>` support. */
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly lqip?: string;
  readonly objectPosition: string;
  readonly alt: { readonly en: string; readonly ar: string };
  readonly priority: boolean;
}

export function isThemeAssetReference(value: string | undefined): boolean {
  return !!value && value.startsWith('theme-asset:');
}

export function themeAssetUrl(
  theme: string,
  version: string,
  key: string,
  width: number,
  format: ThemeAssetFormat
): string {
  return `${THEME_ASSET_PUBLIC_ROOT}/${theme}/${version}/${key}-${width}.${format}`;
}

export function resolveThemeAsset(
  reference: string,
  manifests?: Readonly<Record<string, ThemeAssetManifest>>
): ResolvedThemeAsset | null {
  if (!THEME_ASSET_REFERENCE_PATTERN.test(reference)) return null;
  const [theme, key] = reference.slice('theme-asset:'.length).split('/');
  const found = findThemeAsset(theme, key, manifests);
  if (!found) return null;
  const { manifest, entry } = found;
  if (entry.status !== 'released' || !entry.version) return null;
  const version = entry.version;

  const sources = manifest.formats.map((format) => ({
    type: MIME[format],
    srcSet: entry.widths
      .map(
        (width) =>
          `${themeAssetUrl(theme, version, key, width, format)} ${width}w`
      )
      .join(', '),
  }));
  const fallbackFormat = manifest.formats[manifest.formats.length - 1];
  const fallbackWidth =
    entry.widths.find((width) => width >= 800) ??
    entry.widths[entry.widths.length - 1];

  return {
    sources,
    src: themeAssetUrl(theme, version, key, fallbackWidth, fallbackFormat),
    width: entry.master.width,
    height: entry.master.height,
    lqip: entry.lqip,
    objectPosition: `${round(entry.focal.x * 100)}% ${round(entry.focal.y * 100)}%`,
    alt: entry.alt,
    priority: entry.priority === true,
  };
}

/**
 * Whether a stored image value will actually draw something — so a section
 * can choose its no-image layout. Every non-theme value keeps today's rule
 * (any non-empty string), which keeps existing pages exactly as they are.
 */
export function hasRenderableImage(value: string | undefined): boolean {
  if (!value) return false;
  if (!isThemeAssetReference(value)) return true;
  return resolveThemeAsset(value) !== null;
}

/**
 * A single URL for places that can't use `<picture>` (a CSS background):
 * the resolved fallback file for a theme asset, the value itself otherwise,
 * `undefined` when nothing would draw.
 */
export function resolveImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!isThemeAssetReference(value)) return value;
  return resolveThemeAsset(value)?.src;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
