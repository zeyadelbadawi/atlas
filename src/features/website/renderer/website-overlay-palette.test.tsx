/**
 * The consent overlay's palette: the Academy's own colours, and always
 * legible (WCAG 1.4.3 text ≥ 4.5:1, 1.4.11 focus ring ≥ 3:1).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { WEBSITE_THEME_KEYS, type WebsiteThemeKey } from '@types';
import { contrastRatio } from '../brand-engine';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { WebsiteThemeScope } from './WebsiteThemeScope';
import { WebsiteOverlayScope } from './WebsiteOverlayScope';
import {
  NEAR_BLACK,
  SCOPE_BACKGROUND,
  mapWebsiteBrandVariables,
  resolveContrastSafePrimary,
} from './website-overlay-palette';

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove('dark');
});

const WHITE = '0 0% 100%';
const brandOf = (primaryColor: string) => ({
  primaryColor,
  secondaryColor: primaryColor,
  accentColor: primaryColor,
});

function inlineVariables(element: HTMLElement): Record<string, string> {
  const variables: Record<string, string> = {};
  for (let index = 0; index < element.style.length; index += 1) {
    const name = element.style.item(index);
    if (name.startsWith('--'))
      variables[name] = element.style.getPropertyValue(name);
  }
  return variables;
}

function assertLegible(tokens: ReturnType<typeof resolveContrastSafePrimary>) {
  expect(
    contrastRatio(tokens['--primary'], tokens['--primary-foreground'])
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    contrastRatio(tokens['--primary-hover'], tokens['--primary-foreground'])
  ).toBeGreaterThanOrEqual(4.5);
}

describe('mapWebsiteBrandVariables', () => {
  it.each(WEBSITE_THEME_KEYS)(
    'is exactly what WebsiteThemeScope emits (%s)',
    (key) => {
      const theme = getWebsiteTheme(key);
      const brand = brandOf('24 95% 53%');
      const { container } = render(
        <WebsiteThemeScope theme={theme} brand={brand}>
          <div />
        </WebsiteThemeScope>
      );
      const scope = container.querySelector(
        '.website-theme-scope'
      ) as HTMLElement;
      const emitted = inlineVariables(scope);
      for (const [name, value] of Object.entries(
        mapWebsiteBrandVariables(theme, brand)
      )) {
        expect(emitted[name], name).toBe(value);
      }
    }
  );
});

describe('resolveContrastSafePrimary', () => {
  it('keeps Theme 1’s already-checked mapping unchanged', () => {
    const variables = mapWebsiteBrandVariables(
      getWebsiteTheme('modern-education'),
      brandOf('330 81% 36%')
    );
    const tokens = resolveContrastSafePrimary(variables);
    expect(tokens['--primary']).toBe(variables['--primary']);
    expect(tokens['--primary-foreground']).toBe(
      variables['--primary-foreground']
    );
    expect(tokens['--ring']).toBe(variables['--ring']);
    assertLegible(tokens);
  });

  it('gives a light brand on a retired theme dark text, not white', () => {
    const yellow = '55 100% 50%';
    const variables = mapWebsiteBrandVariables(
      getWebsiteTheme('bold-creative'),
      brandOf(yellow)
    );
    // The base mapping paints the raw seed under the static white label…
    expect(variables['--primary']).toBe(yellow);
    expect(contrastRatio(yellow, WHITE)).toBeLessThan(4.5);
    // …the overlay keeps the brand but switches to near-black text.
    const tokens = resolveContrastSafePrimary(variables);
    expect(tokens['--primary']).toBe(yellow);
    expect(tokens['--primary-foreground']).toBe(NEAR_BLACK);
    assertLegible(tokens);
    // Yellow is invisible on white as a ring: the text colour is used.
    expect(
      contrastRatio(tokens['--ring'], SCOPE_BACKGROUND)
    ).toBeGreaterThanOrEqual(3);
  });

  it('keeps white text on a dark brand', () => {
    const navy = '222 47% 25%';
    const tokens = resolveContrastSafePrimary(
      mapWebsiteBrandVariables(
        getWebsiteTheme('premium-academy'),
        brandOf(navy)
      )
    );
    expect(tokens['--primary']).toBe(navy);
    expect(tokens['--primary-foreground']).toBe(WHITE);
    expect(tokens['--ring']).toBe(navy);
    assertLegible(tokens);
  });

  it('falls back to the theme default for an invalid stored colour', () => {
    const theme = getWebsiteTheme('corporate-learning');
    const variables = mapWebsiteBrandVariables(theme, brandOf('#ff00aa'));
    const tokens = resolveContrastSafePrimary(
      variables,
      theme.tokens.defaultPrimary
    );
    expect(tokens['--primary']).toBe(theme.tokens.defaultPrimary);
    assertLegible(tokens);
  });

  it('falls back to near-black when the default is invalid too', () => {
    const tokens = resolveContrastSafePrimary(
      { '--primary': 'rgb(1, 2, 3)' },
      'not a colour'
    );
    expect(tokens['--primary']).toBe(NEAR_BLACK);
    expect(tokens['--primary-foreground']).toBe(WHITE);
    assertLegible(tokens);
  });

  it('is neutral with no palette at all', () => {
    const tokens = resolveContrastSafePrimary(null);
    expect(tokens['--primary']).toBe(NEAR_BLACK);
    assertLegible(tokens);
  });

  it('reaches 4.5:1 for every hue and lightness, on every theme', () => {
    for (const key of WEBSITE_THEME_KEYS as readonly WebsiteThemeKey[]) {
      const theme = getWebsiteTheme(key);
      for (let hue = 0; hue < 360; hue += 30) {
        for (const lightness of [5, 25, 45, 55, 65, 85, 98]) {
          const tokens = resolveContrastSafePrimary(
            mapWebsiteBrandVariables(
              theme,
              brandOf(`${hue} 90% ${lightness}%`)
            ),
            theme.tokens.defaultPrimary
          );
          assertLegible(tokens);
        }
      }
    }
  });
});

describe('WebsiteOverlayScope', () => {
  function overlay(themeKey?: WebsiteThemeKey, primary?: string) {
    const { container } = render(
      <WebsiteOverlayScope
        themeKey={themeKey}
        brand={primary ? brandOf(primary) : undefined}
      >
        <button type="button">Accept all</button>
      </WebsiteOverlayScope>
    );
    return container.querySelector(
      '[data-website-overlay-scope]'
    ) as HTMLElement;
  }

  it('is a website scope with the Academy palette and a light colour scheme', () => {
    const scope = overlay('premium-academy', '222 47% 25%');
    expect(scope.classList.contains('website-theme-scope')).toBe(true);
    expect(scope.classList.contains('text-foreground')).toBe(true);
    expect(scope.style.getPropertyValue('--primary')).toBe('222 47% 25%');
    expect(scope.style.colorScheme).toBe('light');
    expect(scope.getAttribute('data-theme-pack')).toBe('premium-academy');
  });

  it('is neutral (near-black, no pack) without a palette', () => {
    const scope = overlay();
    expect(scope.style.getPropertyValue('--primary')).toBe(NEAR_BLACK);
    expect(scope.hasAttribute('data-theme-pack')).toBe(false);
  });

  it('declares the same light palette whatever the dashboard’s dark mode', () => {
    const light = overlay('modern-education', '200 80% 35%').getAttribute(
      'style'
    );
    cleanup();
    document.documentElement.classList.add('dark');
    const dark = overlay('modern-education', '200 80% 35%');
    expect(dark.getAttribute('style')).toBe(light);
    // Theme 1 declares its own light canvas on the scope itself.
    expect(
      contrastRatio(dark.style.getPropertyValue('--background'), WHITE)
    ).toBeLessThan(1.2);
  });
});
