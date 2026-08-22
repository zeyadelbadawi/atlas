/**
 * Premium Academy theme.
 *
 * Upscale and elegant — a centered hero, outlined cards with generous
 * corner radius, spacious rhythm, wide tracked uppercase labels for a
 * refined, editorial-luxury feel.
 */
import type { WebsiteThemeDefinition } from '@types';

export const PREMIUM_ACADEMY_THEME: WebsiteThemeDefinition = {
  key: 'premium-academy',
  nameKey: 'website:themes.premiumAcademy.name',
  descriptionKey: 'website:themes.premiumAcademy.description',
  version: 1,
  tokens: {
    heroVariant: 'centered',
    headerVariant: 'centered',
    footerVariant: 'columns',
    cardVariant: 'outlined',
    radius: 'large',
    shadow: 'medium',
    spacing: 'spacious',
    containerWidth: 'standard',
    headingWeight: 'semibold',
    headingTracking: 'wide',
    headingCase: 'uppercase',
    defaultPrimary: '222 47% 25%',
    defaultSecondary: '38 75% 48%',
    defaultAccent: '350 60% 45%',
  },
};
