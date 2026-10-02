/**
 * P5 — the reviewer's "worth a look" panel for one quiz attempt.
 *
 * Shows the server's explainable signals (`attempt.signals`): what was
 * observed, with the numbers, the innocent explanations next to it, and a
 * way to see the exact timeline rows behind it. Deliberately no score,
 * colour-coded verdict or "likelihood": the reviewer decides, ideally
 * after talking to the learner.
 */
import { useTranslation } from 'react-i18next';
import { Eye, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isolateNumericExpression } from '@utils';
import type { IntegritySignal } from '@types';
import {
  formatAttemptDuration,
  type DurationPartFormatter,
} from '../utils/attempt-review.utils';

export interface IntegritySignalsCardProps {
  readonly signals: readonly IntegritySignal[];
  /** The rules this attempt ran under (its settings snapshot). */
  readonly policy: {
    readonly mode: 'monitor' | 'warn' | 'strict';
    readonly maxViolations: number;
    readonly requireFullscreen: boolean;
  };
  readonly formatPart: DurationPartFormatter;
  /** The signal whose evidence is highlighted in the timeline, if any. */
  readonly highlighted: IntegritySignal['key'] | null;
  readonly onShowEvidence: (signal: IntegritySignal | null) => void;
}

function SignalItem({
  signal,
  formatPart,
  highlighted,
  onShowEvidence,
}: {
  readonly signal: IntegritySignal;
  readonly formatPart: DurationPartFormatter;
  readonly highlighted: boolean;
  readonly onShowEvidence: (signal: IntegritySignal | null) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const base = `instructor:attemptReview.signals.key.${signal.key}`;
  const clock = (seconds: number | undefined) =>
    seconds === undefined
      ? ''
      : isolateNumericExpression(
          formatAttemptDuration(null, null, seconds, formatPart) ?? ''
        );
  const reasons = (signal.reasons ?? [])
    .map((reason) => t(`${base}.reason.${reason}`, { defaultValue: reason }))
    .join(', ');
  return (
    <li
      className="space-y-1.5 py-3"
      data-testid={`integrity-signal-${signal.key}`}
    >
      <p className="font-medium text-foreground">{t(`${base}.title`)}</p>
      <p className="text-sm text-foreground">
        {t(`${base}.summary`, {
          count: signal.occurrences,
          total: clock(signal.totalSeconds),
          longest: clock(signal.longestSeconds),
          reasons,
        })}
      </p>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium">
          {t('instructor:attemptReview.signals.otherExplanations')}:
        </span>{' '}
        {t(`${base}.innocent`)}
      </p>
      {signal.eventIds.length > 0 ? (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          aria-pressed={highlighted}
          onClick={() => onShowEvidence(highlighted ? null : signal)}
        >
          <Eye className="size-3.5" aria-hidden />
          {highlighted
            ? t('instructor:attemptReview.signals.hideEvidence')
            : t('instructor:attemptReview.signals.showEvidence')}
        </Button>
      ) : null}
    </li>
  );
}

export function IntegritySignalsCard({
  signals,
  policy,
  formatPart,
  highlighted,
  onShowEvidence,
}: IntegritySignalsCardProps): JSX.Element {
  const { t } = useTranslation();
  const behaviour = signals.filter((signal) => signal.category === 'behaviour');
  const review = behaviour.filter((signal) => signal.level === 'review');
  const context = behaviour.filter((signal) => signal.level === 'info');
  // Interruptions and browser limits are never mixed with conduct.
  const technical = signals.filter((signal) => signal.category === 'technical');
  const group = (
    headingKey: string,
    items: readonly IntegritySignal[],
    testId: string
  ) =>
    items.length > 0 ? (
      <section aria-label={t(headingKey)} data-testid={testId}>
        <h3 className="text-sm font-semibold text-foreground">
          {t(headingKey)}
        </h3>
        <ul className="divide-y divide-border">
          {items.map((signal) => (
            <SignalItem
              key={signal.key}
              signal={signal}
              formatPart={formatPart}
              highlighted={highlighted === signal.key}
              onShowEvidence={onShowEvidence}
            />
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <Card data-testid="integrity-signals">
      <CardHeader>
        <CardTitle>{t('instructor:attemptReview.signals.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-foreground" data-testid="integrity-policy">
          {t(`instructor:attemptReview.signals.policy.${policy.mode}`, {
            count: policy.maxViolations,
          })}{' '}
          {policy.requireFullscreen
            ? t('instructor:attemptReview.signals.policy.fullscreenRequired')
            : t(
                'instructor:attemptReview.signals.policy.fullscreenNotRequired'
              )}
        </p>
        <p className="flex gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('instructor:attemptReview.signals.description')}
        </p>
        {signals.length === 0 ? (
          <p className="text-sm text-foreground">
            {t('instructor:attemptReview.signals.none')}
          </p>
        ) : (
          <>
            {group(
              'instructor:attemptReview.signals.reviewHeading',
              review,
              'integrity-signals-review'
            )}
            {group(
              'instructor:attemptReview.signals.technicalHeading',
              technical,
              'integrity-signals-technical'
            )}
            {group(
              'instructor:attemptReview.signals.contextHeading',
              context,
              'integrity-signals-context'
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
