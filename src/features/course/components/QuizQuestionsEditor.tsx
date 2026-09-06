/**
 * Quiz Questions Editor (Phase 4).
 *
 * The question/option editor at the heart of quiz authoring — a dynamic
 * list of questions, each with a type (single_choice/multiple_choice/
 * true_false, matching `quiz-scoring.util.ts`, backend) and its own
 * dynamic option list with a correct-answer selector. Reads/writes the
 * `questions` field of the enclosing `QuizAuthoringFormData` form via
 * `useFormContext` — no props are drilled down from `CourseQuizEditorPage`.
 */
import type { ReactNode } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  blankQuizOption,
  blankQuizQuestion,
  type QuizAuthoringFormData,
} from '@features/learning';
import type { QuizQuestionType } from '@types';

export function QuizQuestionsEditor(): JSX.Element {
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
  /** Undefined when this is the last remaining question — a quiz always needs at least one. */
  readonly onRemove?: () => void;
}

function QuestionCard({ questionIndex, onRemove }: QuestionCardProps): JSX.Element {
  const { t } = useTranslation();
  const { control, watch, setValue } = useFormContext<QuizAuthoringFormData>();

  const options = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
  });

  const type = watch(`questions.${questionIndex}.type`);

  /** Switching type re-shapes the option list to match what that type needs, clearing any prior correct-answer selection that no longer makes sense. */
  const handleTypeChange = (nextType: QuizQuestionType) => {
    const previousType = watch(`questions.${questionIndex}.type`);
    setValue(`questions.${questionIndex}.type`, nextType, { shouldDirty: true });

    if (nextType === 'true_false') {
      setValue(
        `questions.${questionIndex}.options`,
        [
          { label: t('course:quizAuthoring.editor.trueLabel'), isCorrect: false },
          { label: t('course:quizAuthoring.editor.falseLabel'), isCorrect: false },
        ],
        { shouldDirty: true }
      );
      return;
    }

    if (previousType === 'true_false') {
      // The locked True/False labels aren't meaningful option text for
      // single/multiple choice — start fresh instead of keeping them.
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
      const firstCorrectIndex = currentOptions.findIndex((option) => option.isCorrect);
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
              <FormLabel>{t('course:quizAuthoring.editor.promptLabel')}</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`questions.${questionIndex}.type`}
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel>{t('course:quizAuthoring.editor.typeLabel')}</FormLabel>
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
                  <SelectItem value="single_choice">
                    {t('course:quizAuthoring.editor.type.single_choice')}
                  </SelectItem>
                  <SelectItem value="multiple_choice">
                    {t('course:quizAuthoring.editor.type.multiple_choice')}
                  </SelectItem>
                  <SelectItem value="true_false">
                    {t('course:quizAuthoring.editor.type.true_false')}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>{t('course:quizAuthoring.editor.optionsLabel')}</FormLabel>

          {type === 'single_choice' || type === 'true_false' ? (
            <RadioGroup
              value={String(options.fields.findIndex((_, i) => watch(`questions.${questionIndex}.options.${i}.isCorrect`)))}
              onValueChange={(value) => handleSingleCorrectChange(Number(value))}
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
                      aria-label={t('course:quizAuthoring.editor.correctLabel')}
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
                          onCheckedChange={(checked) => field.onChange(!!checked)}
                          aria-label={t('course:quizAuthoring.editor.correctLabel')}
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
