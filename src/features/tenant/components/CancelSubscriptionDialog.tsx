/**
 * Cancellation dialog, shared by the trial and paid-subscription flows.
 *
 * DESIGN POSITION. This asks why someone is leaving, and then lets them
 * leave. It does not use the moment to bargain: there is no fake
 * discount, no invented credit, no "are you SURE?" second dialog, and no
 * retention offer, because Atlas has no real retention mechanism behind
 * any of those and inventing one would be a lie told at the worst
 * possible moment.
 *
 * FEEDBACK IS OPTIONAL AND THE UI SAYS SO. Only the reason is required
 * (marked, and asked for when missing — the button is never greyed
 * without saying why). The backend column is nullable precisely so
 * leaving never needs free text.
 *
 * B5 (UX audit) — a failed cancel keeps the dialog open with the reason
 * and feedback still there, and says why inline (the hooks mark their
 * errors inline, so nothing is toasted). While the request runs the dialog
 * can't be dismissed; closing it with typed feedback asks first.
 *
 * The two flows differ only in what they explain: cancelling a trial ends
 * access immediately, whereas cancelling a paid subscription keeps access
 * until the end of the period already paid for.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequiredMark, SaveFailedAlert } from '@forms';
import { useDirtyGuard } from '@features/unsaved-changes';
import { CANCELLATION_REASONS } from '@types';
import type { ApiError } from '@api';
import type {
  CancellationReason,
  CancelSubscriptionRequestInput,
} from '@types';

/** Backend `CancelSubscriptionDto.feedback`: `@MaxLength(2000)`. */
export const CANCELLATION_FEEDBACK_MAX_LENGTH = 2000;

