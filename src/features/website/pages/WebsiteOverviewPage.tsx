/**
 * Website Overview Page (Prompt 10; reorganised in CMS phase 4).
 *
 * The landing surface for Website Management, built around one primary
 * path: "Edit website" opens the home page in the visual editor (Preview
 * and the live site beside it). Then the publish status (`WebsitePublishBar`
 * — still the ONE publish action), the launch checklist, and "Where to
 * change what": each part of the website and its one home — page content
 * in the visual editor, theme/menu/header/footer in its Site panel, logo
 * and colours in Brand Studio, search engines/language/domain in Settings,
 * library content in Content, visitors' messages in Messages.
 *
 * The four link cards that repeated the tab bar are gone (the tabs are
 * right above), and the sitemap preview moved to Settings ▸ SEO, beside
 * the switches it depends on.
 */
import { useTranslation } from 'react-i18next';
import { useAcademyDomain } from '@features/domain';
import { Link, useParams } from 'react-router-dom';
import { usePermissions } from '@hooks';
import {
  Brush,
  ChevronRight,
  ExternalLink,
  Eye,
  Globe,
  Inbox,
  MessageSquareQuote,
  MousePointerClick,
  Palette,
  Settings2,
  type LucideIcon,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { apiErrorKind } from '@api';
import { SectionTabs } from '@components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcademy } from '@features/academy';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useWebsiteConfiguration, useWebsitePages } from '../hooks';
import { WebsitePublishBar } from '../components/WebsitePublishBar';
import { WebsiteLaunchChecklist } from '../components/WebsiteLaunchChecklist';
import { getAcademyPublicWebsiteUrl } from '../utils/public-website-link.utils';
import {
  getWebsiteTabs,
  visualEditorHomePath,
  websitePreviewPath,
} from '../utils/website-navigation.utils';
import { CONTENT_LIST_PAGE_SIZE } from '../constants/website.constants';
import type { BreadcrumbItem } from '@types';

export default function WebsiteOverviewPage(): JSX.Element {
  const { t } = useTranslation();
  const { academyId } = useParams<{ academyId: string }>();
  const { hasPermission } = usePermissions();

  const academyQuery = useAcademy(academyId ?? '');

  const domainQuery = useAcademyDomain(academyId ?? '');
  const configQuery = useWebsiteConfiguration(academyId ?? '');
  const pagesQuery = useWebsitePages(academyId ?? '', {
    query: { pagination: { page: 1, pageSize: CONTENT_LIST_PAGE_SIZE } },
  });

  const isLoading =
    academyQuery.isLoading ||
    configQuery.isLoading ||
    pagesQuery.isLoading ||
    domainQuery.isLoading;
  const error = academyQuery.error ?? configQuery.error ?? pagesQuery.error;

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error || !configQuery.data || !academyId) {
    return (
      <PageContainer>
        <PageHeader titleKey="website:overview.title" />
        <ErrorState
          kind={apiErrorKind(error)}
          onRetry={() => {
            void academyQuery.refetch();
            void configQuery.refetch();
            void pagesQuery.refetch();
          }}
        />
      </PageContainer>
    );
  }

  const pages = pagesQuery.data?.items ?? [];
  const canManage = hasPermission('academy.website.manage');
  const websitePath = (route: string) => buildPath(route, { academyId });
  const editPath = visualEditorHomePath(academyId, pages);

  // Each part of the website, and its one home (CMS phase 4).
  const homes: readonly WebsiteHome[] = [
    {
      id: 'pages',
      icon: MousePointerClick,
      key: 'pages',
      to: editPath,
    },
    {
      id: 'site',
      icon: Palette,
      key: 'site',
      to: visualEditorHomePath(academyId, pages, { site: true }),
    },
    // Brand Studio has its own permission; without it, the row would lead
    // to a page that refuses.
    ...(hasPermission('academy.branding.update')
      ? [
          {
            id: 'brand',
            icon: Brush,
            key: 'brand',
            to: websitePath(DASHBOARD_ROUTES.academyBranding),
          },
        ]
      : []),
    {
      id: 'settings',
      icon: Settings2,
      key: 'settings',
      to: `${websitePath(DASHBOARD_ROUTES.websiteSettings)}?tab=seo`,
    },
    {
      id: 'content',
      icon: MessageSquareQuote,
      key: 'content',
      to: websitePath(DASHBOARD_ROUTES.websiteContent),
    },
    ...(canManage
      ? [
          {
            id: 'messages',
            icon: Inbox,
            key: 'messages',
            to: websitePath(DASHBOARD_ROUTES.websiteMessages),
          },
        ]
      : []),
  ];

  // P63 — the canonical host (a connected custom domain, otherwise the
  // Atlas subdomain) is what the server says the website is addressed by.
  // P63g — the server's canonical host, else the server's allocation host;
  // never a host built from the slug and a compiled-in base domain.
  const publicUrl = academyQuery.data
    ? getAcademyPublicWebsiteUrl(
        academyQuery.data.slug,
        domainQuery.data?.canonicalHost?.host ??
          domainQuery.data?.subdomain?.fullHost
      )
    : undefined;
  const isPublished = configQuery.data.status === 'published';

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.academyOverview',
      label: academyQuery.data?.name,
      path: DASHBOARD_ROUTES.academy,
    },
    { labelKey: 'website:overview.title' },
  ];

  return (
    <PageContainer>
      <PageHeader
        titleKey="website:overview.title"
        descriptionKey="website:overview.subtitle"
        breadcrumbs={breadcrumbs}
      />

      <SectionTabs items={getWebsiteTabs(academyId, { canManage })} />

      <div className="space-y-6">
        {/* The one primary path: edit the website in the visual editor.
            Its address and the way to see it sit beside it — the only
            "Visit website" on this page. */}
        <Card data-testid="website-overview-start">
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Globe className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <h2 className="text-base font-semibold text-foreground">
                  {t('website:overview.start.title')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('website:overview.start.description')}
                </p>
                {publicUrl ? (
                  <p className="text-xs text-muted-foreground">
                    <span>{t('website:overview.publicUrl.label')}: </span>
                    <span
                      className="break-all font-mono"
                      dir="ltr"
                      data-ltr-content
                    >
                      {publicUrl}
                    </span>
                    {isPublished ? null : (
                      <span className="block">
                        {t('website:overview.publicUrl.notPublishedYet')}
                      </span>
                    )}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 lg:shrink-0 lg:justify-end">
              <Button asChild className="h-11" data-testid="website-edit">
                <Link to={editPath}>
                  <MousePointerClick
                    className="size-4"
                    strokeWidth={2}
                    aria-hidden
                  />
                  {t('website:overview.editWebsite')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11">
                <Link to={websitePreviewPath(academyId)}>
                  <Eye className="size-4" strokeWidth={2} aria-hidden />
                  {t('website:overview.previewDraft')}
                </Link>
              </Button>
              {publicUrl && isPublished ? (
                <Button asChild variant="outline" className="h-11">
                  <a href={publicUrl} target="_blank" rel="noreferrer">
                    <ExternalLink
                      className="size-4"
                      strokeWidth={2}
                      aria-hidden
                    />
                    {t('website:overview.visitWebsite')}
                  </a>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <WebsitePublishBar
          academyId={academyId}
          status={configQuery.data.status}
          lastPublishedAt={configQuery.data.publishedAt}
          unpublishedChanges={configQuery.data.unpublishedChanges}
        />

        <WebsiteLaunchChecklist
          academyId={academyId}
          configuration={configQuery.data}
          pages={pages}
        />

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">
              {t('website:overview.where.title')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('website:overview.where.help')}
            </p>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <ul
              className="divide-y divide-border border-t border-border"
              data-testid="website-overview-homes"
            >
              {homes.map((home) => (
                <li key={home.id}>
                  <Link
                    to={home.to}
                    className="group flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none sm:px-6"
                    data-testid={`website-home-${home.id}`}
                  >
                    <home.icon
                      className="size-5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {t(`website:overview.where.${home.key}.title`)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t(`website:overview.where.${home.key}.description`)}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-xs font-medium text-primary sm:inline">
                      {t(`website:overview.where.${home.key}.action`)}
                    </span>
                    <ChevronRight
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

interface WebsiteHome {
  readonly id: string;
  readonly icon: LucideIcon;
  /** `website:overview.where.<key>.{title,description,action}`. */
  readonly key: string;
  readonly to: string;
}
