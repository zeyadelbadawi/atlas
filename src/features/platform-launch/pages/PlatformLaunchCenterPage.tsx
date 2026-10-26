/**
 * B3 — Launch center (`/dashboard/platform/launch`): the launch checklist's
 * progress and next open items, what is live right now (banners, pop-up,
 * dashboard banner), blog counts, and quick actions — new post, new banner,
 * new pop-up, new dashboard banner, and the launch email in the existing
 * Compose & Send page.
 */
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Megaphone,
  Newspaper,
  Plus,
  Send,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDateFormatter, useLanguage } from '@hooks';
import { formatNumber } from '@utils';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { useLaunchChecklist } from '../hooks/useLaunchChecklist';
import { usePlatformBlogPosts } from '../hooks/usePlatformBlog';
import { usePlatformAnnouncements } from '../hooks/usePlatformAnnouncements';
import type { BlogPostStatus } from '../types';
import { K, announcementLiveState } from '../utils/launch.utils';
import { ProgressBar } from '../components/fields';
import { newAnnouncementPath } from './PlatformAnnouncementsPage';

const COUNT_STATUSES: readonly { status: BlogPostStatus; key: string }[] = [
  { status: 'published', key: 'published' },
  { status: 'scheduled', key: 'scheduled' },
  { status: 'draft', key: 'drafts' },
];

function BlogCount({
  status,
  label,
}: {
  status: BlogPostStatus;
  label: string;
}) {
  const { language } = useLanguage();
  const query = usePlatformBlogPosts({ page: 1, pageSize: 1, status });
  const value = query.data?.pagination.totalItems;
  return (
    <div className="rounded-md bg-muted/40 p-3 text-center">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className="mt-1 text-2xl font-semibold tabular-nums"
        data-atlas-numeric="true"
      >
        {value === undefined ? (
          <Skeleton className="mx-auto h-7 w-8" />
        ) : (
          formatNumber(value, language)
        )}
      </dd>
    </div>
  );
}

const linkClass =
  'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm';

export default function PlatformLaunchCenterPage(): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const checklist = useLaunchChecklist();
  const active = usePlatformAnnouncements({
    page: 1,
    pageSize: 50,
    status: 'active',
  });
  const n = (value: number) => formatNumber(value, language);

  const items = [...(checklist.data?.items ?? [])].sort(
    (a, b) => a.position - b.position
  );
  const done =
    checklist.data?.progress.done ?? items.filter((item) => item.done).length;
  const total = checklist.data?.progress.total ?? items.length;
  const next = items.filter((item) => !item.done).slice(0, 4);
  const live = (active.data?.items ?? []).filter(
    (item) => announcementLiveState(item) === 'live'
  );

  const breadcrumbs: BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    { labelKey: `${K}launch.title` },
  ];

  const actions = [
    { key: 'newPost', icon: Newspaper, to: DASHBOARD_ROUTES.platformBlogNew },
    {
      key: 'newBanner',
      icon: Megaphone,
      to: newAnnouncementPath('marketing_banner'),
    },
    {
      key: 'newPopup',
      icon: Megaphone,
      to: newAnnouncementPath('marketing_popup'),
    },
    {
      key: 'newDashboardBanner',
      icon: Megaphone,
      to: newAnnouncementPath('dashboard_banner'),
    },
    {
      key: 'composeEmail',
      icon: Send,
      to: DASHBOARD_ROUTES.platformEmailCompose,
    },
  ] as const;

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${K}launch.title`}
        descriptionKey={`${K}launch.subtitle`}
        breadcrumbs={breadcrumbs}
      />
      <div className="space-y-6">
        <section aria-labelledby="launch-actions">
          <h2
            id="launch-actions"
            className="mb-3 font-display text-base font-semibold text-foreground"
          >
            {t(`${K}launch.quickActions`)}
          </h2>
          <div className="flex flex-wrap gap-2">
            {actions.map(({ key, icon: Icon, to }) => (
              <Button
                key={key}
                type="button"
                variant={key === 'newPost' ? 'default' : 'outline'}
                onClick={() => navigate(to)}
              >
                {key === 'composeEmail' ? (
                  <Icon className="size-4 rtl:-scale-x-100" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
                {t(`${K}launch.actions.${key}`)}
              </Button>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:row-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t(`${K}launch.checklist.title`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {checklist.error ? (
                <ErrorState
                  kind={checklist.error.kind}
                  onRetry={() => void checklist.refetch()}
                  headingLevel="h3"
                />
              ) : checklist.isLoading ? (
                <div className="space-y-3" aria-busy="true">
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <>
                  <p
                    className="text-2xl font-semibold tabular-nums"
                    data-atlas-numeric="true"
                  >
                    {t(`${K}launch.checklist.progress`, {
                      done: n(done),
                      total: n(total),
                    })}
                  </p>
                  <ProgressBar
                    value={done}
                    max={total}
                    label={t(`${K}launch.checklist.progressLabel`)}
                    valueText={t(`${K}launch.checklist.progress`, {
                      done: n(done),
                      total: n(total),
                    })}
                  />
                  {next.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                        {t(`${K}launch.checklist.next`)}
                      </h3>
                      <ul className="space-y-2">
                        {next.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start gap-2 text-sm"
                          >
                            <Circle
                              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                            <span dir="auto">{item.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : total > 0 ? (
                    <p className="flex items-center gap-2 text-sm font-medium text-success">
                      <CheckCircle2 className="size-4" aria-hidden />
                      {t(`${K}launch.checklist.allDone`)}
                    </p>
                  ) : null}
                </>
              )}
              <Link
                to={DASHBOARD_ROUTES.platformLaunchChecklist}
                className={linkClass}
              >
                {t(`${K}launch.checklist.open`)}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t(`${K}launch.live.title`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {active.error ? (
                <ErrorState
                  kind={active.error.kind}
                  onRetry={() => void active.refetch()}
                  headingLevel="h3"
                />
              ) : active.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : live.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t(`${K}launch.live.empty`)}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {live.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <Link
                        to={buildPath(
                          DASHBOARD_ROUTES.platformAnnouncementEdit,
                          { announcementId: item.id }
                        )}
                        className="min-w-0 font-medium text-foreground hover:underline"
                        dir="auto"
                      >
                        {item.name}
                      </Link>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <StatusBadge
                          labelKey={`${K}announcements.surface.${item.surface}`}
                          tone="success"
                        />
                        {item.endsAt
                          ? t(`${K}launch.live.until`, {
                              date: fmt.dateTime(item.endsAt),
                            })
                          : t(`${K}launch.live.noEnd`)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to={DASHBOARD_ROUTES.platformAnnouncements}
                className={linkClass}
              >
                {t(`${K}launch.live.open`)}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t(`${K}launch.blog.title`)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-3 gap-3">
                {COUNT_STATUSES.map(({ status, key }) => (
                  <BlogCount
                    key={status}
                    status={status}
                    label={t(`${K}launch.blog.${key}`)}
                  />
                ))}
              </dl>
              <Link to={DASHBOARD_ROUTES.platformBlog} className={linkClass}>
                {t(`${K}launch.blog.open`)}
                <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
