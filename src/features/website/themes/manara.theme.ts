/**
 * Theme 3 — Manara (Reports/THEME_3_MANARA_PLAN.md).
 *
 * The teacher on stage, the student on the phone: a dark night stage and a
 * light day ground, the brand as whole dyed blocks, oversized Arabic-first
 * display type, scoreboard numerals and slanted "beam" seams. Its structure
 * lives in its pack (`../manara/manara.pack.ts`); these tokens only feed the
 * shared design system the base renderers and dashboard previews read.
 */
import type { WebsiteThemeDefinition } from '@types';

export const MANARA_THEME: WebsiteThemeDefinition = {
  key: 'manara',
  nameKey: 'website:themes.manara.name',
  descriptionKey: 'website:themes.manara.description',
  version: 1,
  tokens: {
    heroVariant: 'fullbleed',
    headerVariant: 'standard',
    footerVariant: 'columns',
    cardVariant: 'bold',
    radius: 'small',
    shadow: 'none',
    spacing: 'comfortable',
    containerWidth: 'wide',
    headingWeight: 'black',
    headingTracking: 'tight',
    headingCase: 'normal',
    // A deep cobalt, a night navy and a warm amber: a stage-light palette
    // that reads as a lit board when an Academy has not set its own colours.
    defaultPrimary: '222 72% 46%',
    defaultSecondary: '228 40% 18%',
    defaultAccent: '38 96% 54%',
  },
};
