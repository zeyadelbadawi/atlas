/**
 * Theme pack registry — the code counterpart of `website-theme.registry.ts`
 * (tokens). One entry per theme key; a theme with its own presentation
 * gets its own module under `packs/`, so adding or redesigning one theme
 * never edits another's file (§F.2, §J.12).
 *
 * Themes 2–5 use the base pack: base renderers and the base brand mapping,
 * which keeps them pixel-identical through the Theme 1 work.
 *
 * Packs are small descriptors, resolved synchronously: the brand mapping
 * must be ready for the first paint (it sets the page's colours). Heavy
 * renderer code a pack adds later is split out with `React.lazy` inside
 * the pack, so it only downloads for Academies on that theme.
 */
import type { SectionType, WebsiteThemeKey } from '@types';
import { BASE_RENDERERS } from './base-renderers';
import { createBasePack } from './base-pack';
import { MODERN_EDUCATION_PACK } from '../modern-education/modern-education.pack';
import { ATELIER_PACK } from '../atelier/atelier.pack';
import type { SectionRendererComponent, ThemePack } from './theme-pack.types';

const registry: Record<WebsiteThemeKey, ThemePack> = {
  'modern-education': MODERN_EDUCATION_PACK,
  atelier: ATELIER_PACK,
  'premium-academy': createBasePack('premium-academy'),
  'corporate-learning': createBasePack('corporate-learning'),
  'minimal-editorial': createBasePack('minimal-editorial'),
  'bold-creative': createBasePack('bold-creative'),
};

/** Same fallback as `getWebsiteTheme`: an unknown/legacy key renders as Modern Education. */
export function getThemePack(key: WebsiteThemeKey): ThemePack {
  return registry[key] ?? MODERN_EDUCATION_PACK;
}

/** `pack.renderers[type] ?? BASE_RENDERERS[type]` — `undefined` only for a type no code knows. */
export function resolveSectionRenderer<TType extends SectionType>(
  pack: ThemePack,
  type: TType
): SectionRendererComponent<TType> | undefined {
  return (pack.renderers[type] ?? BASE_RENDERERS[type]) as
    SectionRendererComponent<TType> | undefined;
}
