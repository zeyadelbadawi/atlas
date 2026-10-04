/**
 * Wizard step 7 — Review (W6): the server's publish-readiness verdict,
 * grouped as Required (blocking), Recommended (warnings) and Good to know
 * (info), with the passed checks listed last. Every open item links to the
 * step that fixes it. Read-only — nothing is saved here.
 */
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { cn, MIRROR_IN_RTL } from '@utils';
import type { CourseReadinessCheck } from '@types';
import { WizardStepFooter } from './WizardStepFooter';
import type { WizardStepProps } from './wizard-step.types';

export function ReviewStep({
  readiness,
  readinessLoading,
  readinessError,
  onRetryReadiness,
  onBack,
  onNext,
  goToStep,
}: WizardStepProps): JSX.Element {
  const { t } = useTranslation();

  if (readinessLoading && !readiness) {
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (readinessError || !readiness) {
    return (
      <div className="space-y-6">
        <ErrorState onRetry={onRetryReadiness} />
        <WizardStepFooter onBack={onBack} hideNext />
      </div>
    );
  }

  const failing = (severity: CourseReadinessCheck['severity']) =>
    readiness.checks.filter(
      (check) => check.severity === severity && check.status === 'fail'
    );
  const blocking = failing('blocking');
  const warnings = failing('warning');
  const info = failing('info');
  const passed = readiness.checks.filter((check) => check.status === 'pass');

  const renderCheck = (
    check: CourseReadinessCheck,
    Icon: LucideIcon,
    tone: string
  ) => (
    <li
      key={check.key}
      data-check={check.key}
      data-status={check.status}
      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
    >
      <p className="flex items-start gap-2 text-sm text-foreground">
        <Icon
          className={cn('mt-0.5 size-4 shrink-0', tone)}
          strokeWidth={2}
          aria-hidden
        />
        <span>
          {t(`course:wizard.review.checks.${check.key}.${check.status}`, {
            count: Number(check.details?.[check.key] ?? 0),
          })}
        </span>
      </p>
      {check.status === 'fail' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 self-start"
          onClick={() => goToStep(check.step)}
        >
          {t('course:wizard.review.fix', {
            step: t(`course:wizard.steps.${check.step}.label`),
          })}
          <ArrowRight className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
        </Button>
      ) : null}
    </li>
  );

  const group = (
    titleKey: string,
    checks: readonly CourseReadinessCheck[],
    Icon: LucideIcon,
    tone: string
  ) =>
    checks.length > 0 ? (
      <section className="space-y-1">
        <h3 className="font-display text-sm font-semibold text-foreground">
          {t(titleKey)}
        </h3>
        <ul className="divide-y divide-border">
          {checks.map((check) => renderCheck(check, Icon, tone))}
        </ul>
      </section>
    ) : null;

  return (
    <div className="space-y-6">
      <div
        role="status"
        className={cn(
          'flex items-start gap-3 rounded-lg border p-4',
          readiness.ready
            ? 'border-success/50 bg-success-surface'
            : 'border-warning/50 bg-warning-surface'
        )}
        data-testid="wizard-readiness-summary"
        data-ready={readiness.ready}
      >
        {readiness.ready ? (
          <CheckCircle2
            className="mt-0.5 size-5 shrink-0 text-success"
            aria-hidden
          />
        ) : (
          <AlertTriangle
            className="mt-0.5 size-5 shrink-0 text-warning"
            aria-hidden
          />
        )}
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            {readiness.ready
              ? t('course:wizard.review.ready')
              : t('course:wizard.review.notReady')}
          </p>
          <p className="text-sm text-muted-foreground">
            {readiness.ready
              ? t('course:wizard.review.readyDescription')
              : t('course:wizard.review.notReadyDescription')}
          </p>
        </div>
      </div>

      {group(
        'course:wizard.review.blockingTitle',
        blocking,
        XCircle,
        'text-destructive'
      )}
      {group(
        'course:wizard.review.warningsTitle',
        warnings,
        AlertTriangle,
        'text-warning'
      )}
      {group('course:wizard.review.infoTitle', info, Info, 'text-info')}
      {group(
        'course:wizard.review.passedTitle',
        passed,
        CheckCircle2,
        'text-success'
      )}

      <WizardStepFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel={t('course:wizard.continue')}
      />
    </div>
  );
}
