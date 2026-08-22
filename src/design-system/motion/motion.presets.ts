/**
 * Framer Motion presets built from Atlas motion tokens.
 *
 * Components consume a named preset instead of declaring transitions inline,
 * which keeps motion consistent and prevents decorative animation from
 * entering the product.
 */
import type { Transition, Variants } from 'framer-motion';
import { DURATION_TOKENS, EASING_TOKENS, durationInSeconds } from '@tokens';

/** Mutable easing tuple, as expected by Framer Motion. */
type EasingTuple = [number, number, number, number];

function easing(token: keyof typeof EASING_TOKENS): EasingTuple {
  return [...EASING_TOKENS[token]] as EasingTuple;
}

/** Standard transition for entering content. */
export const ENTRANCE_TRANSITION: Transition = {
  duration: durationInSeconds('normal'),
  ease: easing('entrance'),
};

/** Exit transitions run at roughly 75% of the entrance duration. */
export const EXIT_TRANSITION: Transition = {
  duration: (DURATION_TOKENS.normal * 0.75) / 1000,
  ease: easing('exit'),
};

/** Transition for interface state changes such as tab or panel switches. */
export const STATE_TRANSITION: Transition = {
  duration: durationInSeconds('fast'),
  ease: easing('standard'),
};

/** Opacity-only entrance. The safest default for dense product surfaces. */
export const FADE_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: ENTRANCE_TRANSITION },
  exit: { opacity: 0, transition: EXIT_TRANSITION },
};

/** Short vertical rise. Signals that content has just arrived. */
export const RISE_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: ENTRANCE_TRANSITION },
  exit: { opacity: 0, y: 4, transition: EXIT_TRANSITION },
};

/** Scale-and-fade used by dialogs and popovers. */
export const OVERLAY_VARIANTS: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: ENTRANCE_TRANSITION },
  exit: { opacity: 0, scale: 0.98, transition: EXIT_TRANSITION },
};

/**
 * Page-level transition applied by the router shell. Movement is vertical so
 * the animation reads identically in LTR and RTL.
 */
export const PAGE_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: ENTRANCE_TRANSITION },
  exit: { opacity: 0, transition: EXIT_TRANSITION },
};

/**
 * Builds a staggered container/item variant pair for a known number of items.
 * The total stagger is capped so long lists never feel sluggish.
 */
export function createStaggerVariants(itemCount: number): {
  container: Variants;
  item: Variants;
} {
  const maxTotalStagger = 0.5;
  const perItemDelay =
    itemCount > 1 ? Math.min(0.05, maxTotalStagger / itemCount) : 0;

  return {
    container: {
      hidden: { opacity: 1 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: perItemDelay },
      },
    },
    item: RISE_VARIANTS,
  };
}