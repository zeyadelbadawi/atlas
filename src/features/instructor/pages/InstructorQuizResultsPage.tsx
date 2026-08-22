/**
 * Instructor Quiz Results Page.
 *
 * Every enrolled student's attempts at one course quiz. Reads the quiz's
 * own title/description through the existing, unmodified student-facing
 * `QuizService` (definitions aren't role-specific) — only the cross-student
 * attempt list needs the instructor-scoped service.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { usePagination } from '@hooks';
import { useQuiz } from '@features/learning';
import { getQuizAttemptStatusTone } from '@features/learning';
import { useInstructorQuizAttempts } from '../hooks';
import type { QuizAttemptSummary } from '@types';

export default function InstructorQuizResultsPage(): JSX.Element {
  const { t } = useTranslation();
  const { courseId, quizId } = useParams<{
    courseId: string;
    quizId: string;
  }>();

  const { data: quiz } = useQuiz(courseId ?? '', quizId ?? '');

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });

  const { data, isLoading, error, refetch } = useInstructorQuizAttempts(
    courseId ?? '',
    quizId ?? '',
    {
      query: {
        pagination: { page: pagination.page, pageSize: pagination.pageSize },
      },
      enabled: !!courseId && !!quizId,
    }
  );

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const attempts = data?.items ?? [];

  const columns: ColumnDef<QuizAttemptSummary, unknown>[] = [
    {
      accessorKey: 'studentName',
      header: t('instructor:quizResults.table.student'),
      cell: ({ row }) => row.original.studentName,
    },
    {
      accessorKey: 'attemptNumber',
      header: t('instructor:quizResults.table.attempt'),
      cell: ({ row }) => row.original.attemptNumber,
    },
    {
      accessorKey: 'score',
      header: t('instructor:quizResults.table.score'),
      cell: ({ row }) =>
        typeof row.original.score === 'number'
          ? `${Math.round(row.original.score)}%`
          : '—',
    },
    {
      accessorKey: 'status',
      header: t('instructor:quizResults.table.status'),
      cell: ({ row }) => (
        <StatusBadge
          labelKey={`instructor:studentProgress.quizStatus.${row.original.status}`}
          tone={getQuizAttemptStatusTone(row.original.status)}
        />
      ),
    },
    {
      accessorKey: 'submittedAt',
      header: t('instructor:quizResults.table.submittedAt'),
      cell: ({ row }) =>
        row.original.submittedAt
          ? new Date(row.original.submittedAt).toLocaleDateString()
          : '—',
    },
  ];

  if (error) {
    return (
      <PageContainer>
        <PageHeader titleKey="instructor:quizResults.title" />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={quiz?.title}
        titleKey="instructor:quizResults.title"
      />

      <DataTable
        columns={columns}
        data={attempts}
        isLoading={isLoading}
        pagination={pagination}
        getRowId={(attempt) => attempt.id}
        emptyTitleKey="instructor:quizResults.empty"
        emptyDescriptionKey="instructor:quizResults.emptyDescription"
      />
    </PageContainer>
  );
}
