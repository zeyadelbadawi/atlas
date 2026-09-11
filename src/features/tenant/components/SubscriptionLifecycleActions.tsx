/**
 * Start-trial and cancellation controls for the current subscription
 * (Phase 10.2).
 *
 * WHICH CONTROL APPEARS IS DERIVED FROM THE REAL BACKEND STATUS, never
 * from local optimism:
 *
 *   - no trial started yet (`expired`/`cancelled` with no `trialEndsAt`)
 *       -> "Start free trial"
 *   - `trialing`                -> "Cancel free trial"
 *   - a live paid subscription  -> "Cancel subscription"
 *
 * A REFUSED TRIAL IS NOT AN ERROR. The backend answers 200 with
 * `started: false` when the customer has already used their one trial, so
 * this component checks that flag and says something true, rather than
 * showing a success toast for a trial nobody received.
 *
 * The action is deliberately absent — not merely disabled — for anyone
 * without billing permission, because the server refuses them anyway and
 * a disabled button that never becomes enabled is just a confusing dead
 * end. Authorization itself is enforced by the API, not here.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Rocket, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@hooks';
import { CancelSubscriptionDialog } from './CancelSubscriptionDialog';
import {
  useCancelSubscription,
  useCancelTrial,
  useStartTrial,
} from '../hooks/useSubscriptionLifecycle';
import { formatDate } from '@/shared/utils/date.utils';
import type {
  CancelSubscriptionRequestInput,
  LanguageCode,
  TenantSubscription,
} from '@types';

/** Statuses where a paid subscription genuinely exists and can be cancelled. */
const LIVE_PAID_STATUSES = new Set(['active', 'past_due', 'grace_period']);

export interface SubscriptionLifecycleActionsProps {
  readonly subscription: TenantSubscription;
}

export function SubscriptionLifecycleActions({
  subscription,
}: SubscriptionLifecycleActionsProps): JSX.Element | null {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const { toast } = useToast();

  const [cancelKind, setCancelKind] = useState<'trial' | 'paid' | null>(null);

  const startTrial = useStartTrial();
  const cancelTrial = useCancelTrial();
  const cancelSubscription = useCancelSubscription();

  const isTrialing = subscription.status === 'trialing';
  const isPaid = LIVE_PAID_STATUSES.has(subscription.status);
  // Never started a trial and has no paid plan — the one state where the
  // trial is still available to ask for.
  const canStartTrial = !isTrialing && !isPaid && !subscription.trialEndsAt;

  const handleStartTrial = (): void => {
    startTrial.mutate(
      { planId: subscription.plan.id },
      {
        onSuccess: (result) => {
          if (result.started) {
            toast({
              title: t('tenant:trial.started'),
              description: result.trialEndsAt
                ? t('tenant:trial.startedDescription', {
                    date: formatDate(result.trialEndsAt, language, 'short'),
                  })
                : undefined,
            });
            return;
          }
          // Refused. Say why, honestly, instead of a generic failure.
          toast({
            variant: 'destructive',
            title: t('tenant:trial.alreadyUsedTitle'),
            description: t('tenant:trial.alreadyUsedDescription'),
          });
        },
        onError: () => {
          toast({
            variant: 'destructive',
            title: t('tenant:cancellation.failed'),
            description: t('tenant:cancellation.failedDescription'),
          });
        },
      }
    );
  };

  const handleConfirmCancel = (input: CancelSubscriptionRequestInput): void => {
    const kind = cancelKind;
    if (!kind) return;
    const mutation = kind === 'trial' ? cancelTrial : cancelSubscription;

    mutation.mutate(input, {
      onSuccess: (result) => {
        setCancelKind(null);
        toast({
          title:
            kind === 'trial'
              ? t('tenant:cancellation.cancelledTrial')
              : t('tenant:cancellation.cancelledSubscription'),
          description:
            kind === 'paid'
              ? t('tenant:cancellation.cancelledSubscriptionDescription', {
                  date: formatDate(result.effectiveAt, language, 'short'),
                })
              : undefined,
        });
      },
      onError: () => {
        setCancelKind(null);
        toast({
          variant: 'destructive',
          title: t('tenant:cancellation.failed'),
          description: t('tenant:cancellation.failedDescription'),
        });
      },
    });
  };

  if (!canStartTrial && !isTrialing && !isPaid) return null;

  return (
    <div className="pt-2">
      {canStartTrial ? (
        <Button
          type="button"
          onClick={handleStartTrial}
          disabled={startTrial.isPending}
        >
          <Rocket className="me-2 size-4" aria-hidden />
          {startTrial.isPending
            ? t('tenant:trial.starting')
            : t('tenant:trial.startAction')}
        </Button>
      ) : null}

      {isTrialing ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setCancelKind('trial')}
          disabled={cancelTrial.isPending}
        >
          <XCircle className="me-2 size-4" aria-hidden />
          {t('tenant:trial.cancelAction')}
        </Button>
      ) : null}

      {isPaid && !subscription.cancelAtPeriodEnd ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setCancelKind('paid')}
          disabled={cancelSubscription.isPending}
        >
          <XCircle className="me-2 size-4" aria-hidden />
          {t('tenant:subscription.cancelSubscription')}
        </Button>
      ) : null}

      <CancelSubscriptionDialog
        open={cancelKind !== null}
        onOpenChange={(open) => {
          if (!open) setCancelKind(null);
        }}
        kind={cancelKind ?? 'trial'}
        accessEndsOn={
          cancelKind === 'paid' && subscription.currentPeriodEnd
            ? formatDate(subscription.currentPeriodEnd, language, 'short')
            : undefined
        }
        isSubmitting={cancelTrial.isPending || cancelSubscription.isPending}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
