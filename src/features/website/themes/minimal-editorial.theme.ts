/**
 * Minimal Editorial theme.
 *
 * Restrained and typographic — a minimal hero with no imagery emphasis,
 * borderless flat cards, square corners, spacious whitespace, a narrow
 * reading column. For academies that want their content to speak for
 * itself.
 */
import type { WebsiteThemeDefinition } from '@types';

export const MINIMAL_EDITORIAL_THEME: WebsiteThemeDefinition = {
  key: 'minimal-editorial',
  nameKey: 'website:themes.minimalEditorial.name',
  descriptionKey: 'website:themes.minimalEditorial.description',
  version: 1,
  tokens: {
    heroVariant: 'minimal',
    headerVariant: 'minimal',
    footerVariant: 'simple',
    cardVariant: 'flat',
    radius: 'none',
    shadow: 'none',
    spacing: 'spacious',
    containerWidth: 'narrow',
    headingWeight: 'semibold',
    headingTracking: 'tight',
    headingCase: 'normal',
    defaultPrimary: '220 15% 15%',
    defaultSecondary: '30 8% 45%',
    defaultAccent: '14 65% 50%',
  },
};
