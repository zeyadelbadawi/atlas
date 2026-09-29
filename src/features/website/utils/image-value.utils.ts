/**
 * Image field values (Theme 1 plan §E.4 / §E.5) — mirrors the backend's
 * `image-value.util.ts` exactly (the backend is the authority; this lets
 * the editor say why before a save is refused).
 *
 * Allowed: empty; a theme asset reference (`theme-asset:<theme>/<key>`);
 * an Atlas MediaAsset URL (relative `/api/v1/public/media/…`, what the
 * media library and uploads store); an absolute http(s) URL; or a LEGACY
 * inline upload (`data:image/png|jpeg|webp;base64,…`, what the editor
 * stored before uploads went through MediaAsset — still rendered, never
 * produced any more). Anything else can't become an `<img src>`.
 */
import {
  LEGACY_DATA_IMAGE_PATTERN,
  MEDIA_ASSET_PATH_PATTERN,
  THEME_ASSET_REFERENCE_PATTERN,
} from '../constants/website.constants';

export type ImageValueKind =
  'empty' | 'themeAsset' | 'mediaAsset' | 'url' | 'legacyInline';

export function classifyImageValue(value: string): ImageValueKind | null {
  if (value === '') return 'empty';
  if (THEME_ASSET_REFERENCE_PATTERN.test(value)) return 'themeAsset';
  if (MEDIA_ASSET_PATH_PATTERN.test(value)) return 'mediaAsset';
  if (value.startsWith('data:')) {
    return LEGACY_DATA_IMAGE_PATTERN.test(value) ? 'legacyInline' : null;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? 'url' : null;
  } catch {
    return null;
  }
}

export function isAllowedImageValue(value: string): boolean {
  return classifyImageValue(value) !== null;
}
