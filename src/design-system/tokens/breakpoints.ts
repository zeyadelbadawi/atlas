/**
 * Atlas breakpoint tokens.
 *
 * Values mirror `tailwind.config.ts` exactly so runtime breakpoint detection
 * and CSS breakpoints can never drift apart. Atlas is designed mobile-first:
 * the base style targets the smallest viewport and each breakpoint layers on.
 */

export const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1800,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** Breakpoint names ordered from the smallest viewport upward. */
export const BREAKPOINT_ORDER: readonly Breakpoint[] = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
];

/** Device classes used when behaviour must change, not just layout. */
export const DEVICE_CLASSES = ['mobile', 'tablet', 'desktop', 'wide'] as const;

export type DeviceClass = (typeof DEVICE_CLASSES)[number];

/** The breakpoint at which the persistent dashboard sidebar appears. */
export const SIDEBAR_BREAKPOINT: Breakpoint = 'lg';

/** Maps a viewport width to a coarse device class. */
export function deviceClassForWidth(width: number): DeviceClass {
  if (width < BREAKPOINTS.md) return 'mobile';
  if (width < BREAKPOINTS.lg) return 'tablet';
  if (width < BREAKPOINTS['3xl']) return 'desktop';
  return 'wide';
}

/** Builds the media query string for a minimum breakpoint. */
export function minWidthQuery(breakpoint: Breakpoint): string {
  return `(min-width: ${BREAKPOINTS[breakpoint]}px)`;
}