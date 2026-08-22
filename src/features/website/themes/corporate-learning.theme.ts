/**
 * Corporate Learning theme.
 *
 * Structured, professional, information-dense — a full-bleed banner hero,
 * flat square-ish cards with no shadow, compact rhythm, a wide canvas.
 * Built for B2B training providers and enterprise academies.
 */
import type { WebsiteThemeDefinition } from '@types';

export const CORPORATE_LEARNING_THEME: WebsiteThemeDefinition = {
  key: 'corporate-learning',
  nameKey: 'website:themes.corporateLearning.name',
  descriptionKey: 'website:themes.corporateLearning.description',
  version: 1,
  tokens: {
    heroVariant: 'fullbleed',
    headerVariant: 'standard',
    footerVariant: 'columns',
    cardVariant: 'flat',
    radius: 'small',
    shadow: 'none',
    spacing: 'compact',
    containerWidth: 'wide',
    headingWeight: 'semibold',
    headingTracking: 'normal',
    headingCase: 'normal',
    defaultPrimary: '215 60% 40%',
    defaultSecondary: '205 30% 45%',
    defaultAccent: '185 55% 40%',
  },
};
