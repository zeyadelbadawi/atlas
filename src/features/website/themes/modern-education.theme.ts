/**
 * Modern Education theme.
 *
 * Friendly, approachable, energetic — a split hero with generous imagery,
 * elevated rounded cards, comfortable spacing. The default choice for a
 * general-purpose Academy.
 */
import type { WebsiteThemeDefinition } from '@types';

export const MODERN_EDUCATION_THEME: WebsiteThemeDefinition = {
  key: 'modern-education',
  nameKey: 'website:themes.modernEducation.name',
  descriptionKey: 'website:themes.modernEducation.description',
  version: 1,
  tokens: {
    heroVariant: 'split',
    headerVariant: 'standard',
    footerVariant: 'columns',
    cardVariant: 'elevated',
    radius: 'medium',
    shadow: 'soft',
    spacing: 'comfortable',
    containerWidth: 'standard',
    headingWeight: 'bold',
    headingTracking: 'normal',
    headingCase: 'normal',
    defaultPrimary: '217 91% 55%',
    defaultSecondary: '173 65% 40%',
    defaultAccent: '38 92% 55%',
  },
};
