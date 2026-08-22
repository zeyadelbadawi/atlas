/**
 * Plan Comparison Dialog.
 *
 * Read-only comparison of every catalog Plan's limits and features. Reused
 * from the Subscription, Usage and Add-ons pages whenever the user needs to
 * see "what would change" after reaching a limit or missing a feature.
 *
 * Deliberately has no "Upgrade" submit action — Prompt 6 has no payment
 * provider, so this dialog never claims a plan change happened. The footer
 * says so explicitly (see `tenant:planComparison.footerNote`).
 */
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@components/data-display';
import { cn } from '@utils';
import {
  PLAN_FEATURE_KEYS,
  PLAN_LIMIT_KEYS,
  STORAGE_LIMIT_KEYS,
} from '../constants/tenant.constants';
import { formatLimitValue } from '../utils/entitlement.utils';
import type { Plan } from '@types';

export interface PlanComparisonDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly plans: readonly Plan[] | undefined;
  readonly isLoading?: boolean;
  /** The Tenant's current plan key, so it can be marked in the comparison. */
  readonly currentPlanKey?: string;
}

export function PlanComparisonDialog({
  open,
  onOpenChange,
  plans,
  isLoading = false,
  currentPlanKey,
}: PlanComparisonDialogProps): JSX.Element {
  const { t } = useTranslation();
  const unlimitedLabel = t('tenant:common.unlimited');
  const sortedPlans = plans
    ? [...plans].sort((a, b) => a.displayOrder - b.displayOrder)
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('tenant:planComparison.title')}</DialogTitle>
          <DialogDescription>
            {t('tenant:planComparison.description')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 pe-2 sm:grid-cols-2 lg:grid-cols-3">
              {sortedPlans?.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    'flex flex-col gap-4 rounded-lg border p-4',
                    plan.key === currentPlanKey
                      ? 'border-primary bg-accent/40'
                      : 'border-border'
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-display text-base font-semibold text-foreground">
                        {plan.name}
                      </h4>
                      {plan.key === currentPlanKey ? (
                        <StatusBadge
                          labelKey="tenant:planComparison.currentPlanBadge"
                          tone="info"
                        />
                      ) : null}
                    </div>
                    {plan.description ? (
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1.5 text-sm">
                    {PLAN_LIMIT_KEYS.map((limitKey) => (
                      <div
                        key={limitKey}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-muted-foreground">
                          {t(`tenant:common.limits.${limitKey}`)}
                        </span>
                        <span
                          className="font-medium text-foreground"
                          data-atlas-numeric="true"
                        >
                          {formatLimitValue(
                            plan.limits[limitKey],
                            STORAGE_LIMIT_KEYS.includes(limitKey),
                            unlimitedLabel
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 border-t border-border pt-3 text-sm">
                    {PLAN_FEATURE_KEYS.map((featureKey) => {
                      const included = plan.features[featureKey];
                      return (
                        <div
                          key={featureKey}
                          className="flex items-center gap-2"
                        >
                          {included ? (
                            <Check
                              className="size-4 shrink-0 text-success"
                              strokeWidth={2}
                              aria-hidden
                            />
                          ) : (
                            <X
                              className="size-4 shrink-0 text-muted-foreground"
                              strokeWidth={2}
                              aria-hidden
                            />
                          )}
                          <span
                            className={cn(
                              included
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            )}
                          >
                            {t(`tenant:common.features.${featureKey}`)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <p className="text-xs text-muted-foreground">
          {t('tenant:planComparison.footerNote')}
        </p>
      </DialogContent>
    </Dialog>
  );
}
