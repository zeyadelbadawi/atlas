/**
 * Quiz Questions Editor (Phase 4, extended in P64 Phase 3).
 *
 * The question/option editor at the heart of quiz authoring — a dynamic
 * list of questions, each with a type (single_choice / multiple_choice /
 * true_false / short_answer / essay, matching `quiz-scoring.util.ts`,
 * backend), points, an optional explanation, an optional related lesson
 * and, for choice types, its own dynamic option list with a
 * correct-answer selector. `short_answer` carries a list of accepted
 * answers instead of options; `essay` carries nothing — a reviewer grades
 * it by hand. Reads/writes the `questions` field of the enclosing
 * `QuizAuthoringFormData` form via `useFormContext` — only the lesson
 * list is passed down, because it comes from a different query.
 *
 * `QuizStudentPreview` is the read-only "preview as student" rendering of
 * the same form values: no correct answer is highlighted, options keep
 * their authored order and every input is disabled.
 */
import type { ReactNode } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FieldHelp } from '@components/feedback';
import {
  blankQuizAcceptedAnswer,
  blankQuizOption,
  blankQuizQuestion,
  MAX_QUIZ_ACCEPTED_ANSWERS,
  MAX_QUIZ_QUESTION_POINTS,
  MIN_QUIZ_QUESTION_POINTS,
  QUIZ_QUESTION_TYPES,
  type QuizAuthoringFormData,
  type QuizQuestionFormData,
} from '@features/learning';
import { TEXT_QUESTION_TYPES, type QuizQuestionType } from '@types';

/** A lesson the related-lesson select can point at. */
export interface RelatedLessonOption {
  readonly id: string;
  readonly title: string;
  readonly sectionTitle: string;
}

/** Radix `Select` rejects an empty-string item value, so "none" needs a sentinel. */
const NO_LESSON = '__none__';

function isTextType(type: QuizQuestionType): boolean {
  return TEXT_QUESTION_TYPES.includes(type);
}

export interface QuizQuestionsEditorProps {
  /** The course's lessons, for the related-lesson select. Empty while loading. */
  readonly lessons: readonly RelatedLessonOption[];
}