export interface CancelSubscriptionDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Which flow this is — changes the copy, not the mechanics. */
  readonly kind: 'trial' | 'paid';
  /**
   * For the paid flow: when access actually ends. Rendered so the user
   * knows they are not forfeiting time they have already paid for.
   */
  readonly accessEndsOn?: string;
  readonly isSubmitting: boolean;
  /** The last failed attempt, shown inside the dialog. */
  readonly error?: ApiError | null;
  readonly onConfirm: (input: CancelSubscriptionRequestInput) => void;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  kind,
  accessEndsOn,
  isSubmitting,
  error,
  onConfirm,
}: CancelSubscriptionDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [reason, setReason] = useState<CancellationReason | ''>('');
  const [feedback, setFeedback] = useState('');
  const [showReasonError, setShowReasonError] = useState(false);
  const [showFeedbackError, setShowFeedbackError] = useState(false);
  const [reasonEditedAfter, setReasonEditedAfter] = useState<ApiError | null>(
    null
  );
  const [feedbackEditedAfter, setFeedbackEditedAfter] =
    useState<ApiError | null>(null);
  const dirtyGuard = useDirtyGuard(open && feedback.trim() !== '');

  // Reopening never silently carries a previous, half-finished answer
  // into a new decision.
  useEffect(() => {
    if (!open) {
      setReason('');
      setFeedback('');
      setShowReasonError(false);
      setShowFeedbackError(false);
    }
  }, [open]);

  const feedbackLength = feedback.trim().length;
  const feedbackTooLong = feedbackLength > CANCELLATION_FEEDBACK_MAX_LENGTH;
  const violatesOn = (field: string): boolean =>
    Boolean(error?.violations?.some((violation) => violation.field === field));
  // The refusal a field was edited after no longer marks that field: the
  // person has acted on it. The general alert still keys off the refusal.
  const serverFeedback =
    error !== feedbackEditedAfter && violatesOn('feedback');
  const serverReason = error !== reasonEditedAfter && violatesOn('reason');
  const reasonInvalid = (showReasonError && !reason) || serverReason;
  const feedbackInvalid =
    (showFeedbackError && feedbackTooLong) || serverFeedback;
  const fieldError = violatesOn('feedback') || violatesOn('reason');

  const handleOpenChange = (next: boolean): void => {
    if (next) return onOpenChange(true);
    // While the request runs the dialog stays: its outcome shows here.
    if (isSubmitting) return;
    void dirtyGuard.requestClose(() => onOpenChange(false));
  };

  const handleConfirm = (): void => {
    if (!reason) setShowReasonError(true);
    if (feedbackTooLong) setShowFeedbackError(true);
    if (!reason || feedbackTooLong) return;
    onConfirm({ reason, feedback: feedback.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {kind === 'trial'
              ? t('tenant:cancellation.trialTitle')
              : t('tenant:cancellation.subscriptionTitle')}
          </DialogTitle>
          <DialogDescription>
            {kind === 'trial'
              ? t('tenant:cancellation.trialDescription')
              : accessEndsOn
                ? t('tenant:cancellation.subscriptionDescriptionWithDate', {
                    date: accessEndsOn,
                  })
                : t('tenant:cancellation.subscriptionDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancellation-reason">
              {t('tenant:cancellation.reasonLabel')}
              <RequiredMark />
            </Label>
            <Select
              value={reason}
              onValueChange={(value) => {
                setReason(value as CancellationReason);
                setShowReasonError(false);
                setReasonEditedAfter(error ?? null);
              }}
            >
              <SelectTrigger
                id="cancellation-reason"
                aria-invalid={reasonInvalid || undefined}
                aria-describedby={
                  reasonInvalid ? 'cancellation-reason-error' : undefined
                }
                data-testid="cancellation-reason"
              >
                <SelectValue
                  placeholder={t('tenant:cancellation.reasonPlaceholder')}
                />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`tenant:cancellation.reasons.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reasonInvalid ? (
              <p
                id="cancellation-reason-error"
                role="alert"
                className="text-sm text-destructive"
                data-testid="cancellation-reason-error"
              >
                {t('tenant:cancellation.reasonRequired')}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellation-feedback">
              {t('tenant:cancellation.feedbackLabel')}
            </Label>
            <Textarea
              id="cancellation-feedback"
              dir="auto"
              value={feedback}
              onChange={(event) => {
                setFeedback(event.target.value);
                setShowFeedbackError(false);
                setFeedbackEditedAfter(error ?? null);
              }}
              placeholder={t('tenant:cancellation.feedbackPlaceholder')}
              rows={4}
              aria-invalid={feedbackInvalid || undefined}
              aria-describedby="cancellation-feedback-hint cancellation-feedback-count cancellation-feedback-error"
              data-testid="cancellation-feedback"
            />
            {/* Stated explicitly, not merely implied by the absence of an
                asterisk — people assume the worst about cancellation forms. */}
            <p
              id="cancellation-feedback-hint"
              className="text-xs text-muted-foreground"
            >
              {t('tenant:cancellation.feedbackOptional')}
            </p>
            <p
              id="cancellation-feedback-count"
              className={
                feedbackTooLong
                  ? 'text-xs font-medium tabular-nums text-destructive'
                  : 'text-xs tabular-nums text-muted-foreground'
              }
              data-testid="cancellation-feedback-count"
            >
              {t('common:form.characterCount', {
                count: feedbackLength,
                max: CANCELLATION_FEEDBACK_MAX_LENGTH,
              })}
            </p>
            {feedbackInvalid ? (
              <p
                id="cancellation-feedback-error"
                role="alert"
                className="text-sm text-destructive"
                data-testid="cancellation-feedback-error"
              >
                {t('validation:maxLength', {
                  field: t('tenant:cancellation.feedbackField'),
                  count: CANCELLATION_FEEDBACK_MAX_LENGTH,
                })}
              </p>
            ) : null}
          </div>

          {error && !fieldError ? (
            <SaveFailedAlert
              error={error}
              titleKey="tenant:cancellation.failedInline"
            />
          ) : null}
        </div>

        <DialogFooter>
          {/* Backing out is a first-class option, not a hidden X. */}
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('tenant:cancellation.keepIt')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting}
            data-testid="cancellation-confirm"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {isSubmitting
              ? t('common:actions.saving')
              : t('tenant:cancellation.confirmCancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
