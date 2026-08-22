/**
 * Instructor Assignment Submissions Page.
 *
 * Lists every enrolled student's submission for one assignment, so an
 * instructor can see grading status at a glance before opening a review.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { usePagination } from '@hooks';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { getSubmissionStatusTone } from '@features/learning';
import { useInstructorSubmissions } from '../hooks';
import type { AssignmentSubmissionReview } from '@types';

export default function InstructorSubmissionsPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courseId, assignmentId } = useParams<{
    courseId: string;
    assignmentId: string;
  }>();

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useInstructorSubmissions(
    courseId ?? '',
    assignmentId ?? '',
    {
      query: {
        pagination: { page: pagination.page, pageSize: pagination.pageSize },
      },
      enabled: !!courseId && !!assignmentId,
    }
  );

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const submissions = data?.items ?? [];

  const columns: ColumnDef<AssignmentSubmissionReview, unknown>[] = [
    {
      accessorKey: 'studentName',
      header: t('instructor:submissions.table.student'),
      cell: ({ row }) => row.original.studentName,
    },
    {
      accessorKey: 'status',
      header: t('instructor:submissions.table.status'),
      cell: ({ row }) => (
        <StatusBadge
          labelKey={`learning:assignment.status.${row.original.status}`}
          tone={getSubmissionStatusTone(row.original.status)}
        />
      ),
    },
    {
      accessorKey: 'gradingStatus',
      header: t('instructor:submissions.table.gradingStatus'),
      cell: ({ row }) => (
        <StatusBadge
          labelKey={`instructor:grading.status.${row.original.gradingStatus}`}
          tone={row.original.gradingStatus === 'graded' ? 'success' : 'warning'}
        />
      ),
    },
    {
      accessorKey: 'grade',
      header: t('instructor:submissions.table.score'),
      cell: ({ row }) =>
        row.original.grade?.score !== undefined
          ? `${row.original.grade.score}%`
          : '—',
    },
    {
      accessorKey: 'submittedAt',
      header: t('instructor:submissions.table.submittedAt'),
      cell: ({ row }) =>
        row.original.submittedAt
          ? new Date(row.original.submittedAt).toLocaleDateString()
          : '—',
    },
  ];

  if (error) {
    return (
      <PageContainer>
        <PageHeader titleKey="instructor:submissions.title" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey="instructor:submissions.title"
        descriptionKey="instructor:submissions.subtitle"
      />

      <DataTable
        columns={columns}
        data={submissions}
        isLoading={isLoading}
        pagination={pagination}
        getRowId={(submission) => submission.id}
        onRowSelect={(submission) =>
          courseId &&
          assignmentId &&
          navigate(
            buildPath(DASHBOARD_ROUTES.instructorSubmissionReview, {
              courseId,
              assignmentId,
              submissionId: submission.id,
            })
          )
        }
        emptyTitleKey="instructor:submissions.empty"
        emptyDescriptionKey="instructor:submissions.emptyDescription"
      />
    </PageContainer>
  );
}