export function QuizQuestionsEditor({
  lessons,
}: QuizQuestionsEditorProps): JSX.Element {
  const { t } = useTranslation();
  const { control } = useFormContext<QuizAuthoringFormData>();

  const questions = useFieldArray({ control, name: 'questions' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-foreground">
          {t('course:quizAuthoring.editor.questionsTitle')}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => questions.append(blankQuizQuestion())}
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          {t('course:quizAuthoring.editor.addQuestion')}
        </Button>
      </div>

      <ol className="space-y-4">
        {questions.fields.map((question, questionIndex) => (
          <li key={question.id}>
            <QuestionCard
              questionIndex={questionIndex}
              lessons={lessons}
              onRemove={
                questions.fields.length > 1
                  ? () => questions.remove(questionIndex)
                  : undefined
              }
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

interface QuestionCardProps {
  readonly questionIndex: number;
  readonly lessons: readonly RelatedLessonOption[];
  /** Undefined when this is the last remaining question — a quiz always needs at least one. */
  readonly onRemove?: () => void;
}

function QuestionCard({
  questionIndex,
  lessons,
  onRemove,
}: QuestionCardProps): JSX.Element {
  const { t } = useTranslation();
  const { control, watch, setValue } = useFormContext<QuizAuthoringFormData>();

  const options = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
  });
  const acceptedAnswers = useFieldArray({
    control,
    name: `questions.${questionIndex}.acceptedAnswers`,
  });

  const type = watch(`questions.${questionIndex}.type`);

  /**
   * Switching type re-shapes the option list to match what that type
   * needs, clearing any prior correct-answer selection that no longer
   * makes sense. Text types get NO options (the server rejects them) and
   * a short-answer question starts with one blank accepted answer.
   */
  const handleTypeChange = (nextType: QuizQuestionType) => {
    const previousType = watch(`questions.${questionIndex}.type`);
    setValue(`questions.${questionIndex}.type`, nextType, {
      shouldDirty: true,
    });

    if (isTextType(nextType)) {
      setValue(`questions.${questionIndex}.options`, [], {
        shouldDirty: true,
      });
      const currentAnswers =
        watch(`questions.${questionIndex}.acceptedAnswers`) ?? [];
      setValue(
        `questions.${questionIndex}.acceptedAnswers`,
        nextType === 'short_answer' && currentAnswers.length === 0
          ? [blankQuizAcceptedAnswer()]
          : nextType === 'essay'
            ? []
            : currentAnswers,
        { shouldDirty: true }
      );
      return;
    }

    if (nextType === 'true_false') {
      setValue(
        `questions.${questionIndex}.options`,
        [
          {
            label: t('course:quizAuthoring.editor.trueLabel'),
            isCorrect: false,
          },
          {
            label: t('course:quizAuthoring.editor.falseLabel'),
            isCorrect: false,
          },
        ],
        { shouldDirty: true }
      );
      return;
    }

    if (previousType === 'true_false' || isTextType(previousType)) {
      // The locked True/False labels aren't meaningful option text for
      // single/multiple choice, and a text question had no options at
      // all — start fresh instead of keeping them.
      setValue(
        `questions.${questionIndex}.options`,
        [blankQuizOption(), blankQuizOption()],
        { shouldDirty: true }
      );
      return;
    }

    // single_choice only ever allows one correct option — coming from
    // multiple_choice, clear every correct flag but the first.
    if (nextType === 'single_choice') {
      const currentOptions = watch(`questions.${questionIndex}.options`);
      const firstCorrectIndex = currentOptions.findIndex(
        (option) => option.isCorrect
      );
      currentOptions.forEach((option, index) => {
        const shouldBeCorrect = index === firstCorrectIndex;
        if (option.isCorrect !== shouldBeCorrect) {
          setValue(
            `questions.${questionIndex}.options.${index}.isCorrect`,
            shouldBeCorrect,
            { shouldDirty: true }
          );
        }
      });
    }
  };

  const handleSingleCorrectChange = (selectedIndex: number) => {
    options.fields.forEach((_, index) => {
      setValue(
        `questions.${questionIndex}.options.${index}.isCorrect`,
        index === selectedIndex,
        { shouldDirty: true }
      );
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <h4 className="font-display text-sm font-semibold text-foreground">
          {t('course:quizAuthoring.editor.questionLabel', {
            number: questionIndex + 1,
          })}
        </h4>
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label={t('course:quizAuthoring.editor.removeQuestion')}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <FormField
          control={control}
          name={`questions.${questionIndex}.prompt`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('course:quizAuthoring.editor.promptLabel')}
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
            control={control}
            name={`questions.${questionIndex}.type`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('course:quizAuthoring.editor.typeLabel')}
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) =>
                    handleTypeChange(value as QuizQuestionType)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {QUIZ_QUESTION_TYPES.map((questionType) => (
                      <SelectItem key={questionType} value={questionType}>
                        {t(`course:quizAuthoring.editor.type.${questionType}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`questions.${questionIndex}.points`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  {t('course:quizAuthoring.editor.pointsLabel')}
                  <FieldHelp contentKey="course:quizAuthoring.editor.help.points" />
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={MIN_QUIZ_QUESTION_POINTS}
                    max={MAX_QUIZ_QUESTION_POINTS}
                    step={1}
                    {...field}
                    value={
                      field.value === undefined || field.value === null
                        ? ''
                        : String(field.value)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`questions.${questionIndex}.relatedLessonId`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  {t('course:quizAuthoring.editor.relatedLessonLabel')}
                  <FieldHelp contentKey="course:quizAuthoring.editor.help.relatedLesson" />
                </FormLabel>
                <Select
                  value={field.value ? field.value : NO_LESSON}
                  onValueChange={(value) =>
                    field.onChange(value === NO_LESSON ? '' : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_LESSON}>
                      {t('course:quizAuthoring.editor.relatedLessonNone')}
                    </SelectItem>
                    {lessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        {lesson.sectionTitle
                          ? `${lesson.sectionTitle} · ${lesson.title}`
                          : lesson.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {type === 'essay' ? (
          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {t('course:quizAuthoring.editor.essayNote')}
          </p>
        ) : type === 'short_answer' ? (
          <div className="space-y-2">
            <FormLabel className="flex items-center gap-1.5">
              {t('course:quizAuthoring.editor.acceptedAnswersLabel')}
              <FieldHelp contentKey="course:quizAuthoring.editor.help.acceptedAnswers" />
            </FormLabel>
            <FormDescription>
              {t('course:quizAuthoring.editor.acceptedAnswersHelp')}
            </FormDescription>
            <div className="space-y-2">
              {acceptedAnswers.fields.map((answer, answerIndex) => (
                <div key={answer.id} className="flex items-center gap-2">
                  <FormField
                    control={control}
                    name={`questions.${questionIndex}.acceptedAnswers.${answerIndex}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t(
                              'course:quizAuthoring.editor.acceptedAnswerPlaceholder',
                              { number: answerIndex + 1 }
                            )}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {acceptedAnswers.fields.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => acceptedAnswers.remove(answerIndex)}
                      aria-label={t(
                        'course:quizAuthoring.editor.removeAcceptedAnswer'
                      )}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
            {acceptedAnswers.fields.length < MAX_QUIZ_ACCEPTED_ANSWERS ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  acceptedAnswers.append(blankQuizAcceptedAnswer())
                }
              >
                <Plus className="size-4" strokeWidth={2} aria-hidden />
                {t('course:quizAuthoring.editor.addAcceptedAnswer')}
              </Button>
            ) : null}
            <FormField
              control={control}
              name={`questions.${questionIndex}.acceptedAnswers`}
              render={() => <FormMessage />}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <FormLabel>
              {t('course:quizAuthoring.editor.optionsLabel')}
            </FormLabel>

            {type === 'single_choice' || type === 'true_false' ? (
              <RadioGroup
                value={String(
                  options.fields.findIndex((_, i) =>
                    watch(`questions.${questionIndex}.options.${i}.isCorrect`)
                  )
                )}
                onValueChange={(value) =>
                  handleSingleCorrectChange(Number(value))
                }
                className="space-y-2"
              >
                {options.fields.map((option, optionIndex) => (
                  <OptionRow
                    key={option.id}
                    questionIndex={questionIndex}
                    optionIndex={optionIndex}
                    locked={type === 'true_false'}
                    correctControl={
                      <RadioGroupItem
                        value={String(optionIndex)}
                        aria-label={t(
                          'course:quizAuthoring.editor.correctLabel'
                        )}
                      />
                    }
                    onRemove={
                      type !== 'true_false' && options.fields.length > 2
                        ? () => options.remove(optionIndex)
                        : undefined
                    }
                  />
                ))}
              </RadioGroup>
            ) : (
              <div className="space-y-2">
                {options.fields.map((option, optionIndex) => (
                  <FormField
                    key={option.id}
                    control={control}
                    name={`questions.${questionIndex}.options.${optionIndex}.isCorrect`}
                    render={({ field }) => (
                      <OptionRow
                        questionIndex={questionIndex}
                        optionIndex={optionIndex}
                        correctControl={
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) =>
                              field.onChange(!!checked)
                            }
                            aria-label={t(
                              'course:quizAuthoring.editor.correctLabel'
                            )}
                          />
                        }
                        onRemove={
                          options.fields.length > 2
                            ? () => options.remove(optionIndex)
                            : undefined
                        }
                      />
                    )}
                  />
                ))}
              </div>
            )}

            {type !== 'true_false' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => options.append(blankQuizOption())}
              >
                <Plus className="size-4" strokeWidth={2} aria-hidden />
                {t('course:quizAuthoring.editor.addOption')}
              </Button>
            ) : null}

            <FormField
              control={control}
              name={`questions.${questionIndex}.options`}
              render={() => <FormMessage />}
            />
          </div>
        )}

        <FormField
          control={control}
          name={`questions.${questionIndex}.explanation`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                {t('course:quizAuthoring.editor.explanationLabel')}
                <FieldHelp contentKey="course:quizAuthoring.editor.help.explanation" />
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  {...field}
                  value={field.value ?? ''}
                  placeholder={t(
                    'course:quizAuthoring.editor.explanationPlaceholder'
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

interface OptionRowProps {
  readonly questionIndex: number;
  readonly optionIndex: number;
  readonly correctControl: ReactNode;
  readonly locked?: boolean;
  readonly onRemove?: () => void;
}

function OptionRow({
  questionIndex,
  optionIndex,
  correctControl,
  locked,
  onRemove,
}: OptionRowProps): JSX.Element {
  const { t } = useTranslation();
  const { control } = useFormContext<QuizAuthoringFormData>();

  return (
    <div className="flex items-center gap-2">
      {correctControl}
      <FormField
        control={control}
        name={`questions.${questionIndex}.options.${optionIndex}.label`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <Input
                {...field}
                disabled={locked}
                placeholder={t('course:quizAuthoring.editor.optionLabel', {
                  number: optionIndex + 1,
                })}
              />
            </FormControl>
          </FormItem>
        )}
      />
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={t('course:quizAuthoring.editor.removeOption')}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

/* ---------- preview as student ---------- */

/**
 * Read-only rendering of the questions as a learner would first see them:
 * no correct answer highlighted, options in authored order, points shown,
 * every control disabled. Reads the live form values so the author sees
 * exactly what is about to be saved.
 */
export function QuizStudentPreview(): JSX.Element {
  const { t } = useTranslation();
  const { control } = useFormContext<QuizAuthoringFormData>();
  const questions = useWatch({ control, name: 'questions' }) ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-display text-base font-semibold text-foreground">
          {t('course:quizAuthoring.preview.title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('course:quizAuthoring.preview.description')}
        </p>
      </div>

      <ol
        className="space-y-4"
        aria-label={t('course:quizAuthoring.preview.title')}
      >
        {questions.map((question, index) => (
          <li key={index}>
            <PreviewQuestion question={question} number={index + 1} />
          </li>
        ))}
      </ol>
    </div>
  );
}

interface PreviewQuestionProps {
  readonly question: QuizQuestionFormData;
  readonly number: number;
}

function PreviewQuestion({
  question,
  number,
}: PreviewQuestionProps): JSX.Element {
  const { t } = useTranslation();
  const points = Number(question.points);
  const inputName = `preview-question-${number}`;

  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between gap-3 space-y-0">
        <h4 className="font-display text-sm font-semibold text-foreground">
          {t('course:quizAuthoring.editor.questionLabel', { number })}
        </h4>
        <span className="shrink-0 text-xs text-muted-foreground">
          {t('course:quizAuthoring.preview.points', {
            count: Number.isFinite(points) ? points : 0,
          })}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap text-sm text-foreground">
          {question.prompt || (
            <span className="text-muted-foreground">
              {t('course:quizAuthoring.preview.emptyPrompt')}
            </span>
          )}
        </p>

        {question.type === 'essay' ? (
          <Textarea
            rows={4}
            disabled
            aria-label={t('course:quizAuthoring.preview.essayAnswer')}
            placeholder={t('course:quizAuthoring.preview.essayAnswer')}
          />
        ) : question.type === 'short_answer' ? (
          <Input
            disabled
            aria-label={t('course:quizAuthoring.preview.shortAnswer')}
            placeholder={t('course:quizAuthoring.preview.shortAnswer')}
          />
        ) : (
          <ul className="space-y-2">
            {question.options.map((option, optionIndex) => (
              <li key={optionIndex}>
                <label className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-md border border-border px-3 py-2 text-sm text-foreground">
                  <input
                    type={
                      question.type === 'multiple_choice' ? 'checkbox' : 'radio'
                    }
                    name={inputName}
                    disabled
                    className="size-4"
                  />
                  <span>
                    {option.label || (
                      <span className="text-muted-foreground">
                        {t('course:quizAuthoring.editor.optionLabel', {
                          number: optionIndex + 1,
                        })}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {question.type === 'multiple_choice' ? (
          <p className="text-xs text-muted-foreground">
            {t('course:quizAuthoring.preview.selectAllThatApply')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
