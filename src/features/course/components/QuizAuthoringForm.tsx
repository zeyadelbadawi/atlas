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
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import {
  FormErrorSummary,
  hasViolationOn,
  RequiredMark,
  SaveFailedAlert,
  useFocusFirstViolation,
  useLabelledViolations,
  useServerValidation,
} from '@forms';
import {
  useCreateQuiz,
  useUpdateQuiz,
  quizAuthoringSchemaFor,
  MAX_QUIZ_DESCRIPTION_LENGTH,
  type QuizAuthoringFormData,
} from '@features/learning';
import { CharacterCount } from './CharacterCount';
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

/** The API's names for settings the form holds in another shape. */
const QUIZ_SERVER_FIELD_ALIASES = {
  timeLimitSeconds: 'timeLimitMinutes',
} as const;

/**
 * Labels for the error summary and for server violations (V12/V18). A
 * question's fields (`questions.0.prompt`) are labelled by the summary's
 * fallback; the top-level ones are named here.
 */
/**
 * B3 (UX audit) — where a question's problem is, in words: "Question 2 ·
 * Option 1" instead of "Label" (the summary used the path's last segment).
 */
function quizItemLabel(
  name: string,
  t: (key: string, values?: Record<string, unknown>) => string
): string | undefined {
  const match = /^questions\.(\d+)(?:\.(\w+))?(?:\.(\d+)(?:\.\w+)?)?$/.exec(
    name
  );
  if (!match) return undefined;
  const question = t('course:quizAuthoring.editor.questionLabel', {
    number: Number(match[1]) + 1,
  });
  const [, , field, option] = match;
  if (field === 'options' && option !== undefined) {
    return `${question} · ${t('course:quizAuthoring.editor.optionLabel', {
      number: Number(option) + 1,
    })}`;
  }
  if (field === 'options') {
    return `${question} · ${t('course:quizAuthoring.editor.optionsLabel')}`;
  }
  if (field === 'prompt') {
    return `${question} · ${t('course:quizAuthoring.editor.promptLabel')}`;
  }
  return question;
}

const QUIZ_FIELD_LABELS: Readonly<Record<string, string>> = {
  title: 'course:quizAuthoring.editor.titleLabel',
  description: 'course:quizAuthoring.editor.descriptionLabel',
  status: 'course:quizAuthoring.editor.statusLabel',
  passingScore: 'course:quizAuthoring.editor.passingScoreLabel',
  maxAttempts: 'course:quizAuthoring.editor.maxAttemptsLabel',
  timeLimitMinutes: 'course:quizAuthoring.settings.fields.timeLimit.label',
  timeLimitSeconds: 'course:quizAuthoring.settings.fields.timeLimit.label',
  availableFrom: 'course:quizAuthoring.settings.fields.availableFrom.label',
  availableUntil: 'course:quizAuthoring.settings.fields.availableUntil.label',
  dueAt: 'course:quizAuthoring.settings.fields.dueAt.label',
  questions: 'course:quizAuthoring.editor.questionsTitle',
};

/** A server violation on any of these (or on a question) lands on a field. */
function isFormField(field: string): boolean {
  return field in QUIZ_FIELD_LABELS || field.startsWith('questions');
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

  // B3 (V21) — a due date or window end the author sets must be in the
  // future; the dates an existing quiz already has may stay as they are.
  const initialDates = quiz ? quizToFormValues(quiz) : undefined;
  const initialDueAt = initialDates?.dueAt;
  const initialUntil = initialDates?.availableUntil;
  const schema = useMemo(
    () =>
      quizAuthoringSchemaFor({
        dueAt: initialDueAt,
        availableUntil: initialUntil,
      }),
    [initialDueAt, initialUntil]
  );
  const form = useForm<QuizAuthoringFormData>({
    resolver: zodResolver(schema),
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
  // B3 — violations on their fields, labelled in the page's language
  // (V12) with focus on the first; anything else ONE inline alert with the
  // real reason (V05 — it used to be a toast, a second toast and a generic
  // line under the buttons).
  const labelled = useLabelledViolations(
    mutationError ?? null,
    QUIZ_FIELD_LABELS
  );
  useServerValidation(form, labelled, QUIZ_SERVER_FIELD_ALIASES);
  const violationFields = Object.fromEntries(
    (labelled?.violations ?? [])
      .filter((violation) => isFormField(violation.field))
      .map((violation) => [violation.field, violation.field])
  );
  useFocusFirstViolation(
    form,
    labelled,
    violationFields,
    QUIZ_SERVER_FIELD_ALIASES
  );
  const saveFailure =
    mutationError && !hasViolationOn(mutationError, violationFields)
      ? mutationError
      : null;
  const descriptionLength = (form.watch('description') ?? '').length;

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
    } catch {
      // Shown once: on its field, or in the alert above the buttons.
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
        <FormErrorSummary
          form={form}
          fieldLabels={QUIZ_FIELD_LABELS}
          labelFor={(name) => quizItemLabel(name, t)}
        />
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
                    <RequiredMark />
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
                  <CharacterCount
                    id="quiz-description-count"
                    length={descriptionLength}
                    max={MAX_QUIZ_DESCRIPTION_LENGTH}
                  />
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

        {saveFailure ? (
          <SaveFailedAlert
            error={saveFailure}
            titleKey={
              isEditMode
                ? 'common:form.notSaved'
                : 'course:quizAuthoring.notCreated'
            }
            onRetry={() => void form.handleSubmit(onSubmit)()}
          />
        ) : null}

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
      </form>
    </FormProvider>
  );
}
