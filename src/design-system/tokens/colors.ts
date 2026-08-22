/**
 * Atlas color tokens.
 *
 * Colors are declared once as CSS custom properties in `src/index.css`.
 * This module exposes them to TypeScript for the cases where a raw color
 * string is unavoidable — most notably chart libraries and inline SVG.
 *
 * Consumers must never write a literal color value. Use `colorToken()`.
 */

/** Semantic surface and content roles. */
export const SURFACE_COLOR_TOKENS = [
  'background',
  'foreground',
  'surface',
  'surface-foreground',
  'surface-raised',
  'surface-overlay',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
] as const;

/** Interactive roles used by actions and controls. */
export const INTERACTIVE_COLOR_TOKENS = [
  'primary',
  'primary-foreground',
  'primary-hover',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
] as const;

/** Feedback roles. Reserved for their semantic meaning only. */
export const FEEDBACK_COLOR_TOKENS = [
  'destructive',
  'destructive-foreground',
  'destructive-surface',
  'success',
  'success-foreground',
  'success-surface',
  'warning',
  'warning-foreground',
  'warning-surface',
  'info',
  'info-foreground',
  'info-surface',
] as const;

/** Lines, fields and focus indicators. */
export const OUTLINE_COLOR_TOKENS = [
  'border',
  'border-strong',
  'input',
  'ring',
] as const;

/** Categorical data-visualization series, in presentation order. */
export const CHART_COLOR_TOKENS = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
  'chart-6',
] as const;

/** Navigation shell roles. */
export const SIDEBAR_COLOR_TOKENS = [
  'sidebar-background',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
] as const;

/** The raw brand ramp. Prefer semantic roles over the ramp in product UI. */
export const BRAND_COLOR_TOKENS = [
  'brand-50',
  'brand-100',
  'brand-200',
  'brand-300',
  'brand-400',
  'brand-500',
  'brand-600',
  'brand-700',
  'brand-800',
  'brand-900',
] as const;

export const COLOR_TOKENS = [
  ...SURFACE_COLOR_TOKENS,
  ...INTERACTIVE_COLOR_TOKENS,
  ...FEEDBACK_COLOR_TOKENS,
  ...OUTLINE_COLOR_TOKENS,
  ...CHART_COLOR_TOKENS,
  ...SIDEBAR_COLOR_TOKENS,
  ...BRAND_COLOR_TOKENS,
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];
export type ChartColorToken = (typeof CHART_COLOR_TOKENS)[number];

/**
 * Resolves a color token to a CSS color value that follows the active theme.
 *
 * @param token Semantic token name, without the `--` prefix.
 * @param opacity Optional alpha between 0 and 1.
 */
export function colorToken(token: ColorToken, opacity?: number): string {
  const channel = `var(--${token})`;
  return opacity === undefined
    ? `hsl(${channel})`
    : `hsl(${channel} / ${opacity})`;
}

/**
 * Ordered palette for categorical chart series. Charts pick colors by index so
 * a series keeps the same color in Light Mode, Dark Mode and RTL.
 */
export const CHART_SERIES_PALETTE: readonly string[] = CHART_COLOR_TOKENS.map(
  (token) => colorToken(token)
);

/** Returns the chart color for a series index, cycling when series exceed the palette. */
export function chartSeriesColor(seriesIndex: number): string {
  const paletteSize = CHART_SERIES_PALETTE.length;
  const safeIndex = ((seriesIndex % paletteSize) + paletteSize) % paletteSize;
  return CHART_SERIES_PALETTE[safeIndex];
}