/**
 * Atlas icon tokens.
 *
 * Atlas uses a single icon library (lucide-react). Icons support text, they
 * never replace it: an icon-only control must always carry an accessible name.
 */

export const ICON_SIZE_TOKENS = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 24,
  display: 32,
} as const;

export type IconSizeToken = keyof typeof ICON_SIZE_TOKENS;

/** Stroke width tuned to the weight of the Atlas type families. */
export const ICON_STROKE_WIDTH = 1.75;

/** Utility classes matching each icon size token. */
export const ICON_SIZE_CLASS = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-[1.125rem]',
  lg: 'size-5',
  xl: 'size-6',
  display: 'size-8',
} as const;

/**
 * Icons that express direction must mirror in RTL. Icons that express a
 * concept (search, settings, user) must not.
 */
export const DIRECTIONAL_ICON_CLASS = 'rtl:-scale-x-100';

/** Default props shared by every Atlas icon usage. */
export const DEFAULT_ICON_PROPS = {
  size: ICON_SIZE_TOKENS.sm,
  strokeWidth: ICON_STROKE_WIDTH,
  'aria-hidden': true,
} as const;