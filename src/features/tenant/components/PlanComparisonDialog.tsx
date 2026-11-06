/**
 * Plan Comparison Dialog.
 *
 * Read-only comparison of every catalog Plan's limits. Reused from the
 * Subscription, Usage and Add-ons pages whenever the user needs to see
 * "what would change" after reaching a limit.
 *
 * Only enforced entitlements are compared. The one feature entitlement
 * (`liveSessions`) is sold as an add-on, so a plan is never shown as
 * "missing" it: a plan that bundles it says so, and nothing is shown
 * otherwise — and nothing at all while its customer launch is deferred.
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
import { Check, Info } from 'lucide-react';
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
import { PlanGiftOffer } from './PlanGiftOffer';
import { cn, formatCurrency } from '@utils';
import { isFeatureEnabled } from '@config';
import {
  PLAN_FEATURE_KEYS,
  CUSTOMER_PLAN_LIMIT_KEYS,
  STORAGE_LIMIT_KEYS,
} from '../constants/tenant.constants';
import { formatLimitValue } from '../utils/entitlement.utils';
import {
  resolvePlanDescription,
  resolvePlanName,
} from '../utils/plan-text.utils';
import type { LanguageCode, Plan, TenantSubscriptionStatus } from '@types';
import { useBidiIsolation } from '@hooks';

/**
 * B5 (UX audit) — "Monthly: EGP 699 · Yearly: EGP 6,990" from the plan's
 * own catalog pricing, so the cards can be compared on price too. Nothing
 * when the plan has no usable price.
 */
function PlanPriceLine({
  plan,
  locale,
}: {
  readonly plan: Plan;
  readonly locale: LanguageCode;
}): JSX.Element | null {
  const { t } = useTranslation();
  const pricing = plan.pricing;
  if (!hasUsablePricing(plan) || !pricing?.currency) return null;
  const cycle = pricing.billingCycle ?? 'monthly';
  const parts = [
    `${formatCurrency(pricing.amount!, locale, pricing.currency)} / ${t(
      `payments:common.billingCycleShort.${cycle}`
    )}`,
  ];
  if (
    cycle === 'monthly' &&
    typeof pricing.yearlyAmount === 'number' &&
    Number.isFinite(pricing.yearlyAmount)
  ) {
    parts.push(
      `${formatCurrency(pricing.yearlyAmount, locale, pricing.currency)} / ${t(
        'payments:common.billingCycleShort.yearly'
      )}`
    );
  }
  return (
    <p
      className="text-sm font-semibold text-foreground"
      data-atlas-numeric="true"
      data-testid={`plan-price-${plan.key}`}
    >
      {parts.map((part, index) => (
        <span key={part}>
          {index > 0 ? (
            <span className="mx-1 font-normal text-muted-foreground">
              {t('tenant:planComparison.priceOr')}
            </span>
          ) : null}
          <span dir="ltr" data-ltr-content className="whitespace-nowrap">
            {part}
          </span>
        </span>
      ))}
    </p>
  );
}

/**
 * "Fail safely" defense-in-depth (never the source of truth — the backend
 * catalog query is: `PlansRepository`'s `CUSTOMER_FACING_WHERE` is what
 * actually keeps an unpriced/fixture plan out of `GET /plans` in the first
 * place). This is a second, independent check purely so that if a plan
 * without usable pricing ever reaches this dialog anyway — a future
 * regression, a stale cached response, a different caller of this same
 * component — a customer can never click into a checkout that is
 * guaranteed to fail with `pricingUnavailable`. Mirrors
 * `CheckoutService.resolvePricingOrThrow`'s own "field present, never
 * truthiness" check on the backend exactly, so a real free plan
 * (`amount: 0`) is never mistaken for "unpriced" here either.
 */
function hasUsablePricing(plan: Plan): boolean {
  return (
    plan.pricing?.amount !== undefined &&
    plan.pricing.amount !== null &&
    !!plan.pricing?.currency
  );
}

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
   * Phase 11 — when provided, offers a Free Trial on the plans that are
   * configured as trial-eligible, instead of only "Select this plan".
   *
   * WHICH plans get the offer is decided by `plan.trialEligible` (catalog
   * data from the backend) and never by a comparison against a plan key
   * here — so making a future plan trialable is a configuration change,
   * not an edit to this component. WHETHER to offer it at all is the
   * caller's decision, since it also depends on the account still having
   * its one lifetime trial.
   */
  readonly onStartTrial?: (plan: Plan) => void;
  /**
   * Purely informational notice rendered above the plan grid — e.g.
   * explaining why plan selection is unavailable right now and what to do
   * about it. Never controls whether `onSelectPlan` renders; the caller
   * decides that independently (typically by omitting `onSelectPlan`
   * itself when selection genuinely cannot succeed).
   */
  readonly notice?: PlanComparisonNotice;
  /**
   * W8 — the backend's display-only `lifecycle.giftAvailable`. When true,
   * plans that offer gifted setup days say so ("Your first paid
   * subscription includes N gifted setup days"). The grant itself is decided
   * server-side at payment approval.
   */
  readonly giftAvailable?: boolean;
  /**
   * B5 (UX audit) — the status of the subscription on `currentPlanKey`.
   * With `onSelectPlan`, the current plan's card offers what checking it
   * out really does: an active (or lapsing) plan is paid for one more
   * period, added after the current one ends; a trial or an ended plan is
   * bought. Without it the current plan has no action.
   */
  readonly currentStatus?: TenantSubscriptionStatus;
}

