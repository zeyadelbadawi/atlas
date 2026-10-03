/**
 * Course Quiz Editor Page (Phase 4, extended in P64 Phase 3 §E.1).
 *
 * Creates or edits one quiz, including its complete question/option set,
 * in one atomic submission — matching `CreateQuizDto`/`UpdateQuizDto`
 * (backend): `questions`, when present, REPLACES the whole set, there is
 * no per-question CRUD.
 *
 * Phase 3 adds the settings block (presets + grouped cards, see
 * `QuizSettingsEditor`), per-question points / explanation / related
 * lesson, the `short_answer` and `essay` types, and a read-only "preview
 * as student" of the questions. Every setting is sent flat on the
 * payload (`CreateQuizPayload extends QuizSettingsInput`); text-type
 * questions send `options: []` because the server rejects options there.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { useUnsavedChanges } from '@hooks';
import { saveViaForm } from '@utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Loader2, Pencil, Trash2 } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState } from '@components/feedback';
import { Button } from '@/components/ui/button';
import { FieldHelp } from '@components/feedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FormControl,
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
  defaultQuizSettingsFormValues,
  type QuizAuthoringFormData,
  type QuizQuestionFormData,
} from '@features/learning';
import type { QuizQuestionInput } from '@types';
import { useCourse, useCourseSections } from '../hooks';
import {
  QuizQuestionsEditor,
  QuizStudentPreview,
  type RelatedLessonOption,
} from '../components/QuizQuestionsEditor';
import {
  QuizSettingsEditor,
  quizSettingsFormToPayload,
  quizSettingsToFormValues,
} from '../components/QuizSettingsEditor';

/**
 * The blank quiz a "create" visit starts from.
 *
 * A FUNCTION, NOT A MODULE-SCOPE CONSTANT, and deliberately so. Building
 * it at module scope meant calling `blankQuizQuestion()` — imported from
 * `@features/learning` — while this module was being evaluated, and this
 * module is reachable from that same barrel (`@features/learning` →
 * its pages → `@features/course` → here). In an import cycle the binding
 * that is still initialising reads as `undefined`, so the call threw
 * `blankQuizQuestion is not a function` depending only on which module
 * the bundler happened to enter first. Deferring the call to render time
 * removes the cycle's only side effect; nothing else about the default
 * changes, and a fresh object per visit is what a form default should be
 * anyway.
 */
function emptyQuizValues(): QuizAuthoringFormData {
  return {
    title: '',
    description: '',
    status: 'draft',
    passingScore: undefined,
    maxAttempts: undefined,
    ...defaultQuizSettingsFormValues(),
    questions: [blankQuizQuestion()],
  };
}

/**
 * One form question → the `QuizQuestionInput` the server accepts. Text
 * types never carry options; only `short_answer` carries accepted
 * answers; blank explanation / related lesson are omitted, not sent as
 * empty strings.
 */
function toQuestionInput(question: QuizQuestionFormData): QuizQuestionInput {
  const isTextType =
    question.type === 'short_answer' || question.type === 'essay';
  return {
    prompt: question.prompt,
    type: question.type,
    options: isTextType
      ? []
      : question.options.map((option) => ({
          label: option.label,
          isCorrect: option.isCorrect,
        })),
    points: question.points,
    explanation: question.explanation?.trim() || undefined,
    relatedLessonId: question.relatedLessonId || undefined,
    acceptedAnswers:
      question.type === 'short_answer'
        ? (question.acceptedAnswers ?? []).map((answer) => answer.value.trim())
        : undefined,
  };
}

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
  const [previewing, setPreviewing] = useState(false);

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
          ...quizSettingsToFormValues(quiz.settings),
          questions: quiz.questions.map((question) => ({
            prompt: question.prompt,
            type: question.type,
            options: question.options.map((option) => ({
              label: option.label,
              isCorrect: option.isCorrect,
            })),
            points: question.points,
            explanation: question.explanation ?? '',
            relatedLessonId: question.relatedLessonId ?? '',
            acceptedAnswers: (question.acceptedAnswers ?? []).map((value) => ({
              value,
            })),
          })),
        }
      : isEditMode
        ? undefined
        : emptyQuizValues(),
  });

  // Warns before this editor is left with unsaved work — both on
  // in-app navigation (via the shared registry the route blocker
  // reads) and on tab close or refresh.
  // `persist` is the save without the navigation, so "Save and leave" can
  // reuse it and then continue to wherever the user was going.
  const { markSaved } = useUnsavedChanges({
    isDirty: form.formState.isDirty,
    onSave: () => saveViaForm(form, persist),
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

  async function persist(data: QuizAuthoringFormData): Promise<boolean> {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      status: data.status,
      passingScore: data.passingScore,
      maxAttempts: data.maxAttempts,
      ...quizSettingsFormToPayload(data),
      questions: data.questions.map(toQuestionInput),
    };

    try {
      if (isEditMode && quizId) {
        await updateQuiz.mutateAsync({ quizId, payload });
        toast({ title: t('course:quizAuthoring.updated') });
      } else {
        await createQuiz.mutateAsync(payload);
        toast({ title: t('course:quizAuthoring.created') });
      }
      form.reset(data);
      return true;
    } catch (error) {
      if (
        isApiError(error) &&
        error.kind === 'validation' &&
        error.violations?.length
      ) {
        return false;
      }
      toast({
        title: t('course:quizAuthoring.error'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
      return false;
    }
  }

  const onSubmit = async (data: QuizAuthoringFormData) => {
    if (!(await persist(data))) return;
    // Saved: leave without the unsaved-changes dialog asking about the
    // work that was just saved.
    markSaved();
    goToList();
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

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {t('course:quizAuthoring.editor.detailsTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('course:quizAuthoring.editor.titleLabel')}
                    </FormLabel>
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

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="sm:max-w-xs">
                    <FormLabel className="flex items-center gap-1.5">
                      {t('course:quizAuthoring.editor.statusLabel')}
                      <FieldHelp contentKey="course:quizAuthoring.editor.help.status" />
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
            </CardContent>
          </Card>

          <QuizSettingsEditor />

          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={previewing}
              onClick={() => setPreviewing((current) => !current)}
            >
              {previewing ? (
                <Pencil className="size-4" strokeWidth={2} aria-hidden />
              ) : (
                <Eye className="size-4" strokeWidth={2} aria-hidden />
              )}
              {t(
                previewing
                  ? 'course:quizAuthoring.preview.backToEditing'
                  : 'course:quizAuthoring.preview.toggle'
              )}
            </Button>
          </div>

          {previewing ? (
            <QuizStudentPreview />
          ) : (
            <QuizQuestionsEditor lessons={lessons} />
          )}

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

          {mutationError &&
          !(
            isApiError(mutationError) && mutationError.kind === 'validation'
          ) ? (
            <p className="text-sm text-destructive">
              {t('errors:generic.description')}
            </p>
          ) : null}
        </form>
      </FormProvider>
    </PageContainer>
  );
}
