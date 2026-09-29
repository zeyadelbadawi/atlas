/**
 * useReveal — the CSS-first, one-time scroll reveal (Theme 1 plan §G).
 *
 * Content is never hidden unless it can be revealed:
 *   - no `IntersectionObserver`, or `prefers-reduced-motion: reduce` →
 *     `revealed` at once (the final, readable state);
 *   - already in the viewport when it mounts → `revealed` at once (nothing
 *     above the fold ever blinks out and back in);
 *   - otherwise `pending` (hidden by CSS) until 15 % of it is visible, then
 *     `revealed` for good; the observer disconnects after that.
 * The element stays in the DOM throughout, so crawlers and assistive tech
 * always see it. The transition itself is CSS (`Reveal`); only transform
 * and opacity animate.
 */
import { useLayoutEffect, useRef, useState } from 'react';

export type RevealState = 'pending' | 'revealed';

const THRESHOLD = 0.15;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const height = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < height && rect.bottom > 0;
}

export function useReveal<TElement extends Element>(): {
  readonly ref: React.RefObject<TElement>;
  readonly state: RevealState;
} {
  const ref = useRef<TElement>(null);
  const [state, setState] = useState<RevealState>('revealed');

  // Layout effect: decided before the first paint, so an element that
  // should wait is never painted visible first.
  useLayoutEffect(() => {
    const element = ref.current;
    if (
      !element ||
      typeof IntersectionObserver === 'undefined' ||
      prefersReducedMotion() ||
      isInViewport(element)
    ) {
      return undefined;
    }
    setState('pending');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState('revealed');
          observer.disconnect();
        }
      },
      { threshold: THRESHOLD }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, state };
}
