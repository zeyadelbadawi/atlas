/**
 * Global Courses — List Page (P60).
 *
 * The Platform Owner's cross-tenant course console. Read-only: course
 * authoring belongs to the academy that owns the course, and the backend
 * exposes no platform write route.
 *
 * FILTERS LIVE IN THE URL, not in component state. There are a hundred-plus
 * courses across every tenant, so "published, paid, org Acme, page 3" is a
 * view an operator will want to send to someone or come back to — and a
 * `useState` filter would be lost on the first navigation into a course and
 * back. The same reasoning the Analysis pages' date range follows.
 *
 * All filtering, searching, sorting and paging is done by POSTGRES. The
 * page only ever holds one page of rows, so filtering them in the browser
 * would narrow the current 20 results rather than the real result set —
 * quietly wrong in exactly the way that looks right in a demo.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePagination, useSearch, useDateFormatter } from '@hooks';
import { formatCurrency } from '@utils';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  getCoursePricingTone,
  getCourseStatusLabelKey,
  getCourseStatusTone,
  getCourseVisibilityLabelKey,
  getCourseVisibilityTone,
} from '@features/course';
import { usePlatformCourses } from '../hooks';
import type {
  CourseStatus,
  CourseVisibility,
  CoursePricingType,
  LanguageCode,
  PlatformCourseSummary,
  PlatformCourseSortField,
} from '@types';

/** `'all'` is the UI's way of saying "send no filter at all". */
const ALL = 'all';

const STATUS_OPTIONS: readonly CourseStatus[] = ['draft', 'published', 'archived'];
const VISIBILITY_OPTIONS: readonly CourseVisibility[] = ['public', 'private'];
const PRICING_OPTIONS: readonly CoursePricingType[] = ['free', 'paid'];
const SORT_OPTIONS: readonly PlatformCourseSortField[] = [
  'createdAt',
  'title',
  'updatedAt',
  'publishedAt',
];

/**
 * Reads one filter out of the URL, falling back to "no filter" for anything
 * unrecognised. A query string is user-editable text, so a typo must not
 * reach the API as a 400.
 */
function readParam<T extends string>(
  raw: string | null,
  allowed: readonly T[]
): T | undefined {
  return raw !== null && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : undefined;
}

