/**
 * Website sibling navigation.
 *
 * Overview, Pages, Content, Settings and (for those who manage the
 * website) Messages are closely related pages for the same Academy
 * website — reachable from the sidebar via the `academy-website` entry
 * (which lands on Overview; Messages also has its own entry, since an
 * inbox is somewhere people go directly). `getWebsiteTabs`
 * is the one place their `SectionTabs` entries are declared, reused by
 * every one of those pages, so a client editing Settings can jump straight
 * to Pages without detouring back through Overview each time.
 *
 * CMS phase 4 — Preview is no longer a tab: it is a read-only view of what
 * the editors already show, so it is reached from the "Preview" actions on
 * Overview, Pages and each page's menu (its route is unchanged). Each part
 * of the website has one home, and the paths below are the one place the
 * "edit" entry points are built (see the website UX audit in
 * `WebsiteOverviewPage`'s doc comment).
 */
import {
  FileText,
  Inbox,
  LayoutDashboard,
  MessageSquareQuote,
  Settings2,
} from 'lucide-react';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { NavigationItem, WebsitePage } from '@types';

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

/**
 * Whether the visual editor opens this page. Course details is drawn per
 * course, so it stays in the classic editor.
 */
export function opensInVisualEditor(
  page: Pick<WebsitePage, 'coreType'>
): boolean {
  return page.coreType !== 'courseDetails';
}

/** Where editing a page starts: the visual editor, or the classic editor when the visual editor cannot open it. */
export function pageEditPath(
  academyId: string,
  page: Pick<WebsitePage, 'id' | 'coreType'>
): string {
  return buildPath(
    opensInVisualEditor(page)
      ? DASHBOARD_ROUTES.websiteVisualEditor
      : DASHBOARD_ROUTES.websitePageEditor,
    { academyId, pageId: page.id }
  );
}

/**
 * "Edit website": the home page in the visual editor — `site` opens its
 * Site panel (theme, menu, header and footer). Without a home page, the
 * Pages list, where any page can be opened.
 */
export function visualEditorHomePath(
  academyId: string,
  pages: readonly Pick<WebsitePage, 'id' | 'coreType'>[],
  { site = false }: { readonly site?: boolean } = {}
): string {
  const home = pages.find((page) => page.coreType === 'home');
  if (!home) return buildPath(DASHBOARD_ROUTES.websitePages, { academyId });
  const path = buildPath(DASHBOARD_ROUTES.websiteVisualEditor, {
    academyId,
    pageId: home.id,
  });
  return site ? `${path}?panel=site` : path;
}

/** The read-only draft preview, opened on `pageId` when given. */
export function websitePreviewPath(academyId: string, pageId?: string): string {
  const path = buildPath(DASHBOARD_ROUTES.websitePreview, { academyId });
  return pageId ? `${path}?page=${encodeURIComponent(pageId)}` : path;
}
