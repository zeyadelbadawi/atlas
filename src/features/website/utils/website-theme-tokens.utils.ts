/**
 * Website theme token → real CSS value resolution.
 *
 * The ONLY place a `WebsiteThemeTokens` scale value (e.g. `radius: 'large'`)
 * is turned into an actual CSS value (e.g. `1rem`). No section/header/
 * footer component hardcodes a radius/shadow/spacing pixel value itself —
 * every one of them reads through these maps, so the bounded-token
 * guarantee (see `Reports/ARCHITECTURE.md`, Prompt 9, "Design System
 * Safety") holds structurally, not by convention.
 */
import type {
  WebsiteContainerWidth,
  WebsiteHeadingCase,
  WebsiteHeadingTracking,
  WebsiteHeadingWeight,
  WebsiteRadiusScale,
  WebsiteShadowScale,
  WebsiteSpacingScale,
} from '@types';

export const WEBSITE_RADIUS_VALUES: Record<WebsiteRadiusScale, string> = {
  none: '0px',
  small: '0.375rem',
  medium: '0.75rem',
  large: '1.25rem',
};

export const WEBSITE_SHADOW_VALUES: Record<WebsiteShadowScale, string> = {
  none: 'none',
  soft: '0 2px 8px -2px rgb(0 0 0 / 0.08)',
  medium: '0 8px 24px -4px rgb(0 0 0 / 0.12)',
  bold: '0 16px 40px -8px rgb(0 0 0 / 0.24)',
};

/** Vertical padding a section gets, per spacing scale. */
export const WEBSITE_SECTION_PADDING_VALUES: Record<WebsiteSpacingScale, string> = {
  compact: '2.5rem',
  comfortable: '4rem',
  spacious: '6rem',
};

export const WEBSITE_CONTAINER_WIDTH_VALUES: Record<WebsiteContainerWidth, string> = {
  narrow: '48rem',
  standard: '72rem',
  wide: '90rem',
};

export const WEBSITE_HEADING_WEIGHT_CLASSES: Record<WebsiteHeadingWeight, string> = {
  semibold: 'font-semibold',
  bold: 'font-bold',
  black: 'font-black',
};

export const WEBSITE_HEADING_TRACKING_CLASSES: Record<WebsiteHeadingTracking, string> = {
  tight: 'tracking-tight',
  normal: 'tracking-normal',
  wide: 'tracking-wide',
};

export function websiteHeadingCaseClass(headingCase: WebsiteHeadingCase): string {
  return headingCase === 'uppercase' ? 'uppercase' : '';
}
