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
 *
 * CMS phase 4 — no longer one of the Website tabs (it shows what the
 * editors show, read-only): it is opened from "Preview" on Overview, Pages
 * and each page's menu (`?page=<id>` opens that page), and offers "Edit in
 * visual editor" for the page shown.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MousePointerClick } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@hooks';
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
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useWebsiteConfiguration, useWebsitePages } from '../hooks';
import {
  PreviewViewport,
  initialPreviewBreakpoint,
  type PreviewBreakpoint,
} from '../components/PreviewViewport';
import { WebsiteRenderer } from '../renderer';
import {
  getWebsiteTabs,
  opensInVisualEditor,
  pageEditPath,
} from '../utils/website-navigation.utils';
import {
  PUBLIC_WEBSITE_LOCALES,
  PUBLIC_WEBSITE_LOCALE_DIRECTION,
  PUBLIC_WEBSITE_LOCALE_LABELS,
  resolveDefaultLocale,
  type PublicWebsiteLocale,
} from '../constants/locale.constants';
import type { BreadcrumbItem } from '@types';

export default function WebsitePreviewPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId } = useParams<{ academyId: string }>();
  const { hasPermission } = usePermissions();

  const academyQuery = useAcademy(academyId ?? '');
  const configQuery = useWebsiteConfiguration(academyId ?? '');
  const pagesQuery = useWebsitePages(academyId ?? '', {
    query: { pagination: { page: 1, pageSize: 50 } },
  });

  const [breakpoint, setBreakpoint] = useState<PreviewBreakpoint>(
    initialPreviewBreakpoint
  );
  const [searchParams] = useSearchParams();
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>(
    () => searchParams.get('page') ?? undefined
  );
  // Phase 6 — the site is bilingual by default; the review surface should
  // let the Owner check both real, rendered languages before they ever
  // publish, not just trust the site "is" bilingual.
  // Opens in the site's main language (null until the admin picks one).
  const [chosenLocale, setPreviewLocale] = useState<PublicWebsiteLocale | null>(
    null
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
  const previewLocale =
    chosenLocale ?? resolveDefaultLocale(configuration.defaultLocale);
  // The site's navigation and links are built from the pages a visitor
  // can reach; a hidden page is not among them.
  const previewPages = pages.filter((candidate) => candidate.visible);
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
    {
      labelKey: 'website:overview.title',
      path: buildPath(DASHBOARD_ROUTES.websiteOverview, { academyId }),
    },
    { labelKey: 'website:preview.title' },
  ];
  const canEdit =
    hasPermission('academy.website.manage') &&
    activePage !== undefined &&
    opensInVisualEditor(activePage);

  return (
    <PageContainer fullWidth>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <PageHeader
          titleKey="website:preview.title"
          descriptionKey="website:preview.subtitle"
          breadcrumbs={breadcrumbs}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && activePage ? (
                <Button asChild className="h-11 sm:h-10">
                  <Link to={pageEditPath(academyId, activePage)}>
                    <MousePointerClick
                      className="size-4"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {t('website:visualEditor.editIn')}
                  </Link>
                </Button>
              ) : null}
              <Select
                value={previewLocale}
                onValueChange={(value) =>
                  setPreviewLocale(value as PublicWebsiteLocale)
                }
              >
                <SelectTrigger
                  className="h-11 w-32 sm:h-10"
                  aria-label={t('website:preview.localeLabel')}
                >
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
                <SelectTrigger
                  className="h-11 w-56 max-w-full sm:h-10"
                  aria-label={t('website:preview.pageSelectPlaceholder')}
                >
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

        <SectionTabs
          items={getWebsiteTabs(academyId, {
            canManage: hasPermission('academy.website.manage'),
          })}
        />

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
              pages={previewPages}
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
