/**
 * Instructor Student Roster Page.
 *
 * Lists the students enrolled in one course this instructor is authorized
 * to teach. Read-only — grading and progress detail live on their own
 * dedicated pages/routes.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Input } from '@/components/ui/input';
import { useDebounce, usePagination } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  getCourseCompletionTone,
  getEnrollmentStatusTone,
} from '@features/learning';
import { useCourseStudents } from '../hooks';
import type { InstructorStudent } from '@types';

export default function InstructorStudentsPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId: string }>();

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput);
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useCourseStudents(
    courseId ?? '',
    {
      query: {
        pagination: { page: pagination.page, pageSize: pagination.pageSize },
        search: debouncedSearch.trim() || undefined,
      },
      enabled: !!courseId,
    }
  );

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const students = data?.items ?? [];

  const columns: ColumnDef<InstructorStudent, unknown>[] = [
    {
      accessorKey: 'name',
      header: t('instructor:students.table.name'),
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.email}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'enrollmentStatus',
      header: t('instructor:students.table.enrollmentStatus'),
      cell: ({ row }) => (
        <StatusBadge
          labelKey={`instructor:students.enrollmentStatus.${row.original.enrollmentStatus}`}
          tone={getEnrollmentStatusTone(row.original.enrollmentStatus)}
        />
      ),
    },
    {
      accessorKey: 'progressPercentage',
      header: t('instructor:students.table.progress'),
      cell: ({ row }) => `${Math.round(row.original.progressPercentage)}%`,
    },
    {
      accessorKey: 'completionState',
      header: t('instructor:students.table.completionState'),
      cell: ({ row }) => (
        <StatusBadge
          labelKey={`instructor:students.completionState.${row.original.completionState}`}
          tone={getCourseCompletionTone(row.original.completionState)}
        />
      ),
    },
    {
      accessorKey: 'lastActivityAt',
      header: t('instructor:students.table.lastActivity'),
      cell: ({ row }) =>
        row.original.lastActivityAt
          ? new Date(row.original.lastActivityAt).toLocaleDateString()
          : '—',
    },
  ];

  if (error) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="instructor:students.title"
          descriptionKey="instructor:students.subtitle"
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="instructor:students.title"
        descriptionKey="instructor:students.subtitle"
      />

      <div className="space-y-4">
        <div className="relative max-w-xs">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('instructor:students.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9"
          />
        </div>

        <DataTable
          columns={columns}
          data={students}
          isLoading={isLoading}
          pagination={pagination}
          getRowId={(student) => student.studentId}
          onRowSelect={(student) =>
            courseId &&
            navigate(
              buildPath(DASHBOARD_ROUTES.instructorStudentProgress, {
                courseId,
                studentId: student.studentId,
              })
            )
          }
          emptyTitleKey="instructor:students.empty"
          emptyDescriptionKey="instructor:students.emptyDescription"
        />
      </div>
    </PageContainer>
  );
}
