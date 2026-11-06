/**
 * B4 (UX audit) — whether a scroll box is wider than the screen, and on
 * which side content is hidden. At 375 px the members table hid Status,
 * Joined and the Remove button in an inner scroll nobody could see.
 *
 * Direction-aware: in RTL, `scrollLeft` runs from 0 to negative values in
 * every current browser, so "start" is the right-hand edge there.
 */
import { useCallback, useEffect, useState } from 'react';

export interface HorizontalOverflow {
  /** Content is wider than the box. */
  readonly overflows: boolean;
  /** Hidden content before the reading start (left in LTR, right in RTL). */
  readonly hiddenStart: boolean;
  /** Hidden content after the reading end. */
  readonly hiddenEnd: boolean;
}

const NONE: HorizontalOverflow = {
  overflows: false,
  hiddenStart: false,
  hiddenEnd: false,
};

/** 1 px of slack: sub-pixel widths otherwise read as "1 px hidden". */
const SLACK = 1;

export function measureOverflow(element: HTMLElement): HorizontalOverflow {
  const range = element.scrollWidth - element.clientWidth;
  if (range <= SLACK) return NONE;
  const travelled = Math.abs(element.scrollLeft);
  return {
    overflows: true,
    hiddenStart: travelled > SLACK,
    hiddenEnd: travelled < range - SLACK,
  };
}

export function useHorizontalOverflow(
  element: HTMLElement | null
): HorizontalOverflow {
  const [state, setState] = useState<HorizontalOverflow>(NONE);

  const update = useCallback(() => {
    if (!element) return;
    const next = measureOverflow(element);
    setState((previous) =>
      previous.overflows === next.overflows &&
      previous.hiddenStart === next.hiddenStart &&
      previous.hiddenEnd === next.hiddenEnd
        ? previous
        : next
    );
  }, [element]);

  useEffect(() => {
    if (!element) return undefined;
    update();
    element.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(element);
    const table = element.firstElementChild;
    if (table) observer?.observe(table);
    return () => {
      element.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [element, update]);

  return state;
}
