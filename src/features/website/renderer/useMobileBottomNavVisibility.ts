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

const LESSON_SCREEN_PATTERN = /^\/(ar\/)?my-learning\/courses\/[^/]+\/learn\/[^/]+/;

export function useMobileBottomNavVisibility(): boolean {
  const location = useLocation();
  return !LESSON_SCREEN_PATTERN.test(location.pathname);
}
