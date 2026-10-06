/**
 * What an image field in the Website Builder should draw for a stored value
 * — the same picture the public site draws for it.
 *
 * Stored image values are not all URLs. Starter templates store their
 * photographs as `theme-asset:<theme>/<key>` references, which only
 * `<ThemeImage>` understands: it maps a reference to the active theme's
 * photograph for the same slot (`adoptThemeAssetReference`) and resolves it
 * through that theme's manifest, which arrives with the theme's pack. Handing
 * the raw reference to an `<img>` asks the browser to load a URL with the
 * `theme-asset:` scheme, which shows as a broken image — every builder field
 * holding a starter photograph did that, on every theme.
 *
 * Status:
 *   - `none`        no value;
 *   - `url`         an Owner value (MediaAsset path, URL, legacy data URL),
 *                   drawn as stored;
 *   - `pending`     a theme photograph whose theme's manifest is still
 *                   loading;
 *   - `unavailable` a theme photograph the public site would not draw either
 *                   (unknown key, not released, no pack) — the field says so
 *                   instead of showing a broken image.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { useLoadedThemePack } from '../theme-packs/ThemePackGate';
import {
  getLoadedThemePack,
  isKnownThemeKey,
  loadThemePack,
  subscribeToThemePacks,
  themePackLoadError,
  resolveThemePackKey,
} from '../theme-packs/theme-pack.loader';
import { adoptThemeAssetReference } from './adopt-theme-assets';
import {
  isThemeAssetReference,
  resolveThemeAsset,
} from './resolve-theme-asset';

export type ImagePreview =
  | { readonly status: 'none' }
  | { readonly status: 'url'; readonly src: string }
  | {
      readonly status: 'theme-asset';
      readonly src: string;
      readonly objectPosition: string;
    }
  | { readonly status: 'pending' }
  | { readonly status: 'unavailable' };

/** The theme a stored reference names (`theme-asset:<theme>/<key>`). */
function referencedTheme(value: string): string {
  return value.slice('theme-asset:'.length).split('/')[0] ?? '';
}

/**
 * @param themeKey The theme the Academy's public site renders under. When
 *   known, a reference to another theme's photograph previews as the active
 *   theme's photograph for the same slot, exactly as the public site draws
 *   it. Without it, the reference previews as the photograph it names.
 */
export function useImagePreview(
  value: string | undefined,
  themeKey?: string
): ImagePreview {
  const themeAsset = isThemeAssetReference(value);
  // Whose pack (and manifest) decides: the site's theme when known —
  // through `resolveThemePackKey`, exactly as the public renderer loads it,
  // so a retired key renders with Theme 1's pack — else the reference's own
  // theme, which must be one this build knows.
  const referenced = themeAsset ? referencedTheme(value as string) : undefined;
  const packKey = !themeAsset
    ? undefined
    : themeKey !== undefined
      ? resolveThemePackKey(themeKey)
      : referenced && isKnownThemeKey(referenced)
        ? resolveThemePackKey(referenced)
        : undefined;
  // Re-renders when the pack (and with it the manifest) arrives — or fails.
  const pack = useLoadedThemePack(packKey);
  const readError = () => (packKey ? themePackLoadError(packKey) : undefined);
  const loadError = useSyncExternalStore(
    subscribeToThemePacks,
    readError,
    readError
  );

  useEffect(() => {
    if (!packKey || getLoadedThemePack(packKey)) return;
    // A preview never throws: a pack that fails to load leaves the field
    // showing "unavailable", the editor keeps working.
    loadThemePack(packKey).catch(() => undefined);
  }, [packKey]);

  if (!value) return { status: 'none' };
  if (!themeAsset) return { status: 'url', src: value };
  if (!packKey) return { status: 'unavailable' };
  if (!pack)
    return loadError ? { status: 'unavailable' } : { status: 'pending' };

  const drawn = themeKey ? adoptThemeAssetReference(value, themeKey) : value;
  const resolved = resolveThemeAsset(drawn);
  return resolved
    ? {
        status: 'theme-asset',
        src: resolved.src,
        objectPosition: resolved.objectPosition,
      }
    : { status: 'unavailable' };
}
