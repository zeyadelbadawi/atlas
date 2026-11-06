/**
 * Billing Overview Page.
 *
 * The Tenant's financial-operations home — distinct from Prompt 6's Tenant
 * Dashboard (`/dashboard/tenant`), which is a SaaS-status summary
 * (subscription/usage/add-ons). This page is about the money: payments
 * that need attention right now, and quick access to full payment history.
 * B0-CPY-22: no Invoices link — no invoice is ever issued yet.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Columns3,
  CreditCard,
  FileText,
  Receipt,
} from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { useCheckout, usePaymentHistory } from '../hooks';
import {
  localizedAddOnText,
  resolvePlanName,
  SubscriptionGiftDetails,
  usePlanCatalog,
  useTenantSubscription,
} from '@features/tenant';
import { getPaymentStatusTone } from '../utils/payment-status.utils';
import { formatMoney } from '../utils/money.utils';
import { TERMINAL_PAYMENT_STATUSES } from '@types';
import type { LanguageCode, Payment, Plan } from '@types';
import { cn, MIRROR_IN_RTL, directionOf, isolateTextIn } from '@utils';

/** B5 (UX audit) — what the owner has to do about an open payment. */
export function paymentNextStepKey(
  payment: Pick<Payment, 'reviewStatus' | 'proof' | 'nextAction' | 'methodType'>
): string {
  if (payment.reviewStatus === 'pending') {
    return 'payments:overview.nextStep.awaitingReview';
  }
  if (payment.nextAction?.type === 'redirect') {
    return 'payments:overview.nextStep.continueToProvider';
  }
  if (payment.methodType !== 'gateway' && !payment.proof) {
    return 'payments:overview.nextStep.transferAndUpload';
  }
  return 'payments:overview.nextStep.open';
}

/**
 * B5 (UX audit) — one open payment: WHAT it is for (the plan or add-on
 * of its checkout, and the cycle), how much, its status, and what to do,
 * with a visible "Open payment". Before, the row read "EGP 6,990.00 ·
 * Pending" and nothing else.
 */
function AttentionPaymentRow({
  payment,
  plans,
  onOpen,
}: {
  readonly payment: Payment;
  readonly plans: readonly Plan[] | undefined;
  readonly onOpen: () => void;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const language = i18n.language as LanguageCode;
  const checkout = useCheckout(payment.checkoutId).data;
  const target = checkout?.target;
  const plan =
    target?.type === 'plan_subscription'
      ? plans?.find((candidate) => candidate.key === target.planKey)
      : undefined;
  const name = !checkout
    ? undefined
    : plan
      ? resolvePlanName(plan, language)
      : target?.type === 'add_on'
        ? localizedAddOnText(
            t,
            i18n,
            target.addOnKey,
            'name',
            checkout.snapshot.displayName
          )
        : checkout.snapshot.displayName;
  const cycle = checkout?.snapshot.billingCycle ?? checkout?.billingCycle;
  const what = name
    ? t(
        target?.type === 'add_on'
          ? 'payments:overview.forAddOn'
          : 'payments:overview.forPlan',
        { name: isolateTextIn(directionOf(i18n), name) }
      )
    : t('payments:overview.forUnknown');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded-md border border-border p-3 text-start text-sm hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
      data-testid={`attention-payment-${payment.id}`}
    >
      <span className="min-w-0 space-y-0.5">
        {/* A translated phrase: the page's direction; the name is isolated. */}
        <span className="block font-medium text-foreground">
          {what}
          {cycle ? (
            <span className="font-normal text-muted-foreground">
              {' · '}
              {t(`payments:common.billingCycle.${cycle}`)}
            </span>
          ) : null}
        </span>
        <span className="block text-muted-foreground">
          <span dir="ltr" data-ltr-content className="text-foreground">
            {formatMoney(payment.money, i18n.language)}
          </span>
          {' — '}
          {t(paymentNextStepKey(payment))}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <StatusBadge
          labelKey={
            payment.reviewStatus === 'pending'
              ? 'payments:payment.reviewStatus.pending'
              : `payments:payment.status.${payment.status}`
          }
          tone={
            payment.reviewStatus === 'pending'
              ? 'info'
              : getPaymentStatusTone(payment.status)
          }
        />
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          {t('payments:overview.openPayment')}
          <ArrowRight
            className={cn('size-4', MIRROR_IN_RTL)}
            strokeWidth={2}
            aria-hidden
          />
        </span>
      </span>
    </button>
  );
}

