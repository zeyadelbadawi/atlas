/**
 * useResetScrollOnReveal — for a view that REPLACES another in place
 * without a navigation (a long form swapped for its success card).
 *
 * Routing never sees that swap, so the window keeps the old view's offset:
 * after submitting a form whose button sat at the bottom, the much shorter
 * success view rendered above the viewport and the user was left looking
 * at an empty page (Task 5, reproduced on Create Course). When `revealed`
 * turns true this scrolls to the top and moves focus to `focusRef` (the
 * new view's heading) without a second jump, so keyboard and screen-reader
 * users land where sighted users do.
 */
import { useEffect, type RefObject } from 'react';

export function useResetScrollOnReveal(
  revealed: boolean,
  focusRef?: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    if (!revealed) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    focusRef?.current?.focus({ preventScroll: true });
  }, [revealed, focusRef]);
}
