/**
 * B3 — Banners & pop-ups (`/dashboard/platform/announcements`): every
 * marketing banner, marketing pop-up and dashboard banner with where it
 * shows, whether it is live now (active and inside its dates), its dates
 * and its results. Server-side search, filters and pagination (URL state).
 */
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Megaphone, Plus, SearchX, X } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { Pagination, SearchInput, StatusBadge } from '@components/data-display';
import { SkeletonTable } from '@components/loading';
import { DataTable } from '@components/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDateFormatter, useLanguage, usePagination } from '@hooks';
import { formatNumber } from '@utils';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { usePlatformAnnouncements } from '../hooks/usePlatformAnnouncements';
import {
  ANNOUNCEMENT_STATUSES,
  ANNOUNCEMENT_SURFACES,
  type AnnouncementListQuery,
  type AnnouncementStatus,
  type AnnouncementSurface,
  type SiteAnnouncement,
} from '../types';
import { K, announcementLiveState, liveStateTone } from '../utils/launch.utils';

const ALL = 'all';

function pick<T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | undefined {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export function newAnnouncementPath(surface: AnnouncementSurface): string {
  return `${DASHBOARD_ROUTES.platformAnnouncementNew}?surface=${surface}`;
}

export function windowLabel(
  announcement: Pick<SiteAnnouncement, 'startsAt' | 'endsAt'>,
  t: (key: string, values?: Record<string, string>) => string,
  date: (value: string) => string
): string {
  const { startsAt, endsAt } = announcement;
  if (startsAt && endsAt)
    return t(`${K}announcements.window.range`, {
      from: date(startsAt),
      to: date(endsAt),
    });
  if (startsAt)
    return t(`${K}announcements.window.from`, { date: date(startsAt) });
  if (endsAt)
    return t(`${K}announcements.window.until`, { date: date(endsAt) });
  return t(`${K}announcements.window.always`);
}

export default function PlatformAnnouncementsPage(): JSX.Element {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filters = {
    search: params.get('search') ?? '',
    surface: pick<AnnouncementSurface>(
      params.get('surface'),
      ANNOUNCEMENT_SURFACES
    ),
    status: pick<AnnouncementStatus>(
      params.get('status'),
      ANNOUNCEMENT_STATUSES
    ),
    page: Math.max(1, Number(params.get('page')) || 1),
    pageSize: Math.min(100, Math.max(1, Number(params.get('pageSize')) || 20)),
  };
  const update = (
    changes: Record<string, string | undefined>,
    resetPage = true
  ) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === undefined || value === '' || value === ALL)
            next.delete(key);
          else next.set(key, value);
        }
        if (resetPage) next.delete('page');
        return next;
      },
      { replace: true }
    );
  const hasFilters = Boolean(
    filters.search || filters.surface || filters.status
  );
  const query = useMemo<AnnouncementListQuery>(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.surface ? { surface: filters.surface } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    }),
    [
      filters.page,
      filters.pageSize,
      filters.search,
      filters.surface,
      filters.status,
    ]
  );
  const list = usePlatformAnnouncements(query);
  const rows = list.data?.items ?? [];
  const n = (value: number) => formatNumber(value, language);
  const pagination = usePagination({
    totalItems: list.data?.pagination.totalItems ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
    onPageChange: (page) => update({ page: String(page) }, false),
    onPageSizeChange: (pageSize) => update({ pageSize: String(pageSize) }),
  });
  const open = (row: SiteAnnouncement) =>
    navigate(
      buildPath(DASHBOARD_ROUTES.platformAnnouncementEdit, {
        announcementId: row.id,
      })
    );
  const stats = (row: SiteAnnouncement) =>
    t(`${K}announcements.stats.summary`, {
      views: n(row.stats.views),
      clicks: n(row.stats.clicks),
      dismissals: n(row.stats.dismissals),
    });
  const liveBadge = (row: SiteAnnouncement) => {
    const state = announcementLiveState(row);
    return state === 'off' ? (
      <StatusBadge
        labelKey={`${K}announcements.status.${row.status}`}
        tone="neutral"
      />
    ) : (
      <StatusBadge
        labelKey={`${K}announcements.live.${state}`}
        tone={liveStateTone(state)}
      />
    );
  };

  const columns = useMemo<ColumnDef<SiteAnnouncement, unknown>[]>(
    () => [
      {
        id: 'name',
        header: t(`${K}announcements.table.name`),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className="block max-w-[18rem] truncate font-medium text-foreground"
            dir="auto"
          >
            {row.original.name}
          </span>
        ),
      },
      {
        id: 'surface',
        header: t(`${K}announcements.table.surface`),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {t(`${K}announcements.surface.${row.original.surface}`)}
          </span>
        ),
      },
      {
        id: 'status',
        header: t(`${K}announcements.table.status`),
        enableSorting: false,
        cell: ({ row }) => liveBadge(row.original),
      },
      {
        id: 'window',
        header: t(`${K}announcements.table.window`),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {windowLabel(row.original, t, fmt.dateTime)}
          </span>
        ),
      },
      {
        id: 'stats',
        header: t(`${K}announcements.table.stats`),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className="whitespace-nowrap tabular-nums"
            data-atlas-numeric="true"
          >
            {stats(row.original)}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, language, fmt]
  );

  const breadcrumbs: BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    {
      labelKey: 'navigation:items.platformLaunch',
      path: DASHBOARD_ROUTES.platformLaunch,
    },
    { labelKey: `${K}announcements.title` },
  ];

  const renderBody = (): JSX.Element => {
    if (list.error) {
      return (
        <div className="p-6">
          <ErrorState
            kind={list.error.kind}
            onRetry={() => void list.refetch()}
          />
        </div>
      );
    }
    if (list.isLoading) {
      return (
        <div aria-busy="true" className="p-4">
          <SkeletonTable columns={5} />
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="p-4">
          {hasFilters ? (
            <EmptyState
              icon={SearchX}
              titleKey={`${K}announcements.noResults.title`}
              descriptionKey={`${K}announcements.noResults.description`}
              primaryAction={{
                labelKey: `${K}common.clearFilters`,
                onAction: () =>
                  update({
                    search: undefined,
                    surface: undefined,
                    status: undefined,
                  }),
                icon: X,
              }}
            />
          ) : (
            <EmptyState
              icon={Megaphone}
              titleKey={`${K}announcements.empty.title`}
              descriptionKey={`${K}announcements.empty.description`}
              primaryAction={{
                labelKey: `${K}announcements.new.marketing_banner`,
                onAction: () =>
                  navigate(newAnnouncementPath('marketing_banner')),
                icon: Plus,
              }}
            />
          )}
        </div>
      );
    }
    return (
      <>
        <section
          aria-label={t(`${K}announcements.table.caption`)}
          className="hidden overflow-x-auto md:block"
        >
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            onRowSelect={open}
          />
        </section>
        <ul
          aria-label={t(`${K}announcements.table.caption`)}
          className="divide-y divide-border md:hidden"
        >
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => open(row)}
                className="w-full space-y-1.5 p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="flex items-start justify-between gap-3">
                  <span
                    className="min-w-0 font-medium text-foreground"
                    dir="auto"
                  >
                    {row.name}
                  </span>
                  <span className="shrink-0">{liveBadge(row)}</span>
                </span>
                <span className="block text-sm text-muted-foreground">
                  {t(`${K}announcements.surface.${row.surface}`)} ·{' '}
                  {windowLabel(row, t, fmt.date)}
                </span>
                <span className="block text-xs tabular-nums text-muted-foreground">
                  {t(`${K}announcements.table.stats`)}: {stats(row)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Pagination
          pagination={pagination}
          summary={t(`${K}common.resultRange`, {
            from: n(pagination.rangeStart),
            to: n(pagination.rangeEnd),
            total: n(pagination.totalItems),
          })}
        />
      </>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${K}announcements.title`}
        descriptionKey={`${K}announcements.subtitle`}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex flex-wrap gap-2">
            {ANNOUNCEMENT_SURFACES.map((surface) => (
              <Button
                key={surface}
                type="button"
                variant={surface === 'marketing_banner' ? 'default' : 'outline'}
                onClick={() => navigate(newAnnouncementPath(surface))}
              >
                <Plus className="size-4" aria-hidden />
                {t(`${K}announcements.new.${surface}`)}
              </Button>
            ))}
          </div>
        }
      />
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <SearchInput
            value={filters.search}
            onValueChange={(value) => update({ search: value || undefined })}
            labelKey={`${K}announcements.searchLabel`}
            className="w-full lg:max-w-sm lg:flex-1"
          />
          <Select
            value={filters.surface ?? ALL}
            onValueChange={(value) => update({ surface: value })}
          >
            <SelectTrigger
              className="w-full sm:w-[220px]"
              aria-label={t(`${K}announcements.filters.surface`)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t(`${K}announcements.filters.allSurfaces`)}
              </SelectItem>
              {ANNOUNCEMENT_SURFACES.map((surface) => (
                <SelectItem key={surface} value={surface}>
                  {t(`${K}announcements.surface.${surface}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status ?? ALL}
            onValueChange={(value) => update({ status: value })}
          >
            <SelectTrigger
              className="w-full sm:w-[180px]"
              aria-label={t(`${K}announcements.filters.status`)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t(`${K}announcements.filters.allStatuses`)}
              </SelectItem>
              {ANNOUNCEMENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`${K}announcements.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Card>
          <CardContent className="p-0">{renderBody()}</CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
