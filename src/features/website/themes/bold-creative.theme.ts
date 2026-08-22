/**
 * Bold Creative theme.
 *
 * Energetic and expressive — a full-bleed hero, bold high-contrast cards,
 * large radius, strong elevation, tight-tracked uppercase headings. For
 * creative/vocational academies that want to stand out.
 */
import type { WebsiteThemeDefinition } from '@types';

export const BOLD_CREATIVE_THEME: WebsiteThemeDefinition = {
  key: 'bold-creative',
  nameKey: 'website:themes.boldCreative.name',
  descriptionKey: 'website:themes.boldCreative.description',
  version: 1,
  tokens: {
    heroVariant: 'fullbleed',
    headerVariant: 'centered',
    footerVariant: 'stacked',
    cardVariant: 'bold',
    radius: 'large',
    shadow: 'bold',
    spacing: 'comfortable',
    containerWidth: 'standard',
    headingWeight: 'black',
    headingTracking: 'tight',
    headingCase: 'uppercase',
    defaultPrimary: '265 85% 58%',
    defaultSecondary: '22 92% 55%',
    defaultAccent: '330 80% 60%',
  },
};
