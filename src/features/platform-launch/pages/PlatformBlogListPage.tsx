/**
 * B3 — Blog posts (`/dashboard/platform/blog`): server-side search, status,
 * topic and type filters, sort and pagination (kept in the URL). Each row
 * shows the title, status, topic, which languages are written and the
 * relevant date; selecting a row opens the editor.
 */
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Newspaper, Plus, SearchX, X } from 'lucide-react';
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
import { usePlatformBlogPosts } from '../hooks/usePlatformBlog';
import {
  BLOG_POST_KINDS,
  BLOG_POST_STATUSES,
  BLOG_TOPICS,
  type BlogPost,
  type BlogPostKind,
  type BlogPostListQuery,
  type BlogPostStatus,
  type BlogTopic,
} from '../types';
import {
  K,
  blogStatusTone,
  hasTranslation,
  postTitle,
} from '../utils/launch.utils';
import { LanguageBadges } from '../components/LanguageBadges';

const ALL = 'all';
const SORTS = ['updatedAt', 'publishAt', 'title'] as const;
type Sort = (typeof SORTS)[number];

function pick<T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | undefined {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

export function useBlogListFilters() {
  const [params, setParams] = useSearchParams();
  const filters = {
    search: params.get('search') ?? '',
    status: pick<BlogPostStatus>(params.get('status'), BLOG_POST_STATUSES),
    topic: pick<BlogTopic>(params.get('topic'), BLOG_TOPICS),
    kind: pick<BlogPostKind>(params.get('kind'), BLOG_POST_KINDS),
    sort: pick<Sort>(params.get('sort'), SORTS) ?? 'updatedAt',
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
  return { filters, update };
}

export function postDate(
  post: BlogPost,
  t: (key: string, values?: Record<string, string>) => string,
  date: (value: string) => string
): string {
  if (post.status === 'published' && post.publishAt)
    return t(`${K}blog.dates.publishedOn`, { date: date(post.publishAt) });
  if (post.status === 'scheduled' && post.publishAt)
    return t(`${K}blog.dates.scheduledFor`, { date: date(post.publishAt) });
  return t(`${K}blog.dates.savedOn`, { date: date(post.updatedAt) });
}

export default function PlatformBlogListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const { filters, update } = useBlogListFilters();
  const hasFilters = Boolean(
    filters.search || filters.status || filters.topic || filters.kind
  );

  const query = useMemo<BlogPostListQuery>(
    () => ({
      page: filters.page,
      pageSize: filters.pageSize,
      sort: filters.sort,
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.topic ? { topic: filters.topic } : {}),
      ...(filters.kind ? { kind: filters.kind } : {}),
    }),
    [
      filters.page,
      filters.pageSize,
      filters.sort,
      filters.search,
      filters.status,
      filters.topic,
      filters.kind,
    ]
  );
  const list = usePlatformBlogPosts(query);
  const rows = list.data?.items ?? [];
  const n = (value: number) => formatNumber(value, language);

  const pagination = usePagination({
    totalItems: list.data?.pagination.totalItems ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
    onPageChange: (page) => update({ page: String(page) }, false),
    onPageSizeChange: (pageSize) => update({ pageSize: String(pageSize) }),
  });

  const open = (post: BlogPost) =>
    navigate(buildPath(DASHBOARD_ROUTES.platformBlogEdit, { postId: post.id }));
  const complete = (post: BlogPost) => ({
    en: hasTranslation(post.translations.en),
    ar: hasTranslation(post.translations.ar),
  });

  const columns = useMemo<ColumnDef<BlogPost, unknown>[]>(
    () => [
      {
        id: 'title',
        header: t(`${K}blog.table.title`),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block max-w-[22rem]">
            <span
              className="block truncate font-medium text-foreground"
              dir="auto"
            >
              {postTitle(row.original, i18n.language) ||
                t(`${K}blog.table.untitled`)}
            </span>
            <span
              className="block truncate text-xs text-muted-foreground"
              dir="ltr"
            >
              /blog/{row.original.slug}
            </span>
          </span>
        ),
      },
      {
        id: 'status',
        header: t(`${K}blog.table.status`),
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`${K}blog.status.${row.original.status}`}
            tone={blogStatusTone(row.original.status)}
          />
        ),
      },
      {
        id: 'topic',
        header: t(`${K}blog.table.topic`),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {t(`${K}blog.topics.${row.original.topic}`)}
            <span className="block text-xs text-muted-foreground">
              {t(`${K}blog.kinds.${row.original.kind}`)}
            </span>
          </span>
        ),
      },
      {
        id: 'languages',
        header: t(`${K}blog.table.languages`),
        enableSorting: false,
        cell: ({ row }) => <LanguageBadges complete={complete(row.original)} />,
      },
      {
        id: 'date',
        header: t(`${K}blog.table.date`),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {postDate(row.original, t, fmt.date)}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, i18n.language, fmt]
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
    { labelKey: `${K}blog.title` },
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
              titleKey={`${K}blog.noResults.title`}
              descriptionKey={`${K}blog.noResults.description`}
              primaryAction={{
                labelKey: `${K}common.clearFilters`,
                onAction: () =>
                  update({
                    search: undefined,
                    status: undefined,
                    topic: undefined,
                    kind: undefined,
                  }),
                icon: X,
              }}
            />
          ) : (
            <EmptyState
              icon={Newspaper}
              titleKey={`${K}blog.empty.title`}
              descriptionKey={`${K}blog.empty.description`}
              primaryAction={{
                labelKey: `${K}blog.newPost`,
                onAction: () => navigate(DASHBOARD_ROUTES.platformBlogNew),
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
          aria-label={t(`${K}blog.table.caption`)}
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
          aria-label={t(`${K}blog.table.caption`)}
          className="divide-y divide-border md:hidden"
        >
          {rows.map((post) => (
            <li key={post.id}>
              <button
                type="button"
                onClick={() => open(post)}
                className="w-full space-y-2 p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="flex items-start justify-between gap-3">
                  <span
                    className="min-w-0 font-medium text-foreground"
                    dir="auto"
                  >
                    {postTitle(post, i18n.language) ||
                      t(`${K}blog.table.untitled`)}
                  </span>
                  <StatusBadge
                    labelKey={`${K}blog.status.${post.status}`}
                    tone={blogStatusTone(post.status)}
                    className="shrink-0"
                  />
                </span>
                <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{t(`${K}blog.topics.${post.topic}`)}</span>
                  <span aria-hidden>·</span>
                  <span>{postDate(post, t, fmt.date)}</span>
                </span>
                <LanguageBadges complete={complete(post)} />
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

  const select = (
    id: string,
    value: string | undefined,
    label: string,
    allLabel: string,
    options: readonly string[],
    optionKey: (option: string) => string,
    width = 'sm:w-[180px]'
  ) => (
    <Select
      value={value ?? ALL}
      onValueChange={(next) => update({ [id]: next })}
    >
      <SelectTrigger className={`w-full ${width}`} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {t(optionKey(option))}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${K}blog.title`}
        descriptionKey={`${K}blog.subtitle`}
        breadcrumbs={breadcrumbs}
        actions={
          <Button
            type="button"
            onClick={() => navigate(DASHBOARD_ROUTES.platformBlogNew)}
          >
            <Plus className="size-4" aria-hidden />
            {t(`${K}blog.newPost`)}
          </Button>
        }
      />
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <SearchInput
            value={filters.search}
            onValueChange={(value) => update({ search: value || undefined })}
            labelKey={`${K}blog.searchLabel`}
            className="w-full lg:max-w-xs lg:flex-1"
          />
          {select(
            'status',
            filters.status,
            t(`${K}blog.filters.status`),
            t(`${K}blog.filters.allStatuses`),
            BLOG_POST_STATUSES,
            (o) => `${K}blog.status.${o}`
          )}
          {select(
            'topic',
            filters.topic,
            t(`${K}blog.filters.topic`),
            t(`${K}blog.filters.allTopics`),
            BLOG_TOPICS,
            (o) => `${K}blog.topics.${o}`,
            'sm:w-[200px]'
          )}
          {select(
            'kind',
            filters.kind,
            t(`${K}blog.filters.kind`),
            t(`${K}blog.filters.allKinds`),
            BLOG_POST_KINDS,
            (o) => `${K}blog.kinds.${o}`
          )}
          <Select
            value={filters.sort}
            onValueChange={(value) =>
              update({ sort: value === 'updatedAt' ? undefined : value })
            }
          >
            <SelectTrigger
              className="w-full sm:w-[180px]"
              aria-label={t(`${K}blog.sort.label`)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {t(`${K}blog.sort.${sort}`)}
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