export default function PlatformCourseListPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const navigate = useNavigate();
  const fmt = useDateFormatter();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = readParam(searchParams.get('status'), STATUS_OPTIONS);
  const visibility = readParam(searchParams.get('visibility'), VISIBILITY_OPTIONS);
  const pricingType = readParam(searchParams.get('pricingType'), PRICING_OPTIONS);
  const sortBy = readParam(searchParams.get('sortBy'), SORT_OPTIONS) ?? 'createdAt';
  const sortDirection =
    readParam(searchParams.get('sortDirection'), ['asc', 'desc'] as const) ?? 'desc';

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    debouncedQuery,
  } = useSearch({ debounceMs: 300 });

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const setFilter = (key: string, value: string): void => {
    const params = new URLSearchParams(searchParams);
    if (value === ALL) params.delete(key);
    else params.set(key, value);
    setSearchParams(params, { replace: true });
    // A narrower filter almost always has fewer pages than the current one;
    // staying on page 5 of a 2-page result would show an empty table.
    pagination.goToPage(1);
  };

  const hasFilters =
    status !== undefined || visibility !== undefined || pricingType !== undefined;

  const clearFilters = (): void => {
    const params = new URLSearchParams(searchParams);
    for (const key of ['status', 'visibility', 'pricingType']) params.delete(key);
    setSearchParams(params, { replace: true });
    pagination.goToPage(1);
  };

  // Only the filters that are actually SET are sent. `CollectionQuery`
  // types `filters` as JSON values, and a key present with `undefined`
  // would also make this an unequal query key on every render.
  const filters = useMemo(
    () => ({
      ...(status ? { status } : {}),
      ...(visibility ? { visibility } : {}),
      ...(pricingType ? { pricingType } : {}),
    }),
    [status, visibility, pricingType]
  );

  const {
    data: coursesData,
    isLoading,
    error,
    refetch,
  } = usePlatformCourses({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      search: debouncedQuery || undefined,
      sort: { field: sortBy, direction: sortDirection },
      filters,
    },
  });

  useEffect(() => {
    if (coursesData) setTotalItems(coursesData.pagination.totalItems);
  }, [coursesData]);

  const courses = coursesData?.items ?? [];

  const columns = useMemo<ColumnDef<PlatformCourseSummary, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: t('platform:courses.table.title'),
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="block truncate font-medium">{row.original.title}</span>
            {row.original.categoryName ? (
              <span className="block truncate text-xs text-muted-foreground">
                {row.original.categoryName}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'academyName',
        header: t('platform:courses.table.academy'),
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="block truncate">{row.original.academyName}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {row.original.organizationName}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: t('platform:courses.table.status'),
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            <StatusBadge
              labelKey={getCourseStatusLabelKey(row.original.status)}
              tone={getCourseStatusTone(row.original.status)}
            />
            <StatusBadge
              labelKey={getCourseVisibilityLabelKey(row.original.visibility)}
              tone={getCourseVisibilityTone(row.original.visibility)}
            />
          </div>
        ),
      },
      {
        accessorKey: 'pricingType',
        header: t('platform:courses.table.pricing'),
        cell: ({ row }) =>
          row.original.pricingType === 'paid' &&
          row.original.pricingAmount !== undefined ? (
            <span data-atlas-numeric="true">
              {formatCurrency(
                row.original.pricingAmount,
                language,
                row.original.pricingCurrency ?? 'USD'
              )}
            </span>
          ) : (
            <StatusBadge
              labelKey="course:pricing.free"
              tone={getCoursePricingTone(row.original.pricingType)}
            />
          ),
      },
      {
        accessorKey: 'createdBy',
        header: t('platform:courses.table.createdBy'),
        cell: ({ row }) =>
          row.original.createdBy ? (
            <span className="truncate">{row.original.createdBy.name}</span>
          ) : (
            // An honest blank. See `platform-course.types.ts` — this course
            // predates the creator column and nothing proves who made it.
            <span className="text-muted-foreground">
              {t('platform:courses.creatorUnknown')}
            </span>
          ),
      },
      {
        accessorKey: 'enrolledStudents',
        header: t('platform:courses.table.enrolled'),
        cell: ({ row }) => (
          <span data-atlas-numeric="true">{row.original.enrolledStudents}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: t('platform:courses.table.createdAt'),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {fmt.date(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [t, language, fmt]
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="platform:courses.title"
        descriptionKey="platform:courses.subtitle"
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('platform:courses.searchPlaceholder')}
            className="w-full sm:max-w-xs"
            aria-label={t('platform:courses.searchPlaceholder')}
          />

          <Select value={status ?? ALL} onValueChange={(v) => setFilter('status', v)}>
            <SelectTrigger
              className="w-[160px]"
              aria-label={t('platform:courses.filters.status')}
            >
              <SelectValue placeholder={t('platform:courses.filters.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('platform:courses.filters.allStatuses')}</SelectItem>
              {STATUS_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(getCourseStatusLabelKey(value))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={visibility ?? ALL}
            onValueChange={(v) => setFilter('visibility', v)}
          >
            <SelectTrigger
              className="w-[160px]"
              aria-label={t('platform:courses.filters.visibility')}
            >
              <SelectValue placeholder={t('platform:courses.filters.visibility')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t('platform:courses.filters.allVisibilities')}
              </SelectItem>
              {VISIBILITY_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(getCourseVisibilityLabelKey(value))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={pricingType ?? ALL}
            onValueChange={(v) => setFilter('pricingType', v)}
          >
            <SelectTrigger
              className="w-[160px]"
              aria-label={t('platform:courses.filters.pricing')}
            >
              <SelectValue placeholder={t('platform:courses.filters.pricing')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('platform:courses.filters.allPricing')}</SelectItem>
              {PRICING_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`course:pricing.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setFilter('sortBy', v)}>
            <SelectTrigger
              className="w-[180px]"
              aria-label={t('platform:courses.filters.sort')}
            >
              <SelectValue placeholder={t('platform:courses.filters.sort')} />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`platform:courses.sort.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setFilter('sortDirection', sortDirection === 'desc' ? 'asc' : 'desc')
            }
            aria-label={t('platform:courses.filters.direction')}
          >
            {t(`platform:courses.sortDirection.${sortDirection}`)}
          </Button>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t('platform:courses.filters.clear')}
            </Button>
          ) : null}
        </div>

        <Card>
          <CardContent className="p-0">
            {error ? (
              <div className="p-6">
                <ErrorState onRetry={() => refetch()} />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={courses}
                isLoading={isLoading}
                pagination={pagination}
                emptyTitleKey={
                  hasFilters || debouncedQuery
                    ? 'platform:courses.emptyFilteredState'
                    : 'platform:courses.emptyState'
                }
                emptyDescriptionKey={
                  hasFilters || debouncedQuery
                    ? 'platform:courses.emptyFilteredStateDescription'
                    : 'platform:courses.emptyStateDescription'
                }
                getRowId={(course) => course.id}
                onRowSelect={(course) =>
                  navigate(
                    buildPath(DASHBOARD_ROUTES.platformCourseDetail, {
                      courseId: course.id,
                    })
                  )
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
