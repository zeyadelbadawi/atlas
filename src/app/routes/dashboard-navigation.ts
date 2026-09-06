/**
 * Smart back-navigation for the dashboard shell.
 *
 * The dashboard's routes are declared flat (see `route-paths.ts`) but their
 * URLs still encode a real hierarchy — `/dashboard/tenant/billing/checkout/...`
 * is logically nested under Billing, which is nested under the Tenant
 * dashboard. This module reads that hierarchy directly out of
 * `DASHBOARD_ROUTES` — the single route registry every other consumer already
 * trusts — instead of hand-maintaining a second "parent map" that would drift
 * out of sync as routes are added.
 *
 * This is the *fallback* target only, used when there is no real in-app
 * navigation history to go back through (see `useSmartBack`). It exists so a
 * user who lands deep in the app via a fresh link, a refresh, or a
 * newly-opened tab still gets a sensible "up" instead of a dead button.
 */
import { DASHBOARD_ROUTES } from './route-paths';

/**
 * Routes that never make sense as a landing page for "back" — each one
 * immediately redirects the user somewhere else, so stopping there would
 * either bounce them right back to where they came from or forward them into
 * a different page than the one implied by the button. Skipped in favour of
 * their own next ancestor.
 */
const NON_LANDABLE_ROUTES = new Set<string>([
  DASHBOARD_ROUTES.learning, // redirects to `myLearning`
  DASHBOARD_ROUTES.learningCourseLearn, // resolves to a lesson and redirects there
]);

const ROUTE_TEMPLATES = Object.values(DASHBOARD_ROUTES) as string[];

/** Splits a path into its non-empty segments. */
function segmentsOf(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/**
 * Whether `pathSegments` is a concrete match for `templateSegments` — same
 * length, and every literal template segment equal to its counterpart
 * (`:param` segments match anything, since the real value already lives in
 * `pathSegments`).
 */
function matchesTemplate(
  pathSegments: readonly string[],
  templateSegments: readonly string[]
): boolean {
  if (pathSegments.length !== templateSegments.length) return false;

  return templateSegments.every(
    (segment, index) =>
      segment.startsWith(':') || segment === pathSegments[index]
  );
}

/**
 * Resolves the logical parent of a dashboard path by walking up its own URL
 * segments and returning the first ancestor that matches a real, landable
 * route. Returns `null` at the dashboard root, where there is no parent to
 * go back to — callers should hide the back control in that case.
 *
 * @example
 * resolveDashboardBackPath('/dashboard/tenant/billing/checkout/plan/growth')
 * // '/dashboard/tenant/billing' — the nearest real ancestor route
 */
export function resolveDashboardBackPath(pathname: string): string | null {
  const segments = segmentsOf(pathname);

  // Walk from the immediate parent up to (but not including) an empty path,
  // so the last candidate tried is always `/dashboard` itself.
  for (let length = segments.length - 1; length >= 1; length -= 1) {
    const candidateSegments = segments.slice(0, length);
    const candidatePath = `/${candidateSegments.join('/')}`;

    const matchedTemplate = ROUTE_TEMPLATES.find((template) =>
      matchesTemplate(candidateSegments, segmentsOf(template))
    );

    if (matchedTemplate && !NON_LANDABLE_ROUTES.has(matchedTemplate)) {
      return candidatePath;
    }
  }

  return pathname === DASHBOARD_ROUTES.root ? null : DASHBOARD_ROUTES.root;
}
