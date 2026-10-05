/**
 * Theme photographs follow the theme.
 *
 * A starter template writes its theme's photographs into the section
 * content as `theme-asset:<theme>/<key>`, and section content survives a
 * theme switch (`PATCH themeKey` changes only the theme). Without this, an
 * Academy generated on Modern Education and switched to Atelier kept
 * showing Modern Education's photographs inside Atelier's layout.
 *
 * At render time a reference to ANOTHER theme's photograph is drawn as the
 * active theme's photograph for the same slot, when the active theme has
 * one released. Nothing is written back: the stored content is unchanged,
 * so switching back shows the original photographs again. Owner images
 * (uploads, URLs) are never touched, and a slot the active theme has no
 * photograph for keeps the stored reference.
 */
import { THEME_ASSET_REFERENCE_PATTERN } from '../constants/website.constants';
import { THEME_ASSET_MANIFESTS } from './theme-asset.registry';
import type { ThemeAssetManifest } from './theme-asset.types';

const PREFIX = 'theme-asset:';

/**
 * Slots whose key differs between themes: `[active theme][stored key]` →
 * the active theme's key. Every other slot shares its key across themes
 * (`home-hero`, `home-cta`, `about-header`, `gallery-1`…).
 */
const EQUIVALENT_KEYS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  atelier: { 'home-benefit': 'home-philosophy' },
  'modern-education': { 'home-philosophy': 'home-benefit' },
};

/** One stored image value, as the active theme draws it. */
export function adoptThemeAssetReference(
  value: string,
  themeKey: string,
  manifests: Readonly<
    Record<string, ThemeAssetManifest>
  > = THEME_ASSET_MANIFESTS
): string {
  if (!THEME_ASSET_REFERENCE_PATTERN.test(value)) return value;
  const [theme, key] = value.slice(PREFIX.length).split('/');
  if (theme === themeKey) return value;
  const target = manifests[themeKey];
  if (!target) return value;
  const targetKey = EQUIVALENT_KEYS[themeKey]?.[key] ?? key;
  const entry = target.assets.find((asset) => asset.key === targetKey);
  if (!entry || entry.status !== 'released') return value;
  return `${PREFIX}${themeKey}/${targetKey}`;
}

/**
 * Every theme asset reference inside `value` (section configs, lists of
 * sections), as the active theme draws it. Returns the same object when
 * nothing changes, so memoised consumers keep their identity.
 */
export function adoptThemeAssets<T>(
  value: T,
  themeKey: string,
  manifests?: Readonly<Record<string, ThemeAssetManifest>>
): T {
  if (typeof value === 'string') {
    return adoptThemeAssetReference(value, themeKey, manifests) as T;
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const adopted = adoptThemeAssets(item, themeKey, manifests);
      if (adopted !== item) changed = true;
      return adopted;
    });
    return (changed ? next : value) as T;
  }
  if (value && typeof value === 'object') {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [field, item] of Object.entries(value)) {
      const adopted = adoptThemeAssets(item, themeKey, manifests);
      if (adopted !== item) changed = true;
      next[field] = adopted;
    }
    return (changed ? next : value) as T;
  }
  return value;
}
