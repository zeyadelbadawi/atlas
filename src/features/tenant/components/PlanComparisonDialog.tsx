/**
 * Plan Comparison Dialog.
 *
 * Read-only comparison of every catalog Plan's limits and features. Reused
 * from the Subscription, Usage and Add-ons pages whenever the user needs to
 * see "what would change" after reaching a limit or missing a feature.
 *
 * `onSelectPlan` is optional and, when provided (Prompt 7's
 * `TenantSubscriptionPage`), adds a "Select this plan" action per plan
 * that starts Checkout — it still never submits a plan change itself, so
 * this dialog never claims a plan change happened on its own; only an
 * authoritative, backend-confirmed Payment does that (see
 * `Reports/ARCHITECTURE.md`, Prompt 7, "Payment Is Not Subscription").
 * Callers that omit `onSelectPlan` (Usage/Add-ons pages, showing this
 * purely as "what would fix this gap") keep the original read-only
 * behavior unchanged.
 */
import { useTranslation } from 'react-i18next';
import { Check, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@components/data-display';
import { cn } from '@utils';
import {
  PLAN_FEATURE_KEYS,
  PLAN_LIMIT_KEYS,
  STORAGE_LIMIT_KEYS,
} from '../constants/tenant.constants';
import { formatLimitValue } from '../utils/entitlement.utils';
import type { Plan } from '@types';

/** An inline notice shown above the plan grid, with an optional action. */
export interface PlanComparisonNotice {
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly actionLabelKey?: string;
  readonly onAction?: () => void;
  readonly icon?: LucideIcon;
}

export interface PlanComparisonDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly plans: readonly Plan[] | undefined;
  readonly isLoading?: boolean;
  /** The Tenant's current plan key, so it can be marked in the comparison. */
  readonly currentPlanKey?: string;
  /** When provided, renders a "Select this plan" action per non-current, active plan that starts Checkout. */
  readonly onSelectPlan?: (plan: Plan) => void;
  /**
   * Purely informational notice rendered above the plan grid — e.g.
   * explaining why plan selection is unavailable right now and what to do
   * about it. Never controls whether `onSelectPlan` renders; the caller
   * decides that independently (typically by omitting `onSelectPlan`
   * itself when selection genuinely cannot succeed).
   */
  readonly notice?: PlanComparisonNotice;
}

export function PlanComparisonDialog({
  open,
  onOpenChange,
  plans,
  isLoading = false,
  currentPlanKey,
  onSelectPlan,
  notice,
}: PlanComparisonDialogProps): JSX.Element {
  const { t } = useTranslation();
  const unlimitedLabel = t('tenant:common.unlimited');
  const sortedPlans = plans
    ? [...plans].sort((a, b) => a.displayOrder - b.displayOrder)
    : undefined;
  const NoticeIcon = notice?.icon ?? Info;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('tenant:planComparison.title')}</DialogTitle>
          <DialogDescription>
            {t('tenant:planComparison.description')}
          </DialogDescription>
        </DialogHeader>

        {notice ? (
          <Alert>
            <NoticeIcon className="size-4" aria-hidden />
            <AlertTitle>{t(notice.titleKey)}</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{t(notice.descriptionKey)}</span>
              {notice.actionLabelKey && notice.onAction ? (
                <Button type="button" size="sm" onClick={notice.onAction}>
                  {t(notice.actionLabelKey)}
                </Button>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

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

                  {onSelectPlan && plan.key !== currentPlanKey ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-auto"
                      disabled={plan.status !== 'active'}
                      onClick={() => onSelectPlan(plan)}
                    >
                      {t('tenant:planComparison.selectPlan')}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <p className="text-xs text-muted-foreground">
          {t(
            onSelectPlan
              ? 'tenant:planComparison.selectableFooterNote'
              : 'tenant:planComparison.footerNote'
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