/** What checking out the current plan does, by its status. */
function currentPlanAction(
  status: TenantSubscriptionStatus | undefined
): 'renew' | 'buy' | null {
  if (!status) return null;
  if (status === 'active' || status === 'grace_period') return 'renew';
  if (
    status === 'trialing' ||
    status === 'trial_expired' ||
    status === 'expired' ||
    status === 'cancelled'
  ) {
    return 'buy';
  }
  return null;
}

export function PlanComparisonDialog({
  open,
  onOpenChange,
  plans,
  isLoading = false,
  currentPlanKey,
  onSelectPlan,
  onStartTrial,
  notice,
  giftAvailable,
  currentStatus,
}: PlanComparisonDialogProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { isolate } = useBidiIsolation();
  const unlimitedLabel = t('tenant:common.unlimited');
  /*
    P54 — plan names/descriptions are CATALOG DATA, so they are resolved
    from the row's own `{ en, ar }` text with the same helper the website
    CMS uses, never from a translation key. `resolveLocalizedText` accepts
    a plain string too, so a plan seeded before P54 falls back to its
    English `name` instead of rendering blank.
  */
  const locale = i18n.language as LanguageCode;
  const sortedPlans = plans
    ? [...plans].sort((a, b) => a.displayOrder - b.displayOrder)
    : undefined;
  const NoticeIcon = notice?.icon ?? Info;
  const currentAction = onSelectPlan ? currentPlanAction(currentStatus) : null;

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
                      <h4
                        className="font-display text-base font-semibold text-foreground"
                        // A plan name is business content that may be in
                        // either language regardless of the UI language.
                        dir="auto"
                      >
                        {resolvePlanName(plan, locale)}
                      </h4>
                      {plan.key === currentPlanKey ? (
                        <StatusBadge
                          labelKey="tenant:planComparison.currentPlanBadge"
                          tone="info"
                        />
                      ) : null}
                    </div>
                    {resolvePlanDescription(plan, locale) ? (
                      <p className="text-sm text-muted-foreground" dir="auto">
                        {resolvePlanDescription(plan, locale)}
                      </p>
                    ) : null}
                    <PlanPriceLine plan={plan} locale={locale} />
                  </div>

                  <div className="space-y-1.5 text-sm">
                    {CUSTOMER_PLAN_LIMIT_KEYS.map((limitKey) => (
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

                  {isFeatureEnabled('liveSessions') &&
                  PLAN_FEATURE_KEYS.some(
                    (key) => plan.features[key] === true
                  ) ? (
                    <div className="space-y-1.5 border-t border-border pt-3 text-sm">
                      {PLAN_FEATURE_KEYS.filter(
                        (key) => plan.features[key] === true
                      ).map((featureKey) => (
                        <div
                          key={featureKey}
                          className="flex items-center gap-2"
                        >
                          <Check
                            className="size-4 shrink-0 text-success"
                            strokeWidth={2}
                            aria-hidden
                          />
                          <span className="text-foreground">
                            {t(`tenant:common.features.${featureKey}`)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {plan.key !== currentPlanKey && onSelectPlan ? (
                    <PlanGiftOffer
                      plan={plan}
                      cycle={plan.pricing?.billingCycle ?? 'monthly'}
                      giftAvailable={giftAvailable}
                    />
                  ) : null}

                  {plan.key === currentPlanKey &&
                  currentAction &&
                  onSelectPlan &&
                  plan.status === 'active' &&
                  hasUsablePricing(plan) ? (
                    <div className="mt-auto flex flex-col gap-2">
                      <p
                        className="text-xs text-muted-foreground"
                        data-testid={`current-plan-note-${plan.key}`}
                      >
                        {t(
                          currentAction === 'renew'
                            ? 'tenant:planComparison.renewNote'
                            : 'tenant:planComparison.buyCurrentNote'
                        )}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onSelectPlan(plan)}
                        data-testid={`current-plan-action-${plan.key}`}
                      >
                        {t(
                          currentAction === 'renew'
                            ? 'tenant:planComparison.payNextPeriod'
                            : 'tenant:planComparison.buyCurrentPlan'
                        )}
                      </Button>
                    </div>
                  ) : null}

                  {plan.key !== currentPlanKey ? (
                    <div className="mt-auto flex flex-col gap-2">
                      {/*
                        THE TRIAL IS THE PRIMARY ACTION when it is
                        genuinely available, because "try Growth free for
                        3 days" is a far more honest first step than
                        "select this plan" for someone who has not seen
                        the product yet. The duration comes from the plan
                        itself (`trialDurationDays`), so no "3" is written
                        into this component.
                      */}
                      {onStartTrial &&
                      plan.trialEligible &&
                      plan.status === 'active' ? (
                        <Button
                          type="button"
                          onClick={() => onStartTrial(plan)}
                          data-testid={`start-trial-${plan.key}`}
                        >
                          {plan.trialDurationDays
                            ? t('tenant:planComparison.tryFreeForDays', {
                                plan: isolate(resolvePlanName(plan, locale)),
                                count: plan.trialDurationDays,
                              })
                            : t('tenant:planComparison.tryFree', {
                                plan: isolate(resolvePlanName(plan, locale)),
                              })}
                        </Button>
                      ) : null}

                      {onSelectPlan ? (
                        plan.status === 'active' && hasUsablePricing(plan) ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => onSelectPlan(plan)}
                          >
                            {t('tenant:planComparison.selectPlan')}
                          </Button>
                        ) : (
                          /* B5 (UX audit) — say why instead of a greyed button. */
                          <p
                            className="text-xs text-muted-foreground"
                            data-testid={`plan-not-for-sale-${plan.key}`}
                          >
                            {t('tenant:planComparison.notForSale')}
                          </p>
                        )
                      ) : null}
                    </div>
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
