/**
 * Theme 2 — Atelier (Reports/THEME_2_ATELIER_PLAN.md).
 *
 * The Academy as a studio publication: an oversized editorial serif, a warm
 * paper canvas, hairline rules, numbered chapters and the brand "thread"
 * that runs down the page. Its structure lives in its pack
 * (`../atelier/atelier.pack.ts`); these tokens only feed the shared design
 * system the base renderers and dashboard previews read.
 */
import type { WebsiteThemeDefinition } from '@types';

export const ATELIER_THEME: WebsiteThemeDefinition = {
  key: 'atelier',
  nameKey: 'website:themes.atelier.name',
  descriptionKey: 'website:themes.atelier.description',
  version: 1,
  tokens: {
    heroVariant: 'minimal',
    headerVariant: 'minimal',
    footerVariant: 'stacked',
    cardVariant: 'flat',
    radius: 'none',
    shadow: 'none',
    spacing: 'spacious',
    containerWidth: 'wide',
    headingWeight: 'semibold',
    headingTracking: 'tight',
    headingCase: 'normal',
    // A deep oxblood, an olive and a warm ochre: an editorial palette that
    // reads as ink on paper when an Academy has not set its own colours.
    defaultPrimary: '352 58% 34%',
    defaultSecondary: '82 22% 32%',
    defaultAccent: '36 72% 48%',
  },
};