export default function BillingOverviewPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = i18n.language as LanguageCode;
  const plansQuery = usePlanCatalog();

  const subscriptionQuery = useTenantSubscription();
  const paymentsQuery = usePaymentHistory({
    query: { pagination: { page: 1, pageSize: 10 } },
  });

  const isLoading = subscriptionQuery.isLoading || paymentsQuery.isLoading;
  const error = subscriptionQuery.error ?? paymentsQuery.error;

  const refetchAll = () => {
    void subscriptionQuery.refetch();
    void paymentsQuery.refetch();
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  // A real, legitimate "no subscription yet" — see `TenantSubscriptionPage`'s
  // identical branch for the full rationale. This page reads `subscription.plan`
  // for its "current plan" card, so it genuinely cannot render without one;
  // the correct response is the same guide-to-Plans empty state, not a
  // generic error screen.
  if (subscriptionQuery.error?.kind === 'notFound') {
    return (
      <PageContainer>
        <PageHeader
          titleKey="payments:overview.title"
          descriptionKey="payments:overview.subtitle"
        />
        <EmptyState
          icon={CreditCard}
          titleKey="tenant:subscription.noSubscription.title"
          descriptionKey="tenant:subscription.noSubscription.description"
          primaryAction={{
            labelKey: 'tenant:subscription.noSubscription.action',
            icon: Columns3,
            onAction: () => navigate(DASHBOARD_ROUTES.plans),
          }}
        />
      </PageContainer>
    );
  }

  if (error || !subscriptionQuery.data || !paymentsQuery.data) {
    return (
      <PageContainer>
        <PageHeader
          titleKey="payments:overview.title"
          descriptionKey="payments:overview.subtitle"
        />
        <ErrorState onRetry={refetchAll} />
      </PageContainer>
    );
  }

  const subscription = subscriptionQuery.data;
  const attentionPayments = paymentsQuery.data.items.filter(
    (payment) => !TERMINAL_PAYMENT_STATUSES.includes(payment.status)
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="payments:overview.title"
        descriptionKey="payments:overview.subtitle"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('payments:overview.currentPlan')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p
                className="font-display text-lg font-semibold text-foreground"
                dir="auto"
              >
                {resolvePlanName(subscription.plan, language)}
              </p>
              {subscription.billingCycle ? (
                <p className="text-sm text-muted-foreground">
                  {t(
                    `payments:common.billingCycle.${subscription.billingCycle}`
                  )}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(DASHBOARD_ROUTES.tenantSubscription)}
            >
              {t('payments:overview.manageSubscription')}
              <ArrowRight
                className={cn('size-4', MIRROR_IN_RTL)}
                strokeWidth={2}
                aria-hidden
              />
            </Button>
            {/* W8 — "Includes N gifted setup days" when one was granted. */}
            {subscription.giftedDays ? (
              <div className="basis-full">
                <SubscriptionGiftDetails subscription={subscription} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {t('payments:overview.needsAttentionTitle')}
            </CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(DASHBOARD_ROUTES.tenantBillingPayments)}
            >
              {t('payments:overview.viewAllPayments')}
              <ArrowRight
                className={cn('size-4', MIRROR_IN_RTL)}
                strokeWidth={2}
                aria-hidden
              />
            </Button>
          </CardHeader>
          <CardContent>
            {attentionPayments.length === 0 ? (
              <EmptyState
                titleKey="payments:overview.noAttentionNeeded"
                descriptionKey="payments:overview.noAttentionNeededDescription"
                icon={Receipt}
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {attentionPayments.map((payment) => (
                  <AttentionPaymentRow
                    key={payment.id}
                    payment={payment}
                    plans={plansQuery.data}
                    onOpen={() =>
                      navigate(
                        buildPath(DASHBOARD_ROUTES.tenantBillingPaymentDetail, {
                          paymentId: payment.id,
                        })
                      )
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate(DASHBOARD_ROUTES.tenantBillingPayments)}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-start hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FileText
              className="size-5 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden
            />
            <span>
              <span className="block font-medium text-foreground">
                {t('payments:overview.paymentHistoryLink')}
              </span>
              <span className="block text-sm text-muted-foreground">
                {t('payments:overview.paymentHistoryLinkDescription')}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate(DASHBOARD_ROUTES.tenantAddOns)}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-start hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Receipt
              className="size-5 text-muted-foreground"
              strokeWidth={1.75}
              aria-hidden
            />
            <span>
              <span className="block font-medium text-foreground">
                {t('payments:overview.addOnsLink')}
              </span>
              <span className="block text-sm text-muted-foreground">
                {t('payments:overview.addOnsLinkDescription')}
              </span>
            </span>
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
