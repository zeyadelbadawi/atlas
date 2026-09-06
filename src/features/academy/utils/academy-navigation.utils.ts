/**
 * Academy admin sibling navigation.
 *
 * Members, Branding, and Settings are three closely related admin pages
 * for the same Academy — previously reachable only by returning to the
 * sidebar for every switch between them. `getAcademyAdminTabs` is the one
 * place their `SectionTabs` entries are declared, reused by all three
 * pages, so the set (and its icons/labels — matching the sidebar's own
 * `navigation.config.ts` entries exactly) can never drift between them.
 */
import { Palette, Settings, Users } from 'lucide-react';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { NavigationItem } from '@types';

export function getAcademyAdminTabs(academyId: string): readonly NavigationItem[] {
  return [
    {
      id: 'academy-admin-members',
      labelKey: 'navigation:items.academyMembers',
      path: buildPath(DASHBOARD_ROUTES.academyMembers, { academyId }),
      icon: Users,
    },
    {
      id: 'academy-admin-branding',
      labelKey: 'navigation:items.academyBranding',
      path: buildPath(DASHBOARD_ROUTES.academyBranding, { academyId }),
      icon: Palette,
    },
    {
      id: 'academy-admin-settings',
      labelKey: 'navigation:items.academySettings',
      path: buildPath(DASHBOARD_ROUTES.academySettings, { academyId }),
      icon: Settings,
    },
  ];
}
