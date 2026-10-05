/**
 * Theme pack registry — the code counterpart of `website-theme.registry.ts`
 * (tokens). One entry per theme key; a theme with its own presentation
 * gets its own module (`modern-education.pack.ts`, `atelier.pack.ts`), so
 * adding or redesigning one theme never edits another's file (§F.2, §J.12).
 *
 * Themes 2–5 use the base pack: base renderers and the base brand mapping,
 * which keeps them pixel-identical through the Theme 1 work.
 *
 * A theme with its own pack is a chunk of its own, loaded on demand
 * (`theme-pack.loader.ts`), so each public site downloads only its theme.
 * `getThemePack` reads a pack that has loaded: call it inside
 * `ThemePackGate` (or after `loadThemePack`).
 */
import type { SectionType, WebsiteThemeKey } from '@types';
import { BASE_RENDERERS } from './base-renderers';
import { getLoadedThemePack, resolveThemePackKey } from './theme-pack.loader';
import type { SectionRendererComponent, ThemePack } from './theme-pack.types';

export {
  getLoadedThemePack,
  isKnownThemeKey,
  loadAllThemePacks,
  loadThemePack,
  resolveThemePackKey,
  themeDrawsSystemPage,
} from './theme-pack.loader';

/**
 * The theme's pack — an unknown/legacy key gets Modern Education's, the
 * same fallback as `getWebsiteTheme`. Throws when that pack has not loaded
 * yet: rendering a theme without its pack would show the wrong design.
 */
export function getThemePack(key: WebsiteThemeKey): ThemePack {
  const pack = getLoadedThemePack(key);
  if (!pack) {
    throw new Error(
      `Theme pack "${resolveThemePackKey(key)}" has not loaded: render it inside ThemePackGate, or await loadThemePack() first.`
    );
  }
  return pack;
}

/** `pack.renderers[type] ?? BASE_RENDERERS[type]` — `undefined` only for a type no code knows. */
export function resolveSectionRenderer<TType extends SectionType>(
  pack: ThemePack,
  type: TType
): SectionRendererComponent<TType> | undefined {
  return (pack.renderers[type] ?? BASE_RENDERERS[type]) as
    SectionRendererComponent<TType> | undefined;
}
