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
 */
import type { CSSProperties, ReactNode } from 'react';
import '../atelier-cinematic.css';

/** The scenes the Home can play. */
export type AtelierSceneName = 'opening' | 'method' | 'ink' | 'closing';

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
  if (!enabled) return <>{children}</>;
  return (
    <div className="atc-scene" data-at-cinematic={name} style={style}>
      {children}
      {pinned ? <span aria-hidden className="atc-runway" /> : null}
    </div>
  );
}
