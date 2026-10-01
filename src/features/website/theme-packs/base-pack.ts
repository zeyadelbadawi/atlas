import type { WebsiteThemeKey } from '@types';
import { mapBaseBrandPalette } from './base-brand-mapping';
import type { ThemePack } from './theme-pack.types';

/** A pack that redesigns nothing: base renderers, base brand mapping. */
export function createBasePack(key: WebsiteThemeKey): ThemePack {
  return { key, renderers: {}, mapBrandPalette: mapBaseBrandPalette };
}
