/**
 * Course Quiz Editor Page (Phase 4).
 *
 * Creates or edits one quiz, including its complete question/option set,
 * in one atomic submission — matching `CreateQuizDto`/`UpdateQuizDto`
 * (backend): `questions`, when present, REPLACES the whole set, there is
 * no per-question CRUD.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Trash2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { toast } from '@/hooks/use-toast';
import { isApiError } from '@api';
import { useConfirmDialog } from '@app/providers';
import { useServerValidation } from '@forms';
import {
  useQuizForAuthoring,
  useCreateQuiz,
  useUpdateQuiz,
  useDeleteQuiz,
  quizAuthoringSchema,
  blankQuizQuestion,
  type QuizAuthoringFormData,
} from '@features/learning';
import { useCourse } from '../hooks';
import { QuizQuestionsEditor } from '../components/QuizQuestionsEditor';

const EMPTY_VALUES: QuizAuthoringFormData = {
  title: '',
  description: '',
  status: 'draft',
  passingScore: undefined,
  maxAttempts: undefined,
  questions: [blankQuizQuestion()],
};

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
  const {
    data: quiz,
    isLoading: isLoadingQuiz,
    error: quizError,
    refetch: refetchQuiz,
  } = useQuizForAuthoring(courseId ?? '', quizId, { enabled: isEditMode });

  const createQuiz = useCreateQuiz(courseId ?? '');
  const updateQuiz = useUpdateQuiz(courseId ?? '');
  const deleteQuiz = useDeleteQuiz(courseId ?? '');

  const form = useForm<QuizAuthoringFormData>({
    resolver: zodResolver(quizAuthoringSchema),
    values: quiz
      ? {
          title: quiz.title,
          description: quiz.description ?? '',
          status: quiz.status,
          passingScore: quiz.passingScore,
          maxAttempts: quiz.maxAttempts,
          questions: quiz.questions.map((question) => ({
            prompt: question.prompt,
            type: question.type,
            options: question.options.map((option) => ({
              label: option.label,
              isCorrect: option.isCorrect,
            })),
          })),
        }
      : isEditMode
        ? undefined
        : EMPTY_VALUES,
  });

  const goToList = () => {
    if (!academyId || !courseId) return;
    navigate(
      buildPath(DASHBOARD_ROUTES.academyCourseQuizzes, { academyId, courseId })
    );
  };

  const mutationError = isEditMode ? updateQuiz.error : createQuiz.error;
  const isSaving = createQuiz.isPending || updateQuiz.isPending;

  useServerValidation(form, mutationError ?? null);

  const onSubmit = async (data: QuizAuthoringFormData) => {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      status: data.status,
      passingScore: data.passingScore,
      maxAttempts: data.maxAttempts,
      questions: data.questions.map((question) => ({
        prompt: question.prompt,
        type: question.type,
        options: question.options.map((option) => ({
          label: option.label,
          isCorrect: option.isCorrect,
        })),
      })),
    };

    try {
      if (isEditMode && quizId) {
        await updateQuiz.mutateAsync({ quizId, payload });
        toast({ title: t('course:quizAuthoring.updated') });
      } else {
        await createQuiz.mutateAsync(payload);
        toast({ title: t('course:quizAuthoring.created') });
      }
      goToList();
    } catch (error) {
      if (isApiError(error) && error.kind === 'validation' && error.violations?.length) {
        return;
      }
      toast({
        title: t('course:quizAuthoring.error'),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
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
        description: t('errors:generic'),
        variant: 'destructive',
      });
    }
  };

  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'course:list.title',
      path: buildPath(DASHBOARD_ROUTES.academyCourses, { academyId: academyId ?? '' }),
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

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('course:quizAuthoring.editor.detailsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('course:quizAuthoring.editor.titleLabel')}</FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('course:quizAuthoring.editor.descriptionLabel')}
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('course:quizAuthoring.editor.statusLabel')}
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">
                            {t('course:lessonStatus.draft')}
                          </SelectItem>
                          <SelectItem value="published">
                            {t('course:lessonStatus.published')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passingScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('course:quizAuthoring.editor.passingScoreLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxAttempts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('course:quizAuthoring.editor.maxAttemptsLabel')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('course:quizAuthoring.editor.maxAttemptsHelp')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <QuizQuestionsEditor />

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={goToList}
              disabled={isSaving}
            >
              {t('course:quizAuthoring.editor.cancelButton')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t('course:quizAuthoring.editor.saveButton')}
            </Button>
          </div>

          {mutationError && !(isApiError(mutationError) && mutationError.kind === 'validation') ? (
            <p className="text-sm text-destructive">{t('errors:generic')}</p>
          ) : null}
        </form>
      </FormProvider>
    </PageContainer>
  );
}
