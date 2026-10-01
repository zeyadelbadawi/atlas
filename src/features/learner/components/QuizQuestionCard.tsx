/**
 * One question and its answer control. Native radios, checkboxes and
 * textareas behind the shadcn primitives, each option a full-width
 * labelled row (the whole row is the target), and a Flag toggle so the
 * learner can mark a question to come back to — a state that lives only
 * in this session and is never sent anywhere.
 */
import { useTranslation } from 'react-i18next';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatNumber } from '@utils';
import type { LanguageCode, QuizAnswer, QuizSessionQuestion } from '@types';

/** Mirrors the server's essay cap (`MAX_ESSAY_LENGTH`). */
export const MAX_ESSAY_LENGTH = 20_000;

export interface QuizQuestionCardProps {
  readonly question: QuizSessionQuestion;
  readonly index: number;
  readonly total: number;
  readonly answer: QuizAnswer | undefined;
  readonly flagged: boolean;
  readonly disabled?: boolean;
  readonly onChange: (answer: QuizAnswer) => void;
  readonly onToggleFlag: () => void;
}

export function QuizQuestionCard({
  question,
  index,
  total,
  answer,
  flagged,
  disabled,
  onChange,
  onToggleFlag,
}: QuizQuestionCardProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const selected = answer?.selectedOptionIds ?? [];
  const headingId = `quiz-question-${question.id}-heading`;

  let control: JSX.Element;
  if (question.type === 'multiple_choice') {
    control = (
      <div role="group" aria-labelledby={headingId} className="space-y-2">
        {question.options.map((option) => {
          const inputId = `${question.id}-${option.id}`;
          const checked = selected.includes(option.id);
          return (
            <Label
              key={option.id}
              htmlFor={inputId}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm font-normal text-foreground',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                checked && 'border-primary bg-accent'
              )}
            >
              <Checkbox
                id={inputId}
                checked={checked}
                disabled={disabled}
                onCheckedChange={(next) =>
                  onChange({
                    questionId: question.id,
                    selectedOptionIds: next
                      ? [...selected, option.id]
                      : selected.filter((id) => id !== option.id),
                  })
                }
              />
              <span dir="auto">{option.label}</span>
            </Label>
          );
        })}
      </div>
    );
  } else if (
    question.type === 'single_choice' ||
    question.type === 'true_false'
  ) {
    control = (
      <RadioGroup
        aria-labelledby={headingId}
        value={selected[0] ?? ''}
        disabled={disabled}
        onValueChange={(value) =>
          onChange({ questionId: question.id, selectedOptionIds: [value] })
        }
        className="space-y-2"
      >
        {question.options.map((option) => {
          const inputId = `${question.id}-${option.id}`;
          const checked = selected[0] === option.id;
          return (
            <Label
              key={option.id}
              htmlFor={inputId}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm font-normal text-foreground',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                checked && 'border-primary bg-accent'
              )}
            >
              <RadioGroupItem value={option.id} id={inputId} />
              <span dir="auto">{option.label}</span>
            </Label>
          );
        })}
      </RadioGroup>
    );
  } else if (question.type === 'short_answer') {
    const inputId = `${question.id}-text`;
    control = (
      <div className="space-y-1.5">
        <Label htmlFor={inputId} className="sr-only">
          {t('learning:quiz.runner.shortAnswerLabel')}
        </Label>
        <Input
          id={inputId}
          value={answer?.text ?? ''}
          disabled={disabled}
          maxLength={200}
          autoComplete="off"
          placeholder={t('learning:quiz.runner.shortAnswerPlaceholder')}
          onChange={(event) =>
            onChange({ questionId: question.id, text: event.target.value })
          }
        />
        <p className="text-xs text-muted-foreground">
          {t('learning:quiz.runner.shortAnswerHint')}
        </p>
      </div>
    );
  } else {
    const inputId = `${question.id}-essay`;
    const length = answer?.text?.length ?? 0;
    control = (
      <div className="space-y-1.5">
        <Label htmlFor={inputId} className="sr-only">
          {t('learning:quiz.runner.essayLabel')}
        </Label>
        <Textarea
          id={inputId}
          rows={8}
          value={answer?.text ?? ''}
          disabled={disabled}
          maxLength={MAX_ESSAY_LENGTH}
          placeholder={t('learning:quiz.runner.essayPlaceholder')}
          onChange={(event) =>
            onChange({ questionId: question.id, text: event.target.value })
          }
        />
        <p className="flex justify-between text-xs text-muted-foreground">
          <span>{t('learning:quiz.runner.essayHint')}</span>
          <span className="tabular-nums">
            {formatNumber(length, language)} /{' '}
            {formatNumber(MAX_ESSAY_LENGTH, language)}
          </span>
        </p>
      </div>
    );
  }

  return (
    <section
      aria-labelledby={headingId}
      className="scroll-mt-16 rounded-lg border border-border bg-card p-5"
      data-testid={`quiz-question-${index + 1}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {t('learning:quiz.questionOf', {
              current: formatNumber(index + 1, language),
              total: formatNumber(total, language),
            })}
            {' · '}
            {t('learning:quiz.runner.points', { count: question.points })}
          </p>
          {/* Author content can be in either language whatever the
              interface's: `auto` lets the browser order it by its own text
              (an English question in the Arabic UI read "?Which planet…"). */}
          <h3
            id={headingId}
            dir="auto"
            className="mt-1 whitespace-pre-line text-base font-medium text-foreground"
          >
            {question.prompt}
          </h3>
        </div>
        <Button
          type="button"
          variant={flagged ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onToggleFlag}
          aria-pressed={flagged}
          className="shrink-0"
        >
          <Flag
            className={cn('size-4', flagged && 'fill-current')}
            aria-hidden
          />
          {flagged
            ? t('learning:quiz.runner.unflag')
            : t('learning:quiz.runner.flag')}
        </Button>
      </div>

      <div className="mt-4">{control}</div>
    </section>
  );
}
