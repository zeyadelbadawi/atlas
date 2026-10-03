/**
 * The Back / Next row every wizard step ends with (W6).
 *
 * Next is either the step form's submit button (validate, save, then move
 * on) or a plain button for steps that save per action (Curriculum,
 * Assessments) or only read (Review). Back never saves — the page asks
 * before discarding unsaved edits. On a phone the two stack, primary on top.
 */
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, MIRROR_IN_RTL } from '@utils';

export interface WizardStepFooterProps {
  readonly onBack?: () => void;
  /** Overrides "Back" (e.g. "Cancel" before the course exists). */
  readonly backLabel?: string;
  /** `submit` = the enclosing form's submit; `button` = calls `onNext`. */
  readonly nextType?: 'submit' | 'button';
  readonly onNext?: () => void;
  readonly nextLabel?: string;
  readonly pending?: boolean;
  readonly nextDisabled?: boolean;
  /** Hide Next entirely (the last step renders its own primary action). */
  readonly hideNext?: boolean;
}

export function WizardStepFooter({
  onBack,
  backLabel,
  nextType = 'button',
  onNext,
  nextLabel,
  pending = false,
  nextDisabled = false,
  hideNext = false,
}: WizardStepFooterProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
      {onBack ? (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={pending}
        >
          {backLabel ? null : (
            <ArrowLeft className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
          )}
          {backLabel ?? t('course:wizard.back')}
        </Button>
      ) : (
        <span aria-hidden className="hidden sm:block" />
      )}
      {hideNext ? null : (
        <Button
          type={nextType}
          onClick={nextType === 'button' ? onNext : undefined}
          disabled={pending || nextDisabled}
        >
          {pending ? (
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          ) : null}
          {pending
            ? t('course:wizard.saving')
            : (nextLabel ?? t('course:wizard.next'))}
          {pending ? null : (
            <ArrowRight className={cn('size-4', MIRROR_IN_RTL)} aria-hidden />
          )}
        </Button>
      )}
    </div>
  );
}
