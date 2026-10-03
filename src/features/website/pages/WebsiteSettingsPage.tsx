/**
 * Website Settings Page.
 *
 * Theme / Brand / SEO / Navigation, as tabs of one settings surface —
 * each tab is its own component (`WebsiteThemeTab`, etc.), composed here,
 * never one enormous page component.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { usePermissions } from '@hooks';
import { useConfirmDialog } from '@app/providers';
import { useUnsavedChangesRegistry } from '@features/unsaved-changes';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { SectionTabs } from '@components/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAcademy } from '@features/academy';
import { WebsiteDomainTab } from '@features/domain';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useWebsiteConfiguration, useWebsitePages } from '../hooks';
import { WebsitePublishBar } from '../components/WebsitePublishBar';
import { WebsiteThemeTab } from '../components/WebsiteThemeTab';
import { WebsiteBrandTab } from '../components/WebsiteBrandTab';
import { WebsiteSeoTab } from '../components/WebsiteSeoTab';
import { WebsiteNavigationTab } from '../components/WebsiteNavigationTab';
import { getWebsiteTabs } from '../utils/website-navigation.utils';
import type { BreadcrumbItem } from '@types';

const SETTINGS_TABS = [
  'theme',
  'brand',
  'seo',
  'navigation',
  'domain',
] as const;
type SettingsTab = (typeof SETTINGS_TABS)[number];

export default function WebsiteSettingsPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId } = useParams<{ academyId: string }>();
  const { hasPermission } = usePermissions();
  // `?tab=brand` (etc.) opens that tab — the launch checklist links here.
  const [searchParams] = useSearchParams();
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
          <TabsList>
            <TabsTrigger value="theme">
              {t('website:settings.tabs.theme')}
            </TabsTrigger>
            <TabsTrigger value="brand">
              {t('website:settings.tabs.brand')}
            </TabsTrigger>
            <TabsTrigger value="seo">
              {t('website:settings.tabs.seo')}
            </TabsTrigger>
            <TabsTrigger value="navigation">
              {t('website:settings.tabs.navigation')}
            </TabsTrigger>
            <TabsTrigger value="domain">
              {t('website:settings.tabs.domain')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="theme" className="pt-4">
            <WebsiteThemeTab
              academyId={academyId}
              academyName={academy.name}
              academyLogo={academy.logo}
              configuration={configuration}
              pages={pages}
            />
          </TabsContent>

          <TabsContent value="brand" className="pt-4">
            <WebsiteBrandTab
              academyId={academyId}
              academyName={academy.name}
              academyLogo={academy.logo}
              configuration={configuration}
              pages={pages}
            />
          </TabsContent>

          <TabsContent value="seo" className="pt-4">
            <WebsiteSeoTab
              academyId={academyId}
              configuration={configuration}
            />
          </TabsContent>

          <TabsContent value="navigation" className="pt-4">
            <WebsiteNavigationTab
              academyId={academyId}
              configuration={configuration}
              pages={pages}
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
