/**
 * Responsive helpers.
 *
 * Breakpoint values are read from the design tokens, guaranteeing that runtime
 * checks and CSS breakpoints stay identical.
 */
import { BREAKPOINTS, BREAKPOINT_ORDER, deviceClassForWidth } from '@tokens';
import type { Breakpoint, DeviceClass } from '@tokens';

/** Returns the largest breakpoint satisfied by a viewport width. */
export function breakpointForWidth(width: number): Breakpoint {
  let matched: Breakpoint = BREAKPOINT_ORDER[0];

  for (const breakpoint of BREAKPOINT_ORDER) {
    if (width >= BREAKPOINTS[breakpoint]) {
      matched = breakpoint;
    }
  }

  return matched;
}

/** Returns true when the width reaches at least the given breakpoint. */
export function isAtLeast(width: number, breakpoint: Breakpoint): boolean {
  return width >= BREAKPOINTS[breakpoint];
}

/** Returns true when the width is below the given breakpoint. */
export function isBelow(width: number, breakpoint: Breakpoint): boolean {
  return width < BREAKPOINTS[breakpoint];
}

/** Maps a width to a coarse device class. */
export function deviceClass(width: number): DeviceClass {
  return deviceClassForWidth(width);
}

/**
 * Reports whether the primary pointer is coarse (touch).
 * Used to gate hover-only affordances so they never trap touch users.
 */
export function hasCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/** Reports whether the user has asked for reduced motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}