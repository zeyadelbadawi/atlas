/**
 * Website Overview Page (Prompt 10).
 *
 * The new landing surface for Website Management — quick links into
 * Pages, Content, Settings and Preview, plus the live publish status.
 * Reuses `WebsitePublishBar` unchanged (Prompt 9) — there is still only
 * ONE publish action in the whole feature.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Globe, MessageSquareQuote, Settings2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcademy } from '@features/academy';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useWebsiteConfiguration, useWebsitePages } from '../hooks';
import { WebsitePublishBar } from '../components/WebsitePublishBar';
import { buildSitemapEntries } from '../utils/sitemap.utils';
import { CONTENT_LIST_PAGE_SIZE } from '../constants/website.constants';
import type { WebsiteConfiguration, WebsitePage } from '@types';

export default function WebsiteOverviewPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId } = useParams<{ academyId: string }>();

  const academyQuery = useAcademy(academyId ?? '');
  const configQuery = useWebsiteConfiguration(academyId ?? '');
  const pagesQuery = useWebsitePages(academyId ?? '', {
    query: { pagination: { page: 1, pageSize: CONTENT_LIST_PAGE_SIZE } },
  });

  const isLoading = academyQuery.isLoading || configQuery.isLoading || pagesQuery.isLoading;
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
          onRetry={() => {
            void academyQuery.refetch();
            void configQuery.refetch();
            void pagesQuery.refetch();
          }}
        />
      </PageContainer>
    );
  }

  const links = [
    {
      id: 'pages',
      icon: FileText,
      titleKey: 'website:overview.pages.title',
      descriptionKey: 'website:overview.pages.description',
      path: buildPath(DASHBOARD_ROUTES.websitePages, { academyId }),
    },
    {
      id: 'content',
      icon: MessageSquareQuote,
      titleKey: 'website:overview.content.title',
      descriptionKey: 'website:overview.content.description',
      path: buildPath(DASHBOARD_ROUTES.websiteContent, { academyId }),
    },
    {
      id: 'settings',
      icon: Settings2,
      titleKey: 'website:overview.settings.title',
      descriptionKey: 'website:overview.settings.description',
      path: buildPath(DASHBOARD_ROUTES.websiteSettings, { academyId }),
    },
    {
      id: 'preview',
      icon: Globe,
      titleKey: 'website:overview.preview.title',
      descriptionKey: 'website:overview.preview.description',
      path: buildPath(DASHBOARD_ROUTES.websitePreview, { academyId }),
    },
  ] as const;

  return (
    <PageContainer>
      <PageHeader titleKey="website:overview.title" descriptionKey="website:overview.subtitle" />

      <div className="space-y-6">
        <WebsitePublishBar academyId={academyId} status={configQuery.data.status} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {links.map((link) => (
            <Card
              key={link.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => navigate(link.path)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') navigate(link.path);
              }}
            >
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <link.icon className="size-5 text-muted-foreground" aria-hidden />
                <CardTitle className="text-base">{t(link.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t(link.descriptionKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <SitemapPreviewCard configuration={configQuery.data} pages={pagesQuery.data?.items ?? []} />
      </div>
    </PageContainer>
  );
}

/**
 * A read-only preview of the future `sitemap.xml` this website's
 * PUBLISHED, VISIBLE, INDEXABLE pages would produce — see
 * `buildSitemapEntries`'s doc comment. Nothing here is served; it exists
 * so an Academy Owner can see what a future public runtime would list.
 */
function SitemapPreviewCard({
  configuration,
  pages,
}: {
  readonly configuration: WebsiteConfiguration;
  readonly pages: readonly WebsitePage[];
}): JSX.Element {
  const { t } = useTranslation();
  const entries = buildSitemapEntries({ configuration, pages });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('website:overview.sitemapPreview.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          {t('website:overview.sitemapPreview.help')}
        </p>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('website:overview.sitemapPreview.empty')}</p>
        ) : (
          <ul className="space-y-1 text-sm" dir="ltr">
            {entries.map((entry) => (
              <li key={entry.path} className="flex items-center justify-between gap-4 font-mono text-xs">
                <span className="text-foreground">{entry.path}</span>
                <span className="text-muted-foreground">{entry.priority.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
