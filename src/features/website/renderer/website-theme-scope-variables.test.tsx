/**
 * The exact CSS variables `WebsiteThemeScope` emits, per theme and brand.
 *
 * Recorded BEFORE the Theme 1 plan's Phase 1 moved brand application into
 * each theme pack's `mapBrandPalette` (§F.5): Themes 2–5 must keep
 * emitting these values byte for byte. Theme 1's entries were re-recorded
 * on purpose in Phase 4, when it got its own semantic mapping (see
 * `modern-education.brand-mapping.test.ts` for what those values must
 * satisfy). A change here is a visual change to every Academy on that
 * theme — re-record only on purpose.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { WEBSITE_THEME_KEYS } from '@types';
import type { WebsiteBrandConfig } from '@types';
import { WebsiteThemeScope } from './WebsiteThemeScope';
import { getWebsiteTheme } from '../themes/website-theme.registry';

const BRANDS: Record<
  string,
  | Pick<WebsiteBrandConfig, 'primaryColor' | 'secondaryColor' | 'accentColor'>
  | undefined
> = {
  // What `WebsiteBootstrapService` stores for a new Academy.
  bootstrapDefault: {
    primaryColor: '221 83% 53%',
    secondaryColor: '221 83% 53%',
    accentColor: '221 83% 53%',
  },
  orange: {
    primaryColor: '24 95% 53%',
    secondaryColor: '199 89% 38%',
    accentColor: '43 96% 56%',
  },
  // No brand at all: the theme's own default colours apply.
  none: undefined,
};

function scopeVariables(
  themeKey: (typeof WEBSITE_THEME_KEYS)[number],
  brand: (typeof BRANDS)[string]
): Record<string, string> {
  const { container } = render(
    <WebsiteThemeScope theme={getWebsiteTheme(themeKey)} brand={brand}>
      <div />
    </WebsiteThemeScope>
  );
  const element = container.querySelector(
    '.website-theme-scope'
  ) as HTMLElement;
  const variables: Record<string, string> = {};
  for (let index = 0; index < element.style.length; index += 1) {
    const name = element.style.item(index);
    variables[name] = element.style.getPropertyValue(name);
  }
  return variables;
}

afterEach(() => cleanup());

describe('WebsiteThemeScope — emitted variables', () => {
  for (const themeKey of WEBSITE_THEME_KEYS) {
    for (const [brandName, brand] of Object.entries(BRANDS)) {
      it(`${themeKey} / ${brandName}`, () => {
        expect(scopeVariables(themeKey, brand)).toMatchSnapshot();
      });
    }
  }
});
