/**
 * Course Quiz Editor Page (Phase 4, extended in P64 Phase 3 §E.1).
 *
 * Creates or edits one quiz on its own page. The form itself —
 * details, settings (essentials visible, the rest behind "Advanced
 * options"), questions, preview and the one atomic save — is
 * `QuizAuthoringForm` (W7), shared with the course wizard's "Create quiz"
 * sheet so both behave identically. This page owns only the route: loading
 * the quiz for edit, the header (with Delete), and where to go after a
 * save or cancel.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { toast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@app/providers';
import { useQuizForAuthoring, useDeleteQuiz } from '@features/learning';
import { useCourse, useCourseSections } from '../hooks';
import type { RelatedLessonOption } from '../components/QuizQuestionsEditor';
import { QuizAuthoringForm } from '../components/QuizAuthoringForm';

export default function CourseQuizEditorPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId, courseId, quizId } = useParams<{
    academyId: string;
    courseId: string;
    quizId?: string;
  }>();
  const { confirm } = useConfirmDialog();
  const isEditMode = !!quizId;

  const { data: course } = useCourse(academyId ?? '', courseId ?? '');
  const { data: sectionsData } = useCourseSections(
    academyId ?? '',
    courseId ?? ''
  );
  const lessons: readonly RelatedLessonOption[] = (
    sectionsData?.items ?? []
  ).flatMap((section) =>
    section.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      sectionTitle: section.title,
    }))
  );
  const {
    data: quiz,
    isLoading: isLoadingQuiz,
    error: quizError,
    refetch: refetchQuiz,
  } = useQuizForAuthoring(courseId ?? '', quizId, { enabled: isEditMode });

  const deleteQuiz = useDeleteQuiz(courseId ?? '');

  const goToList = () => {
    if (!academyId || !courseId) return;
    navigate(
      buildPath(DASHBOARD_ROUTES.academyCourseQuizzes, { academyId, courseId })
    );
  };

  const handleDelete = async () => {
    if (!quiz) return;
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
      goToList();
    } catch {
      toast({
        title: t('course:quizAuthoring.error'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
    }
  };

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
    {
      labelKey: 'course:quizAuthoring.title',
      path: buildPath(DASHBOARD_ROUTES.academyCourseQuizzes, {
        academyId: academyId ?? '',
        courseId: courseId ?? '',
      }),
    },
    {
      labelKey: isEditMode
        ? 'course:quizAuthoring.editor.editTitle'
        : 'course:quizAuthoring.editor.createTitle',
    },
  ];

  if (isEditMode && isLoadingQuiz) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (isEditMode && (quizError || !quiz)) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="course:quizAuthoring.editor.editTitle"
          breadcrumbs={breadcrumbs}
        />
        <ErrorState onRetry={() => refetchQuiz()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        titleKey={
          isEditMode
            ? 'course:quizAuthoring.editor.editTitle'
            : 'course:quizAuthoring.editor.createTitle'
        }
        breadcrumbs={breadcrumbs}
        actions={
          isEditMode ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => void handleDelete()}
              disabled={deleteQuiz.isPending}
            >
              <Trash2 className="size-4" aria-hidden />
              {t('course:quizAuthoring.menu.delete')}
            </Button>
          ) : undefined
        }
      />

      <QuizAuthoringForm
        // A different quiz (or create → edit) is a different form.
        key={quiz?.id ?? 'new'}
        courseId={courseId ?? ''}
        quiz={quiz}
        lessons={lessons}
        onSaved={goToList}
        onCancel={goToList}
      />
    </PageContainer>
  );
}
