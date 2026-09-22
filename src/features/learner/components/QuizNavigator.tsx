/**
 * The question navigator: one chip per question, showing answered /
 * unanswered / flagged with an icon AND text (never colour alone), and
 * `aria-current="step"` on the question in view. Buttons, not anchors:
 * in one-per-page mode there is nothing to scroll to.
 */
import { useTranslation } from 'react-i18next';
import { Check, Flag } from 'lucide-react';
import { cn, formatNumber } from '@utils';
import type { LanguageCode, QuizSessionQuestion } from '@types';
import type { AnswerMap } from '../utils/quiz-attempt.utils';
import { isAnswered } from '../utils/quiz-attempt.utils';

export interface QuizNavigatorProps {
  readonly questions: readonly QuizSessionQuestion[];
  readonly answers: AnswerMap;
  readonly flagged: ReadonlySet<string>;
  readonly currentIndex: number;
  readonly onSelect: (index: number) => void;
}

export function QuizNavigator({
  questions,
  answers,
  flagged,
  currentIndex,
  onSelect,
}: QuizNavigatorProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;

  return (
    <nav
      aria-label={t('learning:quiz.runner.navigatorLabel')}
      className="overflow-x-auto"
    >
      <ol className="flex min-w-max gap-2 pb-1">
        {questions.map((question, index) => {
          const answered = isAnswered(answers[question.id]);
          const isFlagged = flagged.has(question.id);
          const isCurrent = index === currentIndex;
          const stateKey = isFlagged
            ? 'flagged'
            : answered
              ? 'answered'
              : 'unanswered';
          return (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={t('learning:quiz.runner.navigatorItem', {
                  number: formatNumber(index + 1, language),
                  state: t(`learning:quiz.runner.state.${stateKey}`),
                })}
                className={cn(
                  'relative flex size-10 items-center justify-center rounded-md border text-sm tabular-nums transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isCurrent
                    ? 'border-primary bg-primary text-primary-foreground'
                    : answered
                      ? 'border-border bg-accent text-foreground'
                      : 'border-dashed border-border bg-card text-muted-foreground hover:bg-accent'
                )}
              >
                {formatNumber(index + 1, language)}
                {isFlagged ? (
                  <Flag
                    className="absolute -end-1 -top-1 size-3.5 fill-current text-warning"
                    aria-hidden
                  />
                ) : answered && !isCurrent ? (
                  <Check
                    className="absolute -end-1 -top-1 size-3.5 text-success"
                    aria-hidden
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
