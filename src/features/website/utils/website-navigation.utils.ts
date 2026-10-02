/**
 * Website sibling navigation.
 *
 * Overview, Pages, Content, Settings, Preview and (for those who manage
 * the website) Messages are closely related pages for the same Academy
 * website — reachable from the sidebar via the `academy-website` entry
 * (which lands on Overview; Messages also has its own entry, since an
 * inbox is somewhere people go directly). `getWebsiteTabs`
 * is the one place their `SectionTabs` entries are declared, reused by
 * every one of those pages, so a client editing Settings can jump straight
 * to Pages or Preview without detouring back through Overview each time.
 */
import {
  FileText,
  Globe,
  Inbox,
  LayoutDashboard,
  MessageSquareQuote,
  Settings2,
} from 'lucide-react';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { NavigationItem } from '@types';

export interface WebsiteTabsOptions {
  /**
   * Whether the viewer manages the website (`academy.website.manage`) —
   * the Contact form Messages inbox is shown only then, matching the
   * backend's Owner/Manager rule and the sidebar entry's own gate.
   */
  readonly canManage?: boolean;
}

export function getWebsiteTabs(
  academyId: string,
  { canManage = false }: WebsiteTabsOptions = {}
): readonly NavigationItem[] {
  return [
    {
      id: 'website-tab-overview',
      labelKey: 'website:overview.title',
      path: buildPath(DASHBOARD_ROUTES.websiteOverview, { academyId }),
      icon: LayoutDashboard,
    },
    {
      id: 'website-tab-pages',
      labelKey: 'website:overview.pages.title',
      path: buildPath(DASHBOARD_ROUTES.websitePages, { academyId }),
      icon: FileText,
      // A specific page's editor is a drill-down of Pages — still "on" this tab.
      matchNestedPaths: true,
    },
    {
      id: 'website-tab-content',
      labelKey: 'website:overview.content.title',
      path: buildPath(DASHBOARD_ROUTES.websiteContent, { academyId }),
      icon: MessageSquareQuote,
    },
    {
      id: 'website-tab-settings',
      labelKey: 'website:overview.settings.title',
      path: buildPath(DASHBOARD_ROUTES.websiteSettings, { academyId }),
      icon: Settings2,
    },
    {
      id: 'website-tab-preview',
      labelKey: 'website:overview.preview.title',
      path: buildPath(DASHBOARD_ROUTES.websitePreview, { academyId }),
      icon: Globe,
    },
    ...(canManage
      ? [
          {
            id: 'website-tab-messages',
            labelKey: 'website:messages.title',
            path: buildPath(DASHBOARD_ROUTES.websiteMessages, { academyId }),
            icon: Inbox,
          },
        ]
      : []),
  ];
}
