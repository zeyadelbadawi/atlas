/**
 * Website Theme Registry.
 *
 * Maps a `WebsiteThemeKey` to its `WebsiteThemeDefinition`. The same
 * registry pattern `PaymentProviderRegistry` (Prompt 7) already
 * established: adding Theme 6 is adding one new definition module and one
 * new entry here — it never requires touching Theme 1–5's modules or the
 * renderer engine (`WebsiteRenderer`, the section components) itself,
 * which only ever consume a `ResolvedWebsiteDesignSystem`, never a theme
 * key directly.
 */
import { SELECTABLE_WEBSITE_THEME_KEYS } from '@types';
import type { WebsiteThemeDefinition, WebsiteThemeKey } from '@types';
import { MODERN_EDUCATION_THEME } from './modern-education.theme';
import { PREMIUM_ACADEMY_THEME } from './premium-academy.theme';
import { CORPORATE_LEARNING_THEME } from './corporate-learning.theme';
import { MINIMAL_EDITORIAL_THEME } from './minimal-editorial.theme';
import { BOLD_CREATIVE_THEME } from './bold-creative.theme';
import { ATELIER_THEME } from './atelier.theme';
import { MANARA_THEME } from './manara.theme';
import { RIWAQ_THEME } from './riwaq.theme';

/** Every theme the renderer knows, selectable or retired. */
const registry: Record<WebsiteThemeKey, WebsiteThemeDefinition> = {
  'modern-education': MODERN_EDUCATION_THEME,
  atelier: ATELIER_THEME,
  manara: MANARA_THEME,
  riwaq: RIWAQ_THEME,
  'premium-academy': PREMIUM_ACADEMY_THEME,
  'corporate-learning': CORPORATE_LEARNING_THEME,
  'minimal-editorial': MINIMAL_EDITORIAL_THEME,
  'bold-creative': BOLD_CREATIVE_THEME,
};

/** Resolves a theme definition by key. Falls back to Modern Education if an unknown/legacy key is ever encountered, so a website never renders with no theme at all. */
export function getWebsiteTheme(key: WebsiteThemeKey): WebsiteThemeDefinition {
  return registry[key] ?? MODERN_EDUCATION_THEME;
}

/**
 * The themes an Owner can pick, in display order — the Theme gallery and
 * provisioning. `current` adds the website's own theme when it is a retired
 * one (Themes 2–5), so the gallery still shows it as active until the
 * retirement migration moves the website to Theme 1.
 */
export function listWebsiteThemes(
  current?: WebsiteThemeKey
): readonly WebsiteThemeDefinition[] {
  const keys: readonly WebsiteThemeKey[] = SELECTABLE_WEBSITE_THEME_KEYS;
  const selectable = keys.map((key) => registry[key]);
  return current && !keys.includes(current) && registry[current]
    ? [...selectable, registry[current]]
    : selectable;
}
