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
 * FEEDBACK IS OPTIONAL AND THE UI SAYS SO. The submit button is enabled
 * as soon as a reason is picked. Requiring free text to cancel turns
 * leaving into a hostage negotiation, and the backend column is nullable
 * precisely so this stays true.
 *
 * The two flows differ only in what they explain: cancelling a trial ends
 * access immediately, whereas cancelling a paid subscription keeps access
 * until the end of the period already paid for. That distinction is
 * material to the decision, so it is stated in the dialog rather than
 * discovered afterwards.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { CANCELLATION_REASONS } from '@types';
import type {
  CancellationReason,
  CancelSubscriptionRequestInput,
} from '@types';

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
  readonly onConfirm: (input: CancelSubscriptionRequestInput) => void;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  kind,
  accessEndsOn,
  isSubmitting,
  onConfirm,
}: CancelSubscriptionDialogProps): JSX.Element {
  const { t } = useTranslation();
  const [reason, setReason] = useState<CancellationReason | ''>('');
  const [feedback, setFeedback] = useState('');

  const handleOpenChange = (next: boolean): void => {
    if (!next) {
      // Reset on close so reopening never silently carries a previous,
      // half-finished answer into a new decision.
      setReason('');
      setFeedback('');
    }
    onOpenChange(next);
  };

  const handleConfirm = (): void => {
    if (!reason) return;
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
            </Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as CancellationReason)}
            >
              <SelectTrigger id="cancellation-reason">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellation-feedback">
              {t('tenant:cancellation.feedbackLabel')}
            </Label>
            <Textarea
              id="cancellation-feedback"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder={t('tenant:cancellation.feedbackPlaceholder')}
              maxLength={2000}
              rows={4}
            />
            {/* Stated explicitly, not merely implied by the absence of an
                asterisk — people assume the worst about cancellation forms. */}
            <p className="text-xs text-muted-foreground">
              {t('tenant:cancellation.feedbackOptional')}
            </p>
          </div>
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
            disabled={!reason || isSubmitting}
          >
            {isSubmitting
              ? t('common:actions.saving')
              : t('tenant:cancellation.confirmCancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
