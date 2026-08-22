/**
 * Billing Overview Page.
 *
 * The Tenant's financial-operations home — distinct from Prompt 6's Tenant
 * Dashboard (`/dashboard/tenant`), which is a SaaS-status summary
 * (subscription/usage/add-ons). This page is about the money: payments
 * that need attention right now, and quick access to full History/Invoices.
 */
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Receipt } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { ErrorState, EmptyState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { usePaymentHistory } from '../hooks';
import { useTenantSubscription } from '@features/tenant';
import { getPaymentStatusTone } from '../utils/payment-status.utils';
import { formatMoney } from '../utils/money.utils';
import { TERMINAL_PAYMENT_STATUSES } from '@types';

export default function BillingOverviewPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

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
              <p className="font-display text-lg font-semibold text-foreground">
                {subscription.plan.name}
              </p>
              {subscription.billingCycle ? (
                <p className="text-sm text-muted-foreground">
                  {t(`payments:common.billingCycle.${subscription.billingCycle}`)}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(DASHBOARD_ROUTES.tenantSubscription)}
            >
              {t('payments:overview.manageSubscription')}
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </Button>
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
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </Button>
          </CardHeader>
          <CardContent>
            {attentionPayments.length === 0 ? (
              <EmptyState
                titleKey="payments:overview.noAttentionNeeded"
                icon={Receipt}
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {attentionPayments.map((payment) => (
                  <button
                    key={payment.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        buildPath(DASHBOARD_ROUTES.tenantBillingPaymentDetail, {
                          paymentId: payment.id,
                        })
                      )
                    }
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border p-3 text-start text-sm hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-medium text-foreground">
                      {formatMoney(payment.money, i18n.language)}
                    </span>
                    <StatusBadge
                      labelKey={`payments:payment.status.${payment.status}`}
                      tone={getPaymentStatusTone(payment.status)}
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate(DASHBOARD_ROUTES.tenantBillingInvoices)}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-start hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FileText className="size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
            <span>
              <span className="block font-medium text-foreground">
                {t('payments:overview.invoicesLink')}
              </span>
              <span className="block text-sm text-muted-foreground">
                {t('payments:overview.invoicesLinkDescription')}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate(DASHBOARD_ROUTES.tenantAddOns)}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-start hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Receipt className="size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
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
