/**
 * Course Quizzes Page (Phase 4).
 *
 * Lists every quiz belonging to a course (draft + published) for an
 * authoring user. Editing itself happens on `CourseQuizEditorPage` — a
 * quiz's question/option set is authored atomically, so "edit" is a full
 * page, not a small dialog like `AssignmentFormDialog`.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { MoreHorizontal, Plus } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionTabs } from '@components/navigation';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@app/providers';
import { useQuizzesForAuthoring, useDeleteQuiz } from '@features/learning';
import { useCourse } from '../hooks';
import {
  getLessonStatusLabelKey,
  getLessonStatusTone,
} from '../utils/course-status.utils';
import { getCourseEditorTabs } from '../utils/course-navigation.utils';
import type { Quiz } from '@types';

export default function CourseQuizzesPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId, courseId } = useParams<{
    academyId: string;
    courseId: string;
  }>();
  const { confirm } = useConfirmDialog();

  const { data: course } = useCourse(academyId ?? '', courseId ?? '');

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'course:list.title',
      path: buildPath(DASHBOARD_ROUTES.academyCourses, {
        academyId: academyId ?? '',
      }),
    },
    ...(course
      ? [
          {
            labelKey: 'course:quizAuthoring.title',
            label: course.title,
            path: buildPath(DASHBOARD_ROUTES.academyCourseDetail, {
              academyId: academyId ?? '',
              courseId: courseId ?? '',
            }),
          } satisfies BreadcrumbItem,
        ]
      : []),
    { labelKey: 'course:quizAuthoring.title' },
  ];

  const {
    data: quizzesData,
    isLoading,
    error,
    refetch,
  } = useQuizzesForAuthoring(courseId ?? '');
  const quizzes = quizzesData?.items ?? [];

  const deleteQuiz = useDeleteQuiz(courseId ?? '');

  const goToCreate = () => {
    if (!academyId || !courseId) return;
    navigate(
      buildPath(DASHBOARD_ROUTES.academyCourseQuizCreate, {
        academyId,
        courseId,
      })
    );
  };

  const goToEdit = (quizId: string) => {
    if (!academyId || !courseId) return;
    navigate(
      buildPath(DASHBOARD_ROUTES.academyCourseQuizEdit, {
        academyId,
        courseId,
        quizId,
      })
    );
  };

  const handleDelete = async (quiz: Quiz) => {
    const confirmed = await confirm({
      titleKey: 'course:quizAuthoring.deleteConfirm.title',
      descriptionKey: 'course:quizAuthoring.deleteConfirm.description',
      confirmLabelKey: 'course:quizAuthoring.deleteConfirm.confirmLabel',
      cancelLabelKey: 'course:quizAuthoring.deleteConfirm.cancelLabel',
      values: { title: quiz.title },
      intent: 'destructive',
    });
    if (!confirmed) return;

    try {
      await deleteQuiz.mutateAsync(quiz.id);
      toast({ title: t('course:quizAuthoring.deleted') });
    } catch {
      toast({
        title: t('course:quizAuthoring.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="course:quizAuthoring.title"
          descriptionKey="course:quizAuthoring.subtitle"
          breadcrumbs={breadcrumbs}
        />
        <ErrorState onRetry={() => refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={course?.title}
        titleKey="course:quizAuthoring.title"
        descriptionKey="course:quizAuthoring.subtitle"
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={goToCreate}>
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            {t('course:quizAuthoring.addQuiz')}
          </Button>
        }
      />

      {academyId && courseId ? (
        <SectionTabs items={getCourseEditorTabs(academyId, courseId)} />
      ) : null}

      {quizzes.length === 0 ? (
        <EmptyState
          titleKey="course:quizAuthoring.empty"
          descriptionKey="course:quizAuthoring.emptyDescription"
          primaryAction={{
            labelKey: 'course:quizAuthoring.addQuiz',
            onAction: goToCreate,
            icon: Plus,
          }}
        />
      ) : (
        <ol className="space-y-3">
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 space-y-1 text-start"
                    onClick={() => goToEdit(quiz.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {quiz.title}
                      </span>
                      <StatusBadge
                        labelKey={getLessonStatusLabelKey(quiz.status)}
                        tone={getLessonStatusTone(quiz.status)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('course:quizAuthoring.questionCount', {
                        count: quiz.questionCount,
                      })}
                    </p>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('course:quizAuthoring.menu.edit')}
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => goToEdit(quiz.id)}>
                        {t('course:quizAuthoring.menu.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => void handleDelete(quiz)}
                      >
                        {t('course:quizAuthoring.menu.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </PageContainer>
  );
}
