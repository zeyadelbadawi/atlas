/**
 * Organization(s) and Community are not sidebar entries.
 *
 * Every dashboard — desktop, collapsed and the mobile drawer — renders the
 * one `getDashboardNavigation` list (`DashboardSidebar`), so an entry absent
 * here is absent for every role in every variant. The pages themselves stay:
 * their routes are still registered and reachable by URL and in-page links.
 */
import { describe, expect, it } from 'vitest';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { flattenNavigation, getDashboardNavigation } from './navigation.config';

const HIDDEN_PATHS = [
  DASHBOARD_ROUTES.organization,
  DASHBOARD_ROUTES.platformOrganizations,
  DASHBOARD_ROUTES.announcements,
  DASHBOARD_ROUTES.blog,
];

describe('hidden dashboard sections', () => {
  for (const academyId of [undefined, 'academy-1']) {
    const sections = getDashboardNavigation(academyId);
    const items = flattenNavigation(sections);

    it(`has no Organization or Community section (academy ${academyId ?? 'none'})`, () => {
      const sectionIds = sections.map((section) => section.id);
      expect(sectionIds).not.toContain('organization');
      expect(sectionIds).not.toContain('community');
      const labels = [
        ...sections.map((section) => section.labelKey),
        ...items.map((item) => item.labelKey),
      ];
      expect(labels).not.toContain('navigation:sections.organization');
      expect(labels).not.toContain('navigation:sections.community');
      expect(labels).not.toContain('navigation:items.platformOrganizations');
    });

    it(`links none of their pages (academy ${academyId ?? 'none'})`, () => {
      const paths = items.map((item) => item.path);
      for (const path of HIDDEN_PATHS) expect(paths).not.toContain(path);
    });
  }

  it('keeps the routes themselves', () => {
    for (const path of HIDDEN_PATHS) expect(path).toMatch(/^\/dashboard\//);
  });
});
