/**
 * Atelier's cinematic scenes (Reports/THEME_2_ATELIER_PLAN.md §4): a few
 * Home chapters become scroll-scrubbed scenes on the public site.
 *
 * Everything that moves is CSS (`../atelier-cinematic.css`): native
 * scroll-driven animations, `position: sticky` for pinning. This file only
 * marks a scene. The extra scroll a pinned scene needs (its runway) exists
 * only inside the CSS gate — scroll timelines supported, no reduced-motion
 * preference, a viewport large enough to pin — so every other visitor, the
 * server-rendered page without support, and every dashboard preview get
 * the static editorial layout with the same content and no empty space.
 *
 * A pinned stage must never clip or trap its content. The section decides
 * on the server whether its copy fits a window at all (`cinematic-budget`);
 * after hydration this component watches the stage and, when its content
 * is taller than its window, marks the scene `data-at-fit` so the CSS lets
 * go of the pin.
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import '../atelier-cinematic.css';

/** The scenes the Home can play. */
export type AtelierSceneName = 'opening' | 'method' | 'ink' | 'closing';

/**
 * How a pinned stage fits its window: `fits`; `release` — it does not, and
 * the pin is let go in place (the stage keeps its layout for a frame);
 * `overflow` — the scene is its static chapter. Releasing before changing
 * the layout means no element changes layout while it is pinned.
 */
type StageFit = 'fits' | 'release' | 'overflow';

/**
 * Watches a pinned stage. Inside the CSS gate the stage (the scene's first
 * child) is exactly one window tall (its `min-height`) unless its content
 * needs more. Outside the gate, or once a method or ink scene is static
 * (no `min-height`), there is nothing to measure: a window resize re-arms
 * the scene so the next measurement is taken in the pinned layout again.
 *
 * A ResizeObserver only — no scroll listener, nothing per frame.
 */
function useStageFit(
  scene: RefObject<HTMLElement>,
  enabled: boolean
): StageFit {
  const [fit, setFit] = useState<StageFit>('fits');
  useEffect(() => {
    const stage = scene.current?.firstElementChild;
    if (
      !enabled ||
      !(stage instanceof HTMLElement) ||
      typeof ResizeObserver === 'undefined'
    ) {
      return undefined;
    }
    const windowHeight = () =>
      parseFloat(getComputedStyle(stage).minHeight) || 0;
    const measure = () => {
      const box = windowHeight();
      if (box === 0) return;
      const overflows = stage.offsetHeight > box + 1;
      setFit((current) =>
        !overflows ? 'fits' : current === 'fits' ? 'release' : current
      );
    };
    const rearm = () => {
      if (windowHeight() > 0) measure();
      else setFit('fits');
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    window.addEventListener('resize', rearm);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', rearm);
    };
  }, [scene, enabled]);
  useEffect(() => {
    if (fit !== 'release') return undefined;
    // One frame released in place, then the static layout.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setFit('overflow'));
    });
    return () => cancelAnimationFrame(frame);
  }, [fit]);
  return fit;
}

/**
 * Wraps a chapter in its scene. `pinned` scenes get a runway after the
 * chapter: the scroll distance over which the chapter stays pinned while
 * its animation scrubs. Without `enabled` the chapter renders unwrapped.
 */
export function AtelierScene({
  name,
  enabled,
  pinned = true,
  style,
  children,
}: {
  readonly name: AtelierSceneName;
  readonly enabled: boolean;
  readonly pinned?: boolean;
  readonly style?: CSSProperties;
  readonly children: ReactNode;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const fit = useStageFit(ref, enabled && pinned);
  if (!enabled) return <>{children}</>;
  return (
    <div
      ref={ref}
      className="atc-scene"
      data-at-cinematic={name}
      data-at-fit={fit === 'fits' ? undefined : fit}
      style={style}
    >
      {children}
      {pinned ? <span aria-hidden className="atc-runway" /> : null}
    </div>
  );
}
