/**
 * The explicit confirmation before a Free Trial is redeemed.
 *
 * WHY A CONFIRMATION AT ALL. The trial is once per account, for life.
 * Spending it must be a decision the customer actually made — not the
 * result of a mis-tapped card on a phone, a double submit, or a prefetch.
 * The backend enforces the same idea from its side by requiring
 * `confirm: true` in the request body.
 *
 * WHAT IT MUST SAY, AND WHY EACH LINE IS THERE. The product rule is that
 * a trial needs no card and does NOT roll into a paid subscription, so
 * this screen states both plainly. Leaving either implicit is how a
 * customer ends up believing they have been signed up for something —
 * and the version of that mistake that damages trust is the silent one.
 *
 * It deliberately stops short of a billing document. Four facts — which
 * plan, how long, what happens at the end, and that no card is needed —
 * are what the decision actually requires.
 */
import { useTranslation } from 'react-i18next';
import { CalendarClock, CreditCard, Rocket, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDate } from '@utils';
import type { LanguageCode, Plan } from '@types';

export interface StartTrialDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** The plan being trialed. The trial is tied to exactly this plan. */
  readonly plan: Plan | null;
  readonly isSubmitting: boolean;
  readonly onConfirm: () => void;
}

export function StartTrialDialog({
  open,
  onOpenChange,
  plan,
  isSubmitting,
  onConfirm,
}: StartTrialDialogProps): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;

  if (!plan) return null;

  const days = plan.trialDurationDays;

  // Computed for display only. The authoritative end date is set by the
  // server when the trial is actually created, and is what every later
  // screen shows — this is a preview of the decision, not a promise the
  // client is making on the server's behalf.
  const endsAt =
    days === undefined
      ? undefined
      : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const facts: readonly { readonly icon: LucideIcon; readonly text: string }[] = [
    {
      icon: CalendarClock,
      text:
        endsAt !== undefined
          ? t('tenant:startTrial.factDates', {
              date: formatDate(endsAt, language, 'short'),
            })
          : t('tenant:startTrial.factDatesUnknown'),
    },
    { icon: CreditCard, text: t('tenant:startTrial.factNoCard') },
    { icon: ShieldCheck, text: t('tenant:startTrial.factNoAutoCharge') },
    { icon: Rocket, text: t('tenant:startTrial.factEntitlements', { plan: plan.name }) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('tenant:startTrial.title', { plan: plan.name })}
          </DialogTitle>
          <DialogDescription>
            {days === undefined
              ? t('tenant:startTrial.subtitleNoDays', { plan: plan.name })
              : t('tenant:startTrial.subtitle', { plan: plan.name, count: days })}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3">
          {facts.map((fact) => (
            <li key={fact.text} className="flex items-start gap-3 text-sm">
              <fact.icon
                className="mt-0.5 size-4 shrink-0 text-primary"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="text-muted-foreground">{fact.text}</span>
            </li>
          ))}
        </ul>

        {/* Said once, quietly, and never repeated elsewhere: this is the
            account's only trial. It is a fact the customer needs before
            deciding, not a warning to nag them with afterwards. */}
        <p className="text-xs text-muted-foreground">
          {t('tenant:startTrial.onePerAccount')}
        </p>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting
              ? t('tenant:trial.starting')
              : t('tenant:startTrial.confirm', { plan: plan.name })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
