/**
 * Whether the mobile bottom nav should render on the CURRENT route —
 * split into its own file (rather than living inside `MobileBottomNav.tsx`
 * alongside the component) purely so both that component and
 * `WebsiteChrome` (which needs the same boolean to apply matching bottom
 * padding to `<main>`) import one real source of truth, and so Fast
 * Refresh keeps working cleanly (a file mixing a hook export with a
 * component export loses fast-refresh's component-boundary detection).
 * See `MobileBottomNav.tsx`'s own doc comment for the full reasoning
 * behind hiding the bar on the immersive lesson/video screen.
 */
import { useLocation } from 'react-router-dom';

const LESSON_SCREEN_PATTERN =
  /^\/(ar\/)?my-learning\/courses\/[^/]+\/learn\/[^/]+/;

/**
 * P64 Phase 2 §E.1 — the learner dashboard brings its own bottom bar
 * (Overview / Courses / Assessments / Profile), which answers a different
 * question than this one (Home / Courses / My Learning / Profile) and is
 * the right one to show while a learner is inside their dashboard. Two
 * fixed bars would claim the bottom of a phone screen twice, so this one
 * stands down across `/my/*` rather than stacking.
 *
 * `-` is not `/`, so `/my-learning` — a different subtree entirely, and
 * still the player's home — does not match this.
 */
const LEARNER_DASHBOARD_PATTERN = /^\/(ar\/)?my(\/|$)/;

export function useMobileBottomNavVisibility(): boolean {
  const location = useLocation();
  return !(
    LESSON_SCREEN_PATTERN.test(location.pathname) ||
    LEARNER_DASHBOARD_PATTERN.test(location.pathname)
  );
}
