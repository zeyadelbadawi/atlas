/**
 * Academy Order detail — one course order of the academy in the route, for
 * its Organization Owner: what was bought, by whom (name + masked email),
 * every payment attempt and the refund, if any. Read-only, like the list.
 *
 * `GET academies/:id/course-orders/:orderId` answers 403 to anyone but the
 * Organization Owner (rendered as a permission state) and 404 for an order
 * of another academy (rendered as "not found", never as an error to retry).
 */
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { SearchX, ShieldOff } from 'lucide-react';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useDateFormatter } from '@hooks';
import {
  formatMoney,
  getCourseOrderStatusTone,
  getManualReviewStatusTone,
  getPaymentStatusTone,
  getRefundStatusTone,
} from '@features/billing';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { LANGUAGES } from '@localization';
import { useAcademyCourseOrder } from '../hooks';
import type { AcademyCourseOrderPaymentSummary, LanguageCode } from '@types';

function DetailRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words sm:text-end">{children}</dd>
    </div>
  );
}

export default function AcademyOrdersDetailPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const { academyId = '', orderId = '' } = useParams<{
    academyId: string;
    orderId: string;
  }>();
  const locale =
    LANGUAGES[i18n.language as LanguageCode]?.locale ?? i18n.language;
  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useAcademyCourseOrder(academyId, orderId);

  const breadcrumbs = [
    {
      labelKey: 'payments:academyOrders.detail.breadcrumb',
      path: buildPath(DASHBOARD_ROUTES.academyOrders, { academyId }),
    },
    { labelKey: 'payments:academyOrders.detail.title' },
  ];

  const paymentColumns = useMemo<
    ColumnDef<AcademyCourseOrderPaymentSummary, unknown>[]
  >(
    () => [
      {
        id: 'createdAt',
        enableSorting: false,
        header: t('payments:academyOrders.detail.paymentColumns.createdAt'),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {fmt.dateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'method',
        enableSorting: false,
        header: t('payments:academyOrders.detail.paymentColumns.method'),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {t(`payments:common.methodType.${row.original.methodType}`)}
          </span>
        ),
      },
      {
        id: 'amount',
        enableSorting: false,
        header: t('payments:academyOrders.detail.paymentColumns.amount'),
        cell: ({ row }) => (
          <span
            className="whitespace-nowrap tabular-nums"
            data-atlas-numeric="true"
          >
            {formatMoney(row.original.money, locale)}
          </span>
        ),
      },
      {
        id: 'status',
        enableSorting: false,
        header: t('payments:academyOrders.detail.paymentColumns.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`payments:payment.status.${row.original.status}`}
            tone={getPaymentStatusTone(row.original.status)}
          />
        ),
      },
      {
        id: 'review',
        enableSorting: false,
        header: t('payments:academyOrders.detail.paymentColumns.review'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`payments:payment.reviewStatus.${row.original.reviewStatus}`}
            tone={getManualReviewStatusTone(row.original.reviewStatus)}
          />
        ),
      },
      {
        id: 'reference',
        enableSorting: false,
        header: t('payments:academyOrders.detail.paymentColumns.reference'),
        cell: ({ row }) =>
          row.original.providerReference ? (
            <span
              className="break-all font-mono text-xs"
              dir="ltr"
              data-ltr-content
            >
              {row.original.providerReference}
            </span>
          ) : (
            <span className="text-muted-foreground">
              <span aria-hidden>—</span>
              <span className="sr-only">
                {t('payments:academyOrders.detail.noReference')}
              </span>
            </span>
          ),
      },
    ],
    [t, fmt, locale]
  );

  const header = (
    <PageHeader
      titleKey="payments:academyOrders.detail.title"
      descriptionKey="payments:academyOrders.detail.description"
      breadcrumbs={breadcrumbs}
    />
  );

  if (isLoading) {
    return (
      <PageContainer>
        {header}
        <div className="space-y-6" aria-busy="true">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (error?.kind === 'forbidden') {
    return (
      <PageContainer>
        {header}
        <SectionCard>
          <EmptyState
            icon={ShieldOff}
            titleKey="payments:academyOrders.forbidden.title"
            descriptionKey="payments:academyOrders.forbidden.description"
          />
        </SectionCard>
      </PageContainer>
    );
  }

  if (error?.kind === 'notFound') {
    return (
      <PageContainer>
        {header}
        <SectionCard>
          <EmptyState
            icon={SearchX}
            titleKey="payments:academyOrders.detail.notFound.title"
            descriptionKey="payments:academyOrders.detail.notFound.description"
          />
        </SectionCard>
      </PageContainer>
    );
  }

  if (error || !order) {
    return (
      <PageContainer>
        {header}
        <ErrorState
          kind={error?.kind}
          titleKey="payments:academyOrders.detail.error.title"
          descriptionKey="payments:academyOrders.detail.error.description"
          requestId={error?.requestId}
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {header}

      <SectionCard titleKey="payments:academyOrders.detail.summaryTitle">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span
            className="font-display text-2xl font-semibold"
            data-atlas-numeric="true"
          >
            {formatMoney(order.money, locale)}
          </span>
          <StatusBadge
            labelKey={`payments:courseOrder.status.${order.status}`}
            tone={getCourseOrderStatusTone(order.status)}
          />
          {order.refund ? (
            <StatusBadge
              labelKey={`payments:refund.status.${order.refund.status}`}
              tone={getRefundStatusTone(order.refund.status)}
            />
          ) : null}
        </div>
        <dl className="space-y-3 text-sm">
          <DetailRow label={t('payments:academyOrders.detail.orderId')}>
            <span
              className="break-all font-mono text-xs"
              dir="ltr"
              data-ltr-content
            >
              {order.id}
            </span>
          </DetailRow>
          <DetailRow label={t('payments:academyOrders.detail.course')}>
            <span dir="auto">{order.course.title}</span>
          </DetailRow>
          <DetailRow label={t('payments:academyOrders.detail.student')}>
            <span className="flex flex-col sm:items-end">
              <span dir="auto">{order.student.name}</span>
              <span
                className="text-xs text-muted-foreground"
                dir="ltr"
                data-ltr-content
              >
                {order.student.maskedEmail}
              </span>
            </span>
          </DetailRow>
          <DetailRow label={t('payments:academyOrders.detail.placedAt')}>
            {fmt.dateTime(order.createdAt)}
          </DetailRow>
          <DetailRow label={t('payments:academyOrders.detail.paidAt')}>
            {order.paidAt
              ? fmt.dateTime(order.paidAt)
              : t('payments:academyOrders.detail.notPaid')}
          </DetailRow>
          {order.status === 'pending_payment' ? (
            <DetailRow label={t('payments:academyOrders.detail.expiresAt')}>
              {fmt.dateTime(order.expiresAt)}
            </DetailRow>
          ) : null}
        </dl>
      </SectionCard>

      <SectionCard
        titleKey="payments:academyOrders.detail.paymentsTitle"
        flushBody
      >
        <DataTable
          columns={paymentColumns}
          data={order.payments}
          emptyTitleKey="payments:academyOrders.detail.paymentsTitle"
          emptyDescriptionKey="payments:academyOrders.detail.paymentsEmpty"
          getRowId={(payment) => payment.id}
        />
      </SectionCard>

      {order.refund ? (
        <SectionCard titleKey="payments:academyOrders.detail.refundTitle">
          <dl className="space-y-3 text-sm">
            <DetailRow label={t('payments:academyOrders.detail.refundAmount')}>
              <span data-atlas-numeric="true">
                {formatMoney(order.refund.money, locale)}
              </span>
            </DetailRow>
            <DetailRow
              label={t('payments:academyOrders.detail.refundRequestedAt')}
            >
              {fmt.dateTime(order.refund.requestedAt)}
            </DetailRow>
            {order.refund.processedAt ? (
              <DetailRow
                label={t('payments:academyOrders.detail.refundProcessedAt')}
              >
                {fmt.dateTime(order.refund.processedAt)}
              </DetailRow>
            ) : null}
          </dl>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
