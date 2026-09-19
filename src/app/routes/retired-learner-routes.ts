/**
 * Where a retired `/dashboard/learning/*` URL now sends the learner.
 *
 * D2 removes the learner surface from the management dashboard, but the
 * URLs it used to occupy are bookmarked, emailed and linked from old
 * notification templates — so they keep answering, as forwarding addresses
 * rather than pages. The forwarding table itself lives in `route-paths.ts`
 * with every other path declaration; what lives here is the one piece of
 * logic it needs: matching a CONCRETE pathname against the parameterised
 * templates and carrying `:courseId` across to the replacement.
 *
 * Kept separate from `dashboard-navigation.ts` (which answers "what is the
 * parent of this dashboard path") because these paths deliberately no
 * longer appear in `DASHBOARD_ROUTES` at all — a retired URL has a
 * successor, not an ancestor.
 *
 * The result is always a BARE learner path (`/my/courses/abc`). It is not a
 * URL: the replacement lives on the learner's own academy host, which only
 * the account's memberships can name — see `LearnerSurfaceRedirectPage` for
 * the host half of the redirect.
 */
import {
  LEARNER_ROUTES,
  RETIRED_DASHBOARD_LEARNER_ROUTES,
  buildPath,
} from './route-paths';

/** Splits a path into its non-empty segments. */
function segmentsOf(path: string): readonly string[] {
  return path.split('/').filter(Boolean);
}

/**
 * The parameters a concrete pathname supplies to a template, or `null` when
 * the two do not describe the same URL shape.
 */
function matchTemplate(
  pathname: string,
  template: string
): Record<string, string> | null {
  const pathSegments = segmentsOf(pathname);
  const templateSegments = segmentsOf(template);
  if (pathSegments.length !== templateSegments.length) return null;

  const params: Record<string, string> = {};

  for (const [index, segment] of templateSegments.entries()) {
    const value = pathSegments[index];
    if (segment.startsWith(':')) {
      params[segment.slice(1)] = value;
      continue;
    }
    if (segment !== value) return null;
  }

  return params;
}

/**
 * Resolves the `/my/*` path that replaces a retired dashboard learner URL.
 *
 * Falls back to the learner dashboard home for anything under
 * `/dashboard/learning` that no template claims: a URL that old is better
 * answered by the learner's own overview than by a dead end, and the
 * fallback is what keeps this function total for the router, which maps it
 * over paths this table is meant to cover.
 *
 * @example
 * resolveRetiredLearnerTarget('/dashboard/learning/courses/abc/learn/l1')
 * // '/my/courses/abc'
 */
export function resolveRetiredLearnerTarget(pathname: string): string {
  for (const { from, to } of RETIRED_DASHBOARD_LEARNER_ROUTES) {
    const params = matchTemplate(pathname, from);
    if (params) return buildPath(to, params);
  }

  return LEARNER_ROUTES.root;
}
