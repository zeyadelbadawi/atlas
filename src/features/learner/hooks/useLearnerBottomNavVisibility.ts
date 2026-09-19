/**
 * Whether the learner bottom bar should render on the CURRENT route.
 *
 * Hidden inside the player (§E.6, carried from the accessibility audit and
 * from the same product guidance that already hides the academy website's
 * own bar on the lesson screen): a fixed bar over an immersive activity
 * shrinks the video, covers the player's own action bar, and competes for
 * the exact strip of screen a phone has least of. Course browsing, the
 * course outline, assessments and the account pages all keep it — none of
 * those are full-bleed.
 *
 * "Inside the player" is expressed as "deeper than one course", not as a
 * list of activity segments: Phase 2 §E.2 owns the player's URLs and has
 * not published them yet, and a rule written against segment names would
 * silently stop matching the day it picks `/activities/` over `/learn/`.
 * `/my/courses/:courseId` itself — the course progress page — is a normal
 * dashboard page and keeps the bar.
 *
 * Split into its own file, like `useMobileBottomNavVisibility` before it,
 * so the bar and the shell's matching bottom padding read one source of
 * truth: if those two ever disagree, either the last CTA on the page sits
 * under the bar or an empty strip appears where it isn't.
 */
import { useLearnerSurface } from '../context/LearnerSurface.context';

/** Any path below one course — every activity screen the player owns. */
const PLAYER_SCREEN_PATTERN = /^\/my\/courses\/[^/]+\/.+/;

/**
 * The rule itself, on an already-unprefixed pathname.
 *
 * Exported so it can be asserted directly: the player's routes belong to
 * §E.2 and are not mounted yet, so exercising this through the router
 * today would only prove that `/my/*`'s catch-all redirect works.
 */
export function isLearnerPlayerPath(pathname: string): boolean {
  return PLAYER_SCREEN_PATTERN.test(pathname);
}

export function useLearnerBottomNavVisibility(): boolean {
  const { pathname } = useLearnerSurface();
  return !isLearnerPlayerPath(pathname);
}
