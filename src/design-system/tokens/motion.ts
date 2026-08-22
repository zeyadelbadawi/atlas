/**
 * Atlas motion tokens.
 *
 * Motion exists to explain a transition, orient the user, or confirm state.
 * Decorative animation is not part of the design language. Durations are short
 * because Atlas users work inside the product for long sessions.
 */

export const DURATION_TOKENS = {
  instant: 100,
  fast: 150,
  normal: 220,
  slow: 320,
  deliberate: 480,
} as const;

export type DurationToken = keyof typeof DURATION_TOKENS;

/** Cubic-bezier control points, consumable by Framer Motion. */
export const EASING_TOKENS = {
  standard: [0.25, 1, 0.5, 1],
  entrance: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
} as const;

export type EasingToken = keyof typeof EASING_TOKENS;

/** The same easing curves as CSS values, for transitions and keyframes. */
export const CSS_EASING_TOKENS = {
  standard: 'var(--ease-standard)',
  entrance: 'var(--ease-entrance)',
  exit: 'var(--ease-exit)',
} as const;

/** Converts a duration token to the seconds unit expected by Framer Motion. */
export function durationInSeconds(token: DurationToken): number {
  return DURATION_TOKENS[token] / 1000;
}

/** Maximum total stagger of a single orchestrated sequence, in seconds. */
export const MAX_STAGGER_SECONDS = 0.5;

/**
 * Computes a per-item stagger delay that keeps the whole sequence within
 * {@link MAX_STAGGER_SECONDS}, preventing animation fatigue on long lists.
 */
export function staggerDelay(itemCount: number): number {
  if (itemCount <= 1) return 0;
  const preferredDelay = 0.05;
  const maxDelay = MAX_STAGGER_SECONDS / itemCount;
  return Math.min(preferredDelay, maxDelay);
}