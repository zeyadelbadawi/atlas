/**
 * Theme packs (Theme 1 plan §F.1, §J.12): fallback, dispatch, and the
 * architecture claim — a new theme's pack redesigns what it wants without
 * touching any other theme.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SECTION_TYPES, WEBSITE_THEME_KEYS } from '@types';
import type { SectionInstance, WebsiteThemeKey } from '@types';
import { SectionRenderer } from '../sections/SectionRenderer';
import { WebsiteThemeScope } from '../renderer/WebsiteThemeScope';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { BASE_RENDERERS } from './base-renderers';
import { mapBaseBrandPalette } from './base-brand-mapping';
import { createBasePack } from './base-pack';
import { getThemePack, resolveSectionRenderer } from './theme-pack.registry';
import { ThemePackContext } from './ThemePackContext';
import type { ThemePack } from './theme-pack.types';

afterEach(() => cleanup());

const aboutSection: SectionInstance = {
  id: 'about-1',
  type: 'about',
  enabled: true,
  visibility: { desktop: true, tablet: true, mobile: true },
  config: {
    title: { en: 'About us', ar: 'من نحن' },
    body: { en: 'We teach.', ar: 'نحن نعلّم.' },
  },
} as SectionInstance;

describe('theme packs', () => {
  it('every theme has a pack, and an unknown key falls back like the theme registry', () => {
    for (const key of WEBSITE_THEME_KEYS)
      expect(getThemePack(key).key).toBe(key);
    expect(getThemePack('no-such-theme' as WebsiteThemeKey).key).toBe(
      getWebsiteTheme('no-such-theme' as WebsiteThemeKey).key
    );
  });

  it('every section type has a base renderer', () => {
    for (const type of SECTION_TYPES)
      expect(BASE_RENDERERS[type]).toBeTypeOf('function');
  });

  it('Themes 2–5 redesign nothing: base renderers and the base brand mapping', () => {
    for (const key of WEBSITE_THEME_KEYS) {
      const pack = getThemePack(key);
      expect(pack.renderers).toEqual({});
      // Theme 1 has its own brand mapping since Phase 4 (§F.5).
      if (key === 'modern-education') {
        expect(pack.mapBrandPalette).not.toBe(mapBaseBrandPalette);
      } else {
        expect(pack.mapBrandPalette).toBe(mapBaseBrandPalette);
      }
      for (const type of SECTION_TYPES) {
        expect(resolveSectionRenderer(pack, type)).toBe(BASE_RENDERERS[type]);
      }
    }
  });

  it('a pack renderer wins for its type; every other type falls back to base', () => {
    const TestAbout = () => <p>test-pack about</p>;
    const testPack: ThemePack = {
      ...createBasePack('bold-creative'),
      renderers: { about: TestAbout },
    };
    expect(resolveSectionRenderer(testPack, 'about')).toBe(TestAbout);
    expect(resolveSectionRenderer(testPack, 'hero')).toBe(BASE_RENDERERS.hero);
  });

  it('SectionRenderer dispatches through the pack in context', () => {
    const testPack: ThemePack = {
      ...createBasePack('bold-creative'),
      renderers: {
        about: ({ config }) => <p>custom: {config.title.en}</p>,
      },
    };
    render(
      <ThemePackContext.Provider value={testPack}>
        <SectionRenderer instance={aboutSection} academyId="a1" pages={[]} />
      </ThemePackContext.Provider>
    );
    expect(screen.getByText('custom: About us').tagName).toBe('P');
  });

  it("inside a theme scope, dispatch uses that theme's pack (base here) and skips disabled sections", () => {
    const theme = getWebsiteTheme('premium-academy');
    const { container, rerender } = render(
      <WebsiteThemeScope theme={theme}>
        <SectionRenderer instance={aboutSection} academyId="a1" pages={[]} />
      </WebsiteThemeScope>
    );
    expect(container.textContent).toContain('About us');
    rerender(
      <WebsiteThemeScope theme={theme}>
        <SectionRenderer
          instance={{ ...aboutSection, enabled: false } as SectionInstance}
          academyId="a1"
          pages={[]}
        />
      </WebsiteThemeScope>
    );
    expect(container.textContent).not.toContain('About us');
  });

  it('an unknown section type (newer data, older client) renders nothing instead of failing', () => {
    const { container } = render(
      <SectionRenderer
        instance={
          {
            ...aboutSection,
            type: 'fromTheFuture',
          } as unknown as SectionInstance
        }
        academyId="a1"
        pages={[]}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});
