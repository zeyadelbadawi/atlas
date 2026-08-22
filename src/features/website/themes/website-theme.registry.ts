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
import type { WebsiteThemeDefinition, WebsiteThemeKey } from '@types';
import { MODERN_EDUCATION_THEME } from './modern-education.theme';
import { PREMIUM_ACADEMY_THEME } from './premium-academy.theme';
import { CORPORATE_LEARNING_THEME } from './corporate-learning.theme';
import { MINIMAL_EDITORIAL_THEME } from './minimal-editorial.theme';
import { BOLD_CREATIVE_THEME } from './bold-creative.theme';

const registry: Record<WebsiteThemeKey, WebsiteThemeDefinition> = {
  'modern-education': MODERN_EDUCATION_THEME,
  'premium-academy': PREMIUM_ACADEMY_THEME,
  'corporate-learning': CORPORATE_LEARNING_THEME,
  'minimal-editorial': MINIMAL_EDITORIAL_THEME,
  'bold-creative': BOLD_CREATIVE_THEME,
};

/** Resolves a theme definition by key. Falls back to Modern Education if an unknown/legacy key is ever encountered, so a website never renders with no theme at all. */
export function getWebsiteTheme(key: WebsiteThemeKey): WebsiteThemeDefinition {
  return registry[key] ?? MODERN_EDUCATION_THEME;
}

/** Every registered theme, in a stable display order — used by the Theme gallery. */
export function listWebsiteThemes(): readonly WebsiteThemeDefinition[] {
  return [
    MODERN_EDUCATION_THEME,
    PREMIUM_ACADEMY_THEME,
    CORPORATE_LEARNING_THEME,
    MINIMAL_EDITORIAL_THEME,
    BOLD_CREATIVE_THEME,
  ];
}
