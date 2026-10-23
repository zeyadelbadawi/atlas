/**
 * Website Settings Page.
 *
 * Theme / Menu, header & footer / SEO / Language / Domain, as tabs of one
 * settings surface — each tab is its own component (`WebsiteThemeTab`,
 * etc.), composed here, never one enormous page component.
 *
 * CMS phase 4 — the theme and the menu, header and footer are also in the
 * visual editor's Site panel, beside the page they change; their tabs say
 * so and link there (`?panel=site`), so both places are one feature, not
 * two. Logo and colours live in Brand Studio, linked from the Theme tab.
 * The open tab is in the address (`?tab=`), so it can be linked to and
 * survives a reload.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Brush, MousePointerClick } from 'lucide-react';
import { usePermissions } from '@hooks';
import { useConfirmDialog } from '@app/providers';
import { useUnsavedChangesRegistry } from '@features/unsaved-changes';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { SectionTabs } from '@components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAcademy } from '@features/academy';
import { WebsiteDomainTab } from '@features/domain';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useWebsiteConfiguration, useWebsitePages } from '../hooks';
import { WebsitePublishBar } from '../components/WebsitePublishBar';
import { WebsiteThemeTab } from '../components/WebsiteThemeTab';
import { WebsiteSeoTab } from '../components/WebsiteSeoTab';
import { WebsiteNavigationTab } from '../components/WebsiteNavigationTab';
import { WebsiteLanguageTab } from '../components/WebsiteLanguageTab';
import { WebsiteContentLocaleProvider } from '../components/website-content-locale';
import { resolveDefaultLocale } from '../constants/locale.constants';
import { WebsiteSitemapPreviewCard } from '../components/WebsiteSitemapPreviewCard';
import {
  getWebsiteTabs,
  visualEditorHomePath,
} from '../utils/website-navigation.utils';
import type { BreadcrumbItem, WebsitePage } from '@types';

/** Look and layout first (also in the visual editor), then site details. */
const SETTINGS_TABS = [
  'theme',
  'navigation',
  'seo',
  'language',
  'domain',
] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

/**
 * B0-WEB-02 — every bilingual field on this page requires the site's main
 * language (`LocalizedTextField`): the saved configuration (the same cached
 * query the page reads) says which.
 */
export default function WebsiteSettingsPage(): JSX.Element {
  const { academyId } = useParams<{ academyId: string }>();
  const configQuery = useWebsiteConfiguration(academyId ?? '');
  return (
    <WebsiteContentLocaleProvider
      value={resolveDefaultLocale(configQuery.data?.defaultLocale)}
    >
      <WebsiteSettings />
    </WebsiteContentLocaleProvider>
  );
}

