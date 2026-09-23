/**
 * The screen before Start / Resume (P64 Phase 3 §E.2).
 *
 * Everything the learner needs in order to decide, as a fact list: the
 * time limit, attempts used and left, when the quiz opens, closes or is
 * due, the passing score, and — when the author turned integrity on —
 * exactly what is RECORDED, in plain words, with an acknowledgement the
 * learner ticks before the button enables. A time-boxed interface is
 * only fair when the box is disclosed first (`accessibility.md ›
 * Cognitive`), and an integrity layer is only honest when it says what
 * it does and does not do.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, PlayCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDateFormatter } from '@hooks';
import { formatNumber } from '@utils';
import type { LanguageCode, Quiz, QuizAttempt } from '@types';
import { formatDuration } from './PlayerShell';

export interface QuizIntroCardProps {
  readonly quiz: Quiz;
  readonly attempts: readonly QuizAttempt[];
  /** True when an open attempt exists: the button reads Resume. */
  readonly resuming: boolean;
  readonly canStart: boolean;
  /** Why Start is unavailable, already translated. */
  readonly blockedReason?: string;
  readonly onStart: () => void;
  readonly isStarting: boolean;
  readonly errorMessage?: string;
}

export function QuizIntroCard({
  quiz,
  attempts,
  resuming,
  canStart,
  blockedReason,
  onStart,
  isStarting,
  errorMessage,
}: QuizIntroCardProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const language = i18n.language as LanguageCode;
  const { settings } = quiz;

  const integrityOn = settings.integrityMode !== 'off';
  const [acknowledged, setAcknowledged] = useState(!integrityOn);

  const finishedAttempts = attempts.filter(
    (attempt) =>
      attempt.status !== 'in_progress' && attempt.status !== 'not_started'
  ).length;
  // Effective allowance = the server's override-aware `attemptsAllowed`
  // (single source of truth, extra-attempt override included). Fall back to
  // `maxAttempts` only when talking to an older server that omits it.
  // `null` means unlimited; `undefined` means "unknown / unlimited".
  const effectiveAllowance =
    quiz.attemptsAllowed !== undefined ? quiz.attemptsAllowed : (quiz.maxAttempts ?? null);
  const attemptsLeft =
    effectiveAllowance === null
      ? null
      : Math.max(0, effectiveAllowance - finishedAttempts);

  const timeLimit = formatDuration(settings.timeLimitSeconds, language);

  const facts: { key: string; value: string }[] = [];
  facts.push({
    key: 'learning:quiz.intro.questions',
    value: formatNumber(quiz.questionCount, language),
  });
  facts.push({
    key: 'learning:quiz.intro.timeLimit',
    value: timeLimit ?? t('learning:quiz.intro.noTimeLimit'),
  });
  facts.push({
    key: 'learning:quiz.intro.attempts',
    value:
      effectiveAllowance === null
        ? t('learning:quiz.intro.unlimitedAttempts', {
            used: formatNumber(finishedAttempts, language),
          })
        : t('learning:quiz.intro.attemptsOf', {
            used: formatNumber(finishedAttempts, language),
            total: formatNumber(effectiveAllowance, language),
          }),
  });
  if (typeof quiz.passingScore === 'number') {
    facts.push({
      key: 'learning:quiz.intro.passingScore',
      value: t('learning:quiz.intro.percent', {
        value: formatNumber(quiz.passingScore, language),
      }),
    });
  }
  if (settings.availableFrom) {
    facts.push({
      key: 'learning:quiz.intro.opens',
      value: fmt.dateTime(settings.availableFrom),
    });
  }
  if (settings.dueAt) {
    facts.push({
      key: 'learning:quiz.intro.due',
      value: fmt.dateTime(settings.dueAt),
    });
  }
  if (settings.availableUntil) {
    facts.push({
      key: 'learning:quiz.intro.closes',
      value: fmt.dateTime(settings.availableUntil),
    });
  }
  facts.push({
    key: 'learning:quiz.intro.gradingPolicy',
    value: t(`learning:quiz.intro.gradingPolicies.${settings.gradingPolicy}`),
  });

  const startDisabled = !canStart || isStarting || !acknowledged;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="font-display text-base font-semibold text-foreground">
          {t('learning:quiz.instructionsTitle')}
        </h2>
        <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
          {quiz.description || t('learning:quiz.instructionsDefault')}
        </p>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.key}>
              <dt className="text-xs text-muted-foreground">{t(fact.key)}</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>

        {settings.timeLimitSeconds ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t('learning:quiz.intro.timerNote')}
          </p>
        ) : null}
      </div>

      {integrityOn ? (
        <Alert>
          <ShieldCheck className="size-4" aria-hidden />
          <AlertTitle>
            {t('learning:quiz.integrity.disclosureTitle')}
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{t('learning:quiz.integrity.disclosureRecorded')}</p>
            {settings.integrityMode === 'warn' ||
            settings.integrityMode === 'strict' ? (
              <p>
                {settings.integrityMode === 'strict'
                  ? t('learning:quiz.integrity.disclosureStrict', {
                      count: settings.maxViolations,
                    })
                  : t('learning:quiz.integrity.disclosureWarn', {
                      count: settings.maxViolations,
                    })}
              </p>
            ) : (
              <p>{t('learning:quiz.integrity.disclosureMonitor')}</p>
            )}
            {settings.requireFullscreen ? (
              <p>{t('learning:quiz.integrity.disclosureFullscreen')}</p>
            ) : null}
            <p className="text-muted-foreground">
              {t('learning:quiz.integrity.disclosureHonest')}
            </p>
            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="quiz-integrity-ack"
                checked={acknowledged}
                onCheckedChange={(next) => setAcknowledged(next === true)}
              />
              <Label htmlFor="quiz-integrity-ack" className="text-sm leading-5">
                {t('learning:quiz.integrity.acknowledge')}
              </Label>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {blockedReason ? (
        <p role="status" className="text-sm text-muted-foreground">
          {blockedReason}
        </p>
      ) : null}

      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onStart}
          disabled={startDisabled}
          data-testid="quiz-start"
        >
          {isStarting ? (
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          ) : (
            <PlayCircle className="size-4" aria-hidden />
          )}
          {resuming
            ? t('learning:quiz.resumeAction')
            : t('learning:quiz.startAction')}
        </Button>
        {attemptsLeft !== null && !resuming ? (
          <span className="text-sm text-muted-foreground">
            {t('learning:quiz.intro.attemptsLeft', {
              count: attemptsLeft,
            })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
