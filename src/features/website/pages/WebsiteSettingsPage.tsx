/**
 * Website Settings Page.
 *
 * Theme / Brand / SEO / Navigation, as tabs of one settings surface —
 * each tab is its own component (`WebsiteThemeTab`, etc.), composed here,
 * never one enormous page component.
 */
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAcademy } from '@features/academy';
import { useWebsiteConfiguration, useWebsitePages } from '../hooks';
import { WebsitePublishBar } from '../components/WebsitePublishBar';
import { WebsiteThemeTab } from '../components/WebsiteThemeTab';
import { WebsiteBrandTab } from '../components/WebsiteBrandTab';
import { WebsiteSeoTab } from '../components/WebsiteSeoTab';
import { WebsiteNavigationTab } from '../components/WebsiteNavigationTab';

export default function WebsiteSettingsPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId } = useParams<{ academyId: string }>();

  const academyQuery = useAcademy(academyId ?? '');
  const configQuery = useWebsiteConfiguration(academyId ?? '');
  const pagesQuery = useWebsitePages(academyId ?? '', {
    query: { pagination: { page: 1, pageSize: 50 } },
  });

  const isLoading = academyQuery.isLoading || configQuery.isLoading || pagesQuery.isLoading;
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

  if (error || !academyQuery.data || !configQuery.data || !pagesQuery.data || !academyId) {
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

  return (
    <PageContainer>
      <PageHeader
        titleKey="website:settings.title"
        descriptionKey="website:settings.subtitle"
      />

      <div className="space-y-6">
        <WebsitePublishBar academyId={academyId} status={configuration.status} />

        <Tabs defaultValue="theme">
          <TabsList>
            <TabsTrigger value="theme">{t('website:settings.tabs.theme')}</TabsTrigger>
            <TabsTrigger value="brand">{t('website:settings.tabs.brand')}</TabsTrigger>
            <TabsTrigger value="seo">{t('website:settings.tabs.seo')}</TabsTrigger>
            <TabsTrigger value="navigation">{t('website:settings.tabs.navigation')}</TabsTrigger>
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
            <WebsiteBrandTab academyId={academyId} configuration={configuration} />
          </TabsContent>

          <TabsContent value="seo" className="pt-4">
            <WebsiteSeoTab academyId={academyId} configuration={configuration} />
          </TabsContent>

          <TabsContent value="navigation" className="pt-4">
            <WebsiteNavigationTab
              academyId={academyId}
              configuration={configuration}
              pages={pages}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
