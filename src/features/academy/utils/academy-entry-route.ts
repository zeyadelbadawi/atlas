import { DASHBOARD_ROUTES } from '@app/routes/route-paths';

/**
 * The sections the marketing site's signed-in CTAs open (`?open=` on the
 * bare chooser, e.g. "See my payments in the dashboard"): the site cannot
 * know which academy is the visitor's, so it names the section and the
 * chooser below fills in the academy. Anything else opens the overview, so
 * the parameter can never send anyone off a known academy route.
 */
const ACADEMY_ENTRY_ROUTES = {
  payments: DASHBOARD_ROUTES.academyPayments,
  courses: DASHBOARD_ROUTES.academyCourses,
  team: DASHBOARD_ROUTES.academyMembers,
  website: DASHBOARD_ROUTES.websiteOverview,
} as const;

export function academyEntryRoute(open: string | null): string {
  return open &&
    Object.prototype.hasOwnProperty.call(ACADEMY_ENTRY_ROUTES, open)
    ? ACADEMY_ENTRY_ROUTES[open as keyof typeof ACADEMY_ENTRY_ROUTES]
    : DASHBOARD_ROUTES.academyOverview;
}
