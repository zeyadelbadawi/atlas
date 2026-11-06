/**
 * Course Quiz Editor Page (Phase 4, extended in P64 Phase 3 §E.1).
 *
 * Creates or edits one quiz on its own page. The form itself —
 * details, settings (essentials visible, the rest behind "Advanced
 * options"), questions, preview and the one atomic save — is
 * `QuizAuthoringForm` (W7), shared with the course wizard's "Create quiz"
 * sheet so both behave identically. This page owns only the route: loading
 * the quiz for edit, the header (with Delete), where to go after a save or
 * cancel, and which unit a NEW quiz goes into (`UnitPickerField`; the unit
 * in `?sectionId=` when the page was opened from one, else the first) —
 * an existing quiz's unit is shown, not changed, here.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { useCourse, useUnitPlacement } from '../hooks';
import type { RelatedLessonOption } from '../components/QuizQuestionsEditor';
import { QuizAuthoringForm } from '../components/QuizAuthoringForm';
import {
  UnitPickerField,
  UnitPlacementNote,
} from '../components/UnitPickerField';
import { useCourseEditorLeadCrumbs } from '../hooks/useCourseEditorTabs';
import { useActionFailureToast } from '../forms/course-form-feedback';

export default function CourseQuizEditorPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { academyId, courseId, quizId } = useParams<{
    academyId: string;
    courseId: string;
    quizId?: string;
  }>();
  const { confirm } = useConfirmDialog();
  const failureToast = useActionFailureToast();
  const isEditMode = !!quizId;

  const [searchParams] = useSearchParams();

  const { data: course } = useCourse(academyId ?? '', courseId ?? '');
  const placement = useUnitPlacement(academyId ?? '', courseId ?? '', {
    preferredSectionId: searchParams.get('sectionId'),
  });
  const lessons: readonly RelatedLessonOption[] = placement.sections.flatMap(
    (section) =>
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
    } catch (deleteError) {
      failureToast('course:quizAuthoring.deleteError', deleteError);
    }
  };

  const leadCrumbs = useCourseEditorLeadCrumbs(
    academyId ?? '',
    courseId ?? '',
    course?.title,
    'course:quizAuthoring.title'
  );
  const breadcrumbs: readonly BreadcrumbItem[] = [
    ...leadCrumbs,
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
        createPlacement={
          !isEditMode && placement.section
            ? {
                sectionId: placement.section.id,
                unitTitle: placement.section.title,
              }
            : null
        }
        beforeActions={
          isEditMode ? (
            <UnitPlacementNote
              sections={placement.sections}
              sectionId={quiz?.sectionId}
            />
          ) : (
            <UnitPickerField
              sections={placement.sections}
              value={placement.value}
              onChange={placement.setValue}
              itemType="quiz"
            />
          )
        }
      />
    </PageContainer>
  );
}
