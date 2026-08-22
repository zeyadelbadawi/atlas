/**
 * Atlas typography tokens.
 *
 * Atlas pairs two families that both carry complete Arabic and Latin coverage,
 * so a screen keeps its typographic voice when the language switches:
 *  - Display: Readex Pro — headings, page titles, metrics.
 *  - Sans: Rubik — body copy, controls, labels.
 *  - Mono: JetBrains Mono — identifiers and technical values.
 */

export const FONT_FAMILY_TOKENS = {
  sans: 'var(--font-sans)',
  display: 'var(--font-display)',
  mono: 'var(--font-mono)',
} as const;

export type FontFamilyToken = keyof typeof FONT_FAMILY_TOKENS;

/**
 * Type scale expressed as Tailwind utilities so components stay declarative.
 * Product surfaces use a fixed scale; fluid type is reserved for brand pages.
 */
export const TEXT_STYLE_TOKENS = {
  displayLarge: 'font-display text-4xl font-semibold leading-tight tracking-tight',
  displayMedium: 'font-display text-3xl font-semibold leading-tight tracking-tight',
  pageTitle: 'font-display text-2xl font-semibold leading-snug',
  sectionTitle: 'font-display text-lg font-semibold leading-snug',
  cardTitle: 'font-display text-base font-semibold leading-snug',
  bodyLarge: 'text-base leading-relaxed',
  body: 'text-sm leading-relaxed',
  bodyStrong: 'text-sm font-medium leading-relaxed',
  caption: 'text-xs leading-normal text-muted-foreground',
  overline: 'text-xs font-medium uppercase tracking-wider text-muted-foreground',
  metric: 'font-display text-3xl font-semibold leading-none',
  code: 'font-mono text-xs',
} as const;

export type TextStyleToken = keyof typeof TEXT_STYLE_TOKENS;

export const FONT_WEIGHT_TOKENS = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export type FontWeightToken = keyof typeof FONT_WEIGHT_TOKENS;

/** Longest comfortable measure for continuous reading. */
export const READING_MEASURE_CLASS = 'max-w-prose';

/** Returns the utility class list for a named text style. */
export function textStyle(token: TextStyleToken): string {
  return TEXT_STYLE_TOKENS[token];
}