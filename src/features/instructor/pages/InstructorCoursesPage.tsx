/**
 * Instructor "My Courses" Page.
 *
 * Lists only the courses this instructor is authorized to teach — the
 * backend resolves that scope, this page never requests courses by
 * arbitrary id.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Search } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Input } from '@/components/ui/input';
import { useDebounce, usePagination } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useTeachingCourses } from '../hooks';
import {
  getCourseStatusLabelKey,
  getCourseStatusTone,
  getCourseVisibilityLabelKey,
  getCourseVisibilityTone,
} from '@features/course';
import type { TeachingCourse } from '@types';

export default function InstructorCoursesPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput);
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useTeachingCourses({
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      search: debouncedSearch.trim() || undefined,
    },
  });

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const courses = data?.items ?? [];

  const columns: ColumnDef<TeachingCourse, unknown>[] = [
    {
      accessorKey: 'title',
      header: t('instructor:courses.table.title'),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.thumbnail ? (
            <img
              src={row.original.thumbnail}
              alt=""
              className="size-10 shrink-0 rounded-md border border-border object-cover"
            />
          ) : (
            <div className="size-10 shrink-0 rounded-md border border-dashed border-border" />
          )}
          <span className="font-medium">{row.original.title}</span>
          {row.original.requiresAttention ? (
            <AlertTriangle
              className="size-4 shrink-0 text-warning"
              aria-hidden
            />
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('instructor:courses.table.status'),
      cell: ({ row }) => (
        <StatusBadge
          labelKey={getCourseStatusLabelKey(row.original.status)}
          tone={getCourseStatusTone(row.original.status)}
        />
      ),
    },
    {
      accessorKey: 'visibility',
      header: t('instructor:courses.table.visibility'),
      cell: ({ row }) => (
        <StatusBadge
          labelKey={getCourseVisibilityLabelKey(row.original.visibility)}
          tone={getCourseVisibilityTone(row.original.visibility)}
        />
      ),
    },
    {
      accessorKey: 'enrolledCount',
      header: t('instructor:courses.table.enrolled'),
      cell: ({ row }) => row.original.enrolledCount ?? '—',
    },
    {
      accessorKey: 'averageProgress',
      header: t('instructor:courses.table.averageProgress'),
      cell: ({ row }) =>
        typeof row.original.averageProgress === 'number'
          ? `${Math.round(row.original.averageProgress)}%`
          : '—',
    },
  ];

  if (error) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="instructor:courses.title"
          descriptionKey="instructor:courses.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="instructor:courses.title"
        descriptionKey="instructor:courses.subtitle"
      />

      <div className="space-y-4">
        <div className="relative max-w-xs">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('instructor:courses.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9"
          />
        </div>

        <DataTable
          columns={columns}
          data={courses}
          isLoading={isLoading}
          pagination={pagination}
          getRowId={(course) => course.courseId}
          onRowSelect={(course) =>
            navigate(
              buildPath(DASHBOARD_ROUTES.instructorCourseOverview, {
                courseId: course.courseId,
              })
            )
          }
          emptyTitleKey="instructor:courses.empty"
          emptyDescriptionKey="instructor:courses.emptyDescription"
        />
      </div>
    </PageContainer>
  );
}
