/**
 * Website Preview Page.
 *
 * A full, authenticated, in-dashboard preview of the website's current
 * DRAFT configuration — the real `WebsiteRenderer`, desktop/tablet/mobile,
 * every page (including hidden ones, since this is the owner's own
 * review surface, not the public site).
 *
 * There is no real public multi-tenant routing yet — no dynamic-subdomain
 * infrastructure exists for Atlas to serve a Tenant's actual public
 * website from (that is explicitly out of scope: Prompt 8 only modeled
 * subdomain *allocation*, never public serving, and Prompt 9 must not
 * invent DNS/hosting infrastructure). This page is the honest substitute:
 * it proves the exact same renderer that will eventually serve the real
 * public site, without pretending that public site already exists (see
 * `Reports/ARCHITECTURE.md`, Prompt 9, "Public Website Routing Boundary").
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { SectionTabs } from '@components/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAcademy } from '@features/academy';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { useWebsiteConfiguration, useWebsitePages } from '../hooks';
import {
  PreviewViewport,
  type PreviewBreakpoint,
} from '../components/PreviewViewport';
import { WebsiteRenderer } from '../renderer';
import { getWebsiteTabs } from '../utils/website-navigation.utils';
import {
  PUBLIC_WEBSITE_LOCALES,
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  DEFAULT_PUBLIC_WEBSITE_LOCALE,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';
import type { BreadcrumbItem } from '@types';

export default function WebsitePreviewPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId } = useParams<{ academyId: string }>();

  const academyQuery = useAcademy(academyId ?? '');
  const configQuery = useWebsiteConfiguration(academyId ?? '');
  const pagesQuery = useWebsitePages(academyId ?? '', {
    query: { pagination: { page: 1, pageSize: 50 } },
  });

  const [breakpoint, setBreakpoint] = useState<PreviewBreakpoint>('desktop');
  const [selectedPageId, setSelectedPageId] = useState<string>();
  // Phase 6 — the site is bilingual by default; the review surface should
  // let the Owner check both real, rendered languages before they ever
  // publish, not just trust the site "is" bilingual.
  const [previewLocale, setPreviewLocale] = useState<PublicWebsiteLocale>(
    DEFAULT_PUBLIC_WEBSITE_LOCALE
  );

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
        <PageHeader titleKey="website:preview.title" />
        <ErrorState onRetry={refetchAll} />
      </PageContainer>
    );
  }

  const academy = academyQuery.data;
  const configuration = configQuery.data;
  const pages = pagesQuery.data.items;
  const activePage =
    pages.find((page) => page.id === selectedPageId) ??
    pages.find((page) => page.coreType === 'home') ??
    pages[0];

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.academyOverview',
      label: academy.name,
      path: DASHBOARD_ROUTES.academy,
    },
    { labelKey: 'website:preview.title' },
  ];

  return (
    <PageContainer fullWidth>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          titleKey="website:preview.title"
          descriptionKey="website:preview.subtitle"
          breadcrumbs={breadcrumbs}
          actions={
            <div className="flex items-center gap-2">
              <Select
                value={previewLocale}
                onValueChange={(value) =>
                  setPreviewLocale(value as PublicWebsiteLocale)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PUBLIC_WEBSITE_LOCALES.map((locale) => (
                    <SelectItem key={locale} value={locale}>
                      {PUBLIC_WEBSITE_LOCALE_LABELS[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={activePage?.id} onValueChange={setSelectedPageId}>
                <SelectTrigger className="w-56">
                  <SelectValue
                    placeholder={t('website:preview.pageSelectPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {pages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        <SectionTabs items={getWebsiteTabs(academyId)} />

        {activePage ? (
          <PreviewViewport
            breakpoint={breakpoint}
            onBreakpointChange={setBreakpoint}
            dir={PUBLIC_WEBSITE_LOCALE_DIRECTION[previewLocale]}
            lang={previewLocale}
          >
            <WebsiteRenderer
              academyId={academyId}
              academyName={academy.name}
              academyLogo={academy.logo}
              configuration={configuration}
              pages={pages}
              page={activePage}
              previewCourseId={undefined}
              onNavigate={setSelectedPageId}
              locale={previewLocale}
            />
          </PreviewViewport>
        ) : (
          <ErrorState kind="notFound" />
        )}
      </div>
    </PageContainer>
  );
}
