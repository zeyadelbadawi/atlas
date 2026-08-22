/**
 * Observes the viewport breakpoint.
 *
 * Layout should be solved in CSS wherever possible. This hook exists for the
 * cases where *behaviour* must differ — for example rendering the navigation as
 * a drawer instead of a sidebar rather than merely restyling it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BREAKPOINTS } from '@tokens';
import type { Breakpoint, DeviceClass } from '@tokens';
import { breakpointForWidth, deviceClass } from '@utils';

export interface BreakpointState {
  readonly breakpoint: Breakpoint;
  readonly device: DeviceClass;
  readonly width: number;
  /** True when the viewport is at least the given breakpoint. */
  readonly isAtLeast: (breakpoint: Breakpoint) => boolean;
  /** True when the viewport is below the given breakpoint. */
  readonly isBelow: (breakpoint: Breakpoint) => boolean;
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly isDesktop: boolean;
}

function currentWidth(): number {
  // Falls back to the smallest breakpoint so the mobile layout renders first.
  if (typeof window === 'undefined') return BREAKPOINTS.xs;
  return window.innerWidth;
}

export function useBreakpoint(): BreakpointState {
  const [width, setWidth] = useState<number>(currentWidth);

  useEffect(() => {
    // `resize` fires rapidly; a rAF gate keeps updates aligned with paints.
    let frameId = 0;

    const handleResize = (): void => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => setWidth(window.innerWidth));
    };

    window.addEventListener('resize', handleResize, { passive: true });
    handleResize();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isAtLeast = useCallback(
    (breakpoint: Breakpoint): boolean => width >= BREAKPOINTS[breakpoint],
    [width]
  );

  const isBelow = useCallback(
    (breakpoint: Breakpoint): boolean => width < BREAKPOINTS[breakpoint],
    [width]
  );

  return useMemo(() => {
    const device = deviceClass(width);

    return {
      breakpoint: breakpointForWidth(width),
      device,
      width,
      isAtLeast,
      isBelow,
      isMobile: device === 'mobile',
      isTablet: device === 'tablet',
      isDesktop: device === 'desktop' || device === 'wide',
    };
  }, [width, isAtLeast, isBelow]);
}