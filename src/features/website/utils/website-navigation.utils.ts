/**
 * Website sibling navigation.
 *
 * Overview, Pages, Content, Settings, and Preview are five closely related
 * pages for the same Academy website — reachable from the sidebar only via
 * one entry (`academy-website`, which lands on Overview). `getWebsiteTabs`
 * is the one place their `SectionTabs` entries are declared, reused by
 * every one of those pages, so a client editing Settings can jump straight
 * to Pages or Preview without detouring back through Overview each time.
 */
import { FileText, Globe, LayoutDashboard, MessageSquareQuote, Settings2 } from 'lucide-react';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { NavigationItem } from '@types';

export function getWebsiteTabs(academyId: string): readonly NavigationItem[] {
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
  ];
}
