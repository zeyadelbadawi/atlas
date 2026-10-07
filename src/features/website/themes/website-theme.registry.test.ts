/**
 * Themes 2–5 retirement (Reports/THEMES_2_5_RETIREMENT.md) and Theme 2
 * Atelier (Reports/THEME_2_ATELIER_PLAN.md): Theme 1 and Atelier are
 * offered, the retired themes never are; a website still on a retired theme keeps rendering it and sees
 * it as its active theme; every section a retired theme's website holds has
 * a Theme 1 renderer, so the migration moves nothing that can't be drawn.
 */
import { describe, expect, it } from 'vitest';
import {
  RETIRED_WEBSITE_THEME_KEYS,
  SECTION_TYPES,
  SELECTABLE_WEBSITE_THEME_KEYS,
  WEBSITE_THEME_KEYS,
} from '@types';
import { getThemePack } from '../theme-packs/theme-pack.registry';
import { BASE_RENDERERS } from '../theme-packs/base-renderers';
import { getWebsiteTheme, listWebsiteThemes } from './website-theme.registry';

describe('theme selection after the Themes 2–5 retirement', () => {
  it('offers Theme 1 (the default) and Atelier, never a retired theme', () => {
    expect(SELECTABLE_WEBSITE_THEME_KEYS).toEqual([
      'modern-education',
      'atelier',
      'manara',
      'riwaq',
    ]);
    expect(listWebsiteThemes().map((theme) => theme.key)).toEqual([
      'modern-education',
      'atelier',
      'manara',
      'riwaq',
    ]);
    for (const current of [
      'modern-education',
      'atelier',
      'manara',
      'riwaq',
    ] as const) {
      expect(listWebsiteThemes(current).map((theme) => theme.key)).toEqual([
        'modern-education',
        'atelier',
        'manara',
        'riwaq',
      ]);
    }
    for (const key of RETIRED_WEBSITE_THEME_KEYS) {
      expect(SELECTABLE_WEBSITE_THEME_KEYS).not.toContain(key);
    }
  });

  it("shows a website's own retired theme alongside Theme 1, until it moves", () => {
    for (const key of RETIRED_WEBSITE_THEME_KEYS) {
      expect(listWebsiteThemes(key).map((theme) => theme.key)).toEqual([
        'modern-education',
        'atelier',
        'manara',
        'riwaq',
        key,
      ]);
    }
  });

  it('still renders every retired theme as itself until the migration', () => {
    expect(WEBSITE_THEME_KEYS).toEqual([
      ...SELECTABLE_WEBSITE_THEME_KEYS,
      ...RETIRED_WEBSITE_THEME_KEYS,
    ]);
    for (const key of RETIRED_WEBSITE_THEME_KEYS) {
      expect(getWebsiteTheme(key).key).toBe(key);
      expect(getThemePack(key).key).toBe(key);
    }
  });

  it('Theme 1 draws every section type itself, so no retired section is unmappable', () => {
    const pack = getThemePack('modern-education');
    // Types added after the retirement (no retired website holds one) are
    // drawn by their shared base renderer.
    const POST_RETIREMENT_TYPES = new Set(['courseSpotlight']);
    for (const type of SECTION_TYPES) {
      const renderer = POST_RETIREMENT_TYPES.has(type)
        ? BASE_RENDERERS[type]
        : pack.renderers[type];
      expect(renderer, type).toBeTypeOf('function');
    }
  });
});
