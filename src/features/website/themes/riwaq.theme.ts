/**
 * Theme 4 — Riwaq (Reports/THEME_4_RIWAQ_PLAN.md).
 *
 * An institution's clarity: a porcelain page with a visible column grid
 * (the colonnade), the brand as ink, square-cornered datasheet cells,
 * spec tables and daylight architecture photography tinted in the
 * Academy's hue. Its structure lives in its pack (`../riwaq/riwaq.pack.ts`);
 * these tokens only feed the shared design system the base renderers and
 * dashboard previews read.
 */
import type { WebsiteThemeDefinition } from '@types';

export const RIWAQ_THEME: WebsiteThemeDefinition = {
  key: 'riwaq',
  nameKey: 'website:themes.riwaq.name',
  descriptionKey: 'website:themes.riwaq.description',
  version: 1,
  tokens: {
    heroVariant: 'split',
    headerVariant: 'standard',
    footerVariant: 'columns',
    cardVariant: 'outlined',
    radius: 'none',
    shadow: 'none',
    spacing: 'spacious',
    containerWidth: 'wide',
    headingWeight: 'semibold',
    headingTracking: 'tight',
    headingCase: 'normal',
    // A deep teal-blue, a slate and a saffron marker: an institute's
    // printed prospectus when an Academy has not set its own colours.
    defaultPrimary: '199 64% 30%',
    defaultSecondary: '215 20% 32%',
    defaultAccent: '38 92% 50%',
  },
};
