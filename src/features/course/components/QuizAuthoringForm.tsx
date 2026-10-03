/**
 * Quiz Authoring Form (W7 — extracted from `CourseQuizEditorPage`).
 *
 * The ONE quiz authoring form: details (title, description, status), the
 * settings (`QuizSettingsEditor` — essentials visible, the rest behind
 * "Advanced options"), the questions with a student preview, and one
 * atomic save. Used by the standalone quiz editor page and by the course
 * wizard's "Create quiz" sheet, so both behave identically.
 *
 * Saving matches `CreateQuizDto`/`UpdateQuizDto` (backend): `questions`
 * REPLACES the whole set; every setting is sent flat. On EDIT a blank
 * passing score, max attempts or description is sent as `null` — the
 * server's "clear" — because `undefined` means "keep" and used to make
 * clearing them a silent no-op (W7).
 *
 * Unsaved work is protected by `useUnsavedChanges` (route changes and tab
 * close); a container that closes WITHOUT navigating (the sheet) reads
 * `onDirtyChange` to ask before discarding.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Loader2, Pencil } from 'lucide-react';
import { useUnsavedChanges } from '@hooks';
import { saveViaForm } from '@utils';
import { Button } from '@/components/ui/button';
import { FieldHelp } from '@components/feedback';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from '@/hooks/use-toast';
import { isApiError } from '@api';
import { useServerValidation } from '@forms';
import {
  useCreateQuiz,
  useUpdateQuiz,
  quizAuthoringSchema,
  type QuizAuthoringFormData,
} from '@features/learning';
import type { QuizAuthoring, QuizStatus } from '@types';
import {
  QuizQuestionsEditor,
  QuizStudentPreview,
  type RelatedLessonOption,
} from './QuizQuestionsEditor';
import { QuizSettingsEditor } from './QuizSettingsEditor';
import {
  emptyQuizValues,
  quizToFormValues,
  toQuizPayload,
} from './quiz-authoring-form.utils';

export interface QuizAuthoringFormProps {
  readonly courseId: string;
  /** Present = edit this quiz; absent = create a new one. */
  readonly quiz?: QuizAuthoring;
  /** The course's lessons, for each question's related-lesson select. */
  readonly lessons: readonly RelatedLessonOption[];
  /** Called after a successful save, with the saved quiz. Navigation is the caller's. */
  readonly onSaved: (quiz: QuizAuthoring) => void;
  readonly onCancel: () => void;
  /** The status a NEW quiz starts with (the wizard starts it Published). */
  readonly defaultStatus?: QuizStatus;
  /** Reports dirtiness, for a container that closes without navigating (a sheet). */
  readonly onDirtyChange?: (dirty: boolean) => void;
  /** Extra content above the action buttons (e.g. the wizard's unit picker). */
  readonly beforeActions?: ReactNode;
  /** Focus the title on mount (the page does; a sheet manages its own focus). */
  readonly autoFocusTitle?: boolean;
}

export function QuizAuthoringForm({
  courseId,
  quiz,
  lessons,
  onSaved,
  onCancel,
  defaultStatus = 'draft',
  onDirtyChange,
  beforeActions,
  autoFocusTitle = true,
}: QuizAuthoringFormProps): JSX.Element {
  const { t } = useTranslation();
  const isEditMode = !!quiz;
  const [previewing, setPreviewing] = useState(false);

  const createQuiz = useCreateQuiz(courseId);
  const updateQuiz = useUpdateQuiz(courseId);

  const form = useForm<QuizAuthoringFormData>({
    resolver: zodResolver(quizAuthoringSchema),
    defaultValues: quiz
      ? quizToFormValues(quiz)
      : emptyQuizValues(defaultStatus),
  });

  const isDirty = form.formState.isDirty;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const mutationError = isEditMode ? updateQuiz.error : createQuiz.error;
  const isSaving = createQuiz.isPending || updateQuiz.isPending;
  useServerValidation(form, mutationError ?? null);

  async function persist(
    data: QuizAuthoringFormData
  ): Promise<QuizAuthoring | null> {
    try {
      let saved: QuizAuthoring;
      if (quiz) {
        saved = await updateQuiz.mutateAsync({
          quizId: quiz.id,
          payload: toQuizPayload(data, 'edit'),
        });
        toast({ title: t('course:quizAuthoring.updated') });
      } else {
        saved = await createQuiz.mutateAsync(toQuizPayload(data, 'create'));
        toast({ title: t('course:quizAuthoring.created') });
      }
      form.reset(data);
      return saved;
    } catch (error) {
      if (
        isApiError(error) &&
        error.kind === 'validation' &&
        error.violations?.length
      ) {
        return null;
      }
      toast({
        title: t('course:quizAuthoring.error'),
        description: t('errors:generic.description'),
        variant: 'destructive',
      });
      return null;
    }
  }

  // "Save and leave" in the route blocker reuses the same save.
  const { markSaved } = useUnsavedChanges({
    isDirty,
    onSave: () =>
      saveViaForm(form, async (data) => (await persist(data)) !== null),
  });

  const onSubmit = async (data: QuizAuthoringFormData) => {
    const saved = await persist(data);
    if (!saved) return;
    // Saved: the caller may navigate or close without being asked about
    // the work that was just saved.
    markSaved();
    onDirtyChange?.(false);
    onSaved(saved);
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
      >
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
                    <Input autoFocus={autoFocusTitle} {...field} />
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
                    <Textarea rows={2} {...field} value={field.value ?? ''} />
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

        {beforeActions}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
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
        !(isApiError(mutationError) && mutationError.kind === 'validation') ? (
          <p className="text-sm text-destructive">
            {t('errors:generic.description')}
          </p>
        ) : null}
      </form>
    </FormProvider>
  );
}