function WebsiteSettings(): JSX.Element {
  const { t } = useTranslation();
  const { academyId } = useParams<{ academyId: string }>();
  const { hasPermission } = usePermissions();
  // `?tab=brand` (etc.) opens that tab — the launch checklist links here.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const initialTab = SETTINGS_TABS.includes(requestedTab as SettingsTab)
    ? (requestedTab as SettingsTab)
    : 'theme';
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const { confirm } = useConfirmDialog();
  const unsaved = useUnsavedChangesRegistry();

  /*
    Each tab's form unmounts when another tab opens, so switching away
    from unsaved edits used to drop them without a word — the route
    blocker never saw it, because no navigation happened. Ask first, the
    same question leaving the page asks.
  */
  const handleTabChange = async (next: string) => {
    if (next === tab) return;
    if (unsaved?.isDirtyNow()) {
      const leave = await confirm({
        titleKey: 'common:unsavedChanges.title',
        descriptionKey: 'common:unsavedChanges.description',
        confirmLabelKey: 'common:unsavedChanges.leave',
        cancelLabelKey: 'common:unsavedChanges.stay',
        intent: 'destructive',
      });
      if (!leave) return;
    }
    setTab(next as SettingsTab);
    setSearchParams(
      (params) => {
        const updated = new URLSearchParams(params);
        updated.set('tab', next);
        return updated;
      },
      { replace: true }
    );
  };

  const academyQuery = useAcademy(academyId ?? '');
  const configQuery = useWebsiteConfiguration(academyId ?? '');
  const pagesQuery = useWebsitePages(academyId ?? '', {
    query: { pagination: { page: 1, pageSize: 50 } },
  });

  const isLoading =
    academyQuery.isLoading || configQuery.isLoading || pagesQuery.isLoading;
  const error = academyQuery.error ?? configQuery.error ?? pagesQuery.error;

  const refetchAll = () => {
    void academyQuery.refetch();
    void configQuery.refetch();
    void pagesQuery.refetch();
  };

  // The logo and colours moved to the one Visual Identity page (Task G);
  // old `?tab=brand` links (bookmarks, the checklist) land there.
  if (requestedTab === 'brand' && academyId) {
    return (
      <Navigate
        replace
        to={buildPath(DASHBOARD_ROUTES.academyBranding, { academyId })}
      />
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (
    error ||
    !academyQuery.data ||
    !configQuery.data ||
    !pagesQuery.data ||
    !academyId
  ) {
    return (
      <PageContainer>
        <PageHeader titleKey="website:settings.title" />
        <ErrorState onRetry={refetchAll} />
      </PageContainer>
    );
  }

  const academy = academyQuery.data;
  const configuration = configQuery.data;
  const pages = pagesQuery.data.items;

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.academyOverview',
      label: academy.name,
      path: DASHBOARD_ROUTES.academy,
    },
    {
      labelKey: 'website:overview.title',
      path: buildPath(DASHBOARD_ROUTES.websiteOverview, { academyId }),
    },
    { labelKey: 'website:settings.title' },
  ];

  return (
    <PageContainer>
      <PageHeader
        titleKey="website:settings.title"
        descriptionKey="website:settings.subtitle"
        breadcrumbs={breadcrumbs}
      />

      <SectionTabs
        items={getWebsiteTabs(academyId, {
          canManage: hasPermission('academy.website.manage'),
        })}
      />

      <div className="space-y-6">
        <WebsitePublishBar
          academyId={academyId}
          status={configuration.status}
          lastPublishedAt={configuration.publishedAt}
          unpublishedChanges={configuration.unpublishedChanges}
        />

        <Tabs value={tab} onValueChange={(next) => void handleTabChange(next)}>
          <TabsList className="h-auto max-w-full flex-wrap justify-start">
            <TabsTrigger value="theme" className="min-h-9">
              {t('website:settings.tabs.theme')}
            </TabsTrigger>
            <TabsTrigger value="navigation" className="min-h-9">
              {t('website:settings.tabs.navigation')}
            </TabsTrigger>
            <TabsTrigger value="seo" className="min-h-9">
              {t('website:settings.tabs.seo')}
            </TabsTrigger>
            <TabsTrigger value="language" className="min-h-9">
              {t('website:settings.tabs.language')}
            </TabsTrigger>
            <TabsTrigger value="domain" className="min-h-9">
              {t('website:settings.tabs.domain')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="space-y-6 pt-4">
            <AlsoInVisualEditor academyId={academyId} pages={pages} />
            <BrandStudioLink academyId={academyId} />
            <WebsiteThemeTab
              academyId={academyId}
              academyName={academy.name}
              academyLogo={academy.logo}
              configuration={configuration}
              pages={pages}
            />
          </TabsContent>

          <TabsContent value="seo" className="space-y-6 pt-4">
            <WebsiteSeoTab
              academyId={academyId}
              configuration={configuration}
            />
            <WebsiteSitemapPreviewCard
              configuration={configuration}
              pages={pages}
            />
          </TabsContent>

          <TabsContent value="navigation" className="space-y-6 pt-4">
            <AlsoInVisualEditor academyId={academyId} pages={pages} />
            <WebsiteNavigationTab
              academyId={academyId}
              configuration={configuration}
              pages={pages}
            />
          </TabsContent>

          <TabsContent value="language" className="pt-4">
            <WebsiteLanguageTab
              academyId={academyId}
              configuration={configuration}
            />
          </TabsContent>

          <TabsContent value="domain" className="pt-4">
            <WebsiteDomainTab
              academyId={academyId}
              academySlug={academy.slug}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}

/**
 * The theme and the menu, header and footer are also edited in the visual
 * editor's Site panel: said here, with the way there.
 */
function AlsoInVisualEditor({
  academyId,
  pages,
}: {
  readonly academyId: string;
  readonly pages: readonly WebsitePage[];
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="settings-also-in-editor"
    >
      <div className="flex items-start gap-3">
        <MousePointerClick
          className="mt-0.5 size-5 shrink-0 text-primary"
          aria-hidden
        />
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            {t('website:settings.alsoInEditor.title')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('website:settings.alsoInEditor.description')}
          </p>
        </div>
      </div>
      <Button asChild variant="outline" className="h-11 shrink-0 sm:h-10">
        <Link to={visualEditorHomePath(academyId, pages, { site: true })}>
          {t('website:settings.alsoInEditor.action')}
        </Link>
      </Button>
    </div>
  );
}

/** Logo and colours have one home, Brand Studio: the way there from Theme. */
function BrandStudioLink({
  academyId,
}: {
  readonly academyId: string;
}): JSX.Element | null {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  if (!hasPermission('academy.branding.update')) return null;
  return (
    <Card data-testid="settings-brand-link">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Brush
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              {t('website:settings.brandLink.title')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('website:settings.brandLink.description')}
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="h-11 shrink-0 sm:h-10">
          <Link to={buildPath(DASHBOARD_ROUTES.academyBranding, { academyId })}>
            {t('website:settings.brandLink.action')}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
