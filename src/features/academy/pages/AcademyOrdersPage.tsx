/**
 * Academy Orders page — the course purchases made from the academy named in
 * the route, for its Organization Owner. Read-only: manual payments are
 * approved or rejected by Atlas (the Platform Owner), refunds are requested
 * by the student; nothing here changes money.
 *
 * Presentation rules that follow from the backend contract
 * (`GET academies/:id/course-orders`):
 *
 *   - ORGANIZATION OWNER ONLY, like Revenue & payouts next to it. A manager
 *     or instructor gets 403, rendered as ONE permission state — never a
 *     blank table or a generic error.
 *   - EVERYTHING IS SERVER-SIDE. Search, filters, sort and paging are query
 *     params; the table renders exactly the page it is given, so its column
 *     headers are not locally sortable (that would only sort one page).
 *   - NO SENSITIVE DATA ARRIVES. The student is a name and a masked email;
 *     payment instructions, proofs and the Atlas commission are never sent.
 *   - Status is never carried by colour alone: every badge has its text.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldOff, ShoppingBag, X } from 'lucide-react';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { SearchInput, StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDateFormatter, usePagination } from '@hooks';
import {
  formatMoney,
  getCourseOrderStatusTone,
  getManualReviewStatusTone,
  getPaymentStatusTone,
  getRefundStatusTone,
} from '@features/billing';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { LANGUAGES } from '@localization';
import { useAcademyCourseOrders } from '../hooks';
import {
  COURSE_ORDER_STATUSES,
  type AcademyCourseOrder,
  type AcademyCourseOrderFilters,
  type AcademyCourseOrderListQuery,
  type AcademyCourseOrderRefundFilter,
  type AcademyCourseOrderSortField,
  type CourseOrderStatus,
  type LanguageCode,
  type ManualReviewStatus,
  type PaymentMethodType,
} from '@types';

const REVIEW_FILTERS: readonly ManualReviewStatus[] = [
  'pending',
  'approved',
  'rejected',
  'not_required',
];
const METHOD_FILTERS: readonly PaymentMethodType[] = [
  'manual_bank_transfer',
  'manual_wallet_transfer',
  'manual_instapay',
  'gateway',
];
const REFUND_FILTERS: readonly AcademyCourseOrderRefundFilter[] = [
  'none',
  'pending',
  'succeeded',
  'failed',
];
const SORT_OPTIONS = [
  'createdAt_desc',
  'createdAt_asc',
  'paidAt_desc',
  'amount_desc',
  'amount_asc',
] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

interface OrdersFilterState {
  readonly search: string;
  readonly status: CourseOrderStatus | 'all';
  readonly reviewStatus: ManualReviewStatus | 'all';
  readonly methodType: PaymentMethodType | 'all';
  readonly refundStatus: AcademyCourseOrderRefundFilter | 'all';
  readonly from: string;
  readonly to: string;
  readonly sort: SortOption;
}

const DEFAULT_FILTERS: OrdersFilterState = {
  search: '',
  status: 'all',
  reviewStatus: 'all',
  methodType: 'all',
  refundStatus: 'all',
  from: '',
  to: '',
  sort: 'createdAt_desc',
};

function hasActiveFilters(state: OrdersFilterState): boolean {
  return (Object.keys(DEFAULT_FILTERS) as (keyof OrdersFilterState)[]).some(
    (key) => state[key] !== DEFAULT_FILTERS[key]
  );
}

function toQuery(
  state: OrdersFilterState,
  pagination: { readonly page: number; readonly pageSize: number }
): AcademyCourseOrderListQuery {
  const [field, direction] = state.sort.split('_') as [
    AcademyCourseOrderSortField,
    'asc' | 'desc',
  ];
  const filters: AcademyCourseOrderFilters = {
    ...(state.status !== 'all' ? { status: state.status } : {}),
    ...(state.reviewStatus !== 'all'
      ? { reviewStatus: state.reviewStatus }
      : {}),
    ...(state.methodType !== 'all' ? { methodType: state.methodType } : {}),
    ...(state.refundStatus !== 'all'
      ? { refundStatus: state.refundStatus }
      : {}),
    ...(state.from ? { from: state.from } : {}),
    ...(state.to ? { to: state.to } : {}),
  };
  return {
    pagination,
    sort: { field, direction },
    ...(state.search.trim() ? { search: state.search.trim() } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
  };
}

interface FilterSelectProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly onValueChange: (value: string) => void;
  readonly className?: string;
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onValueChange,
  className = 'w-full sm:w-[170px]',
}: FilterSelectProps): JSX.Element {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className={className}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Dash({ srLabel }: { readonly srLabel: string }): JSX.Element {
  return (
    <span className="text-muted-foreground">
      <span aria-hidden>—</span>
      <span className="sr-only">{srLabel}</span>
    </span>
  );
}

export default function AcademyOrdersPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const navigate = useNavigate();
  const { academyId = '' } = useParams<{ academyId: string }>();
  const locale =
    LANGUAGES[i18n.language as LanguageCode]?.locale ?? i18n.language;

  const [filters, setFilters] = useState<OrdersFilterState>(DEFAULT_FILTERS);
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems });
  const query = useMemo(
    () =>
      toQuery(filters, {
        page: pagination.page,
        pageSize: pagination.pageSize,
      }),
    [filters, pagination.page, pagination.pageSize]
  );

  const orders = useAcademyCourseOrders(academyId, query);

  useEffect(() => {
    if (orders.data) setTotalItems(orders.data.pagination.totalItems);
  }, [orders.data]);

  const update = (patch: Partial<OrdersFilterState>) => {
    setFilters((current) => ({ ...current, ...patch }));
    pagination.goToFirstPage();
  };

  const columns = useMemo<ColumnDef<AcademyCourseOrder, unknown>[]>(
    () => [
      {
        id: 'order',
        enableSorting: false,
        header: t('payments:academyOrders.columns.order'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span
              className="font-mono text-xs text-foreground"
              dir="ltr"
              title={row.original.id}
            >
              {row.original.id.slice(0, 8)}
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {fmt.date(row.original.createdAt)}
            </span>
          </div>
        ),
      },
      {
        id: 'student',
        enableSorting: false,
        header: t('payments:academyOrders.columns.student'),
        cell: ({ row }) => (
          <div className="flex min-w-[10rem] flex-col">
            <span className="font-medium text-foreground" dir="auto">
              {row.original.student.name}
            </span>
            <span className="text-xs text-muted-foreground" dir="ltr">
              {row.original.student.maskedEmail}
            </span>
          </div>
        ),
      },
      {
        id: 'course',
        enableSorting: false,
        header: t('payments:academyOrders.columns.course'),
        cell: ({ row }) => (
          <span className="block min-w-[10rem] text-foreground" dir="auto">
            {row.original.course.title}
          </span>
        ),
      },
      {
        id: 'amount',
        enableSorting: false,
        header: t('payments:academyOrders.columns.amount'),
        cell: ({ row }) => (
          <span
            className="whitespace-nowrap font-medium tabular-nums"
            data-atlas-numeric="true"
          >
            {formatMoney(row.original.money, locale)}
          </span>
        ),
      },
      {
        id: 'status',
        enableSorting: false,
        header: t('payments:academyOrders.columns.status'),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`payments:courseOrder.status.${row.original.status}`}
            tone={getCourseOrderStatusTone(row.original.status)}
          />
        ),
      },
      {
        id: 'payment',
        enableSorting: false,
        header: t('payments:academyOrders.columns.payment'),
        cell: ({ row }) => {
          const payment = row.original.latestPayment;
          if (!payment) {
            return (
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {t('payments:academyOrders.noPayment')}
              </span>
            );
          }
          return (
            <div className="flex flex-col items-start gap-1">
              {payment.reviewStatus !== 'not_required' ? (
                <StatusBadge
                  labelKey={`payments:payment.reviewStatus.${payment.reviewStatus}`}
                  tone={getManualReviewStatusTone(payment.reviewStatus)}
                />
              ) : (
                <StatusBadge
                  labelKey={`payments:payment.status.${payment.status}`}
                  tone={getPaymentStatusTone(payment.status)}
                />
              )}
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {t(`payments:common.methodType.${payment.methodType}`)}
              </span>
            </div>
          );
        },
      },
      {
        id: 'refund',
        enableSorting: false,
        header: t('payments:academyOrders.columns.refund'),
        cell: ({ row }) =>
          row.original.refund ? (
            <StatusBadge
              labelKey={`payments:refund.status.${row.original.refund.status}`}
              tone={getRefundStatusTone(row.original.refund.status)}
            />
          ) : (
            <Dash srLabel={t('payments:academyOrders.noRefund')} />
          ),
      },
    ],
    [t, fmt, locale]
  );

  const header = (
    <PageHeader
      titleKey="payments:academyOrders.title"
      descriptionKey="payments:academyOrders.description"
    />
  );

  if (!academyId) {
    return (
      <PageContainer>
        {header}
        <SectionCard>
          <EmptyState
            icon={ShoppingBag}
            titleKey="payments:academyOrders.noAcademy.title"
            descriptionKey="payments:academyOrders.noAcademy.description"
          />
        </SectionCard>
      </PageContainer>
    );
  }

  if (orders.error?.kind === 'forbidden') {
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

  const all = t('payments:academyOrders.filters.all');
  const filtered = hasActiveFilters(filters);

  return (
    <PageContainer>
      {header}

      <SectionCard flushBody>
        <div
          role="search"
          aria-label={t('payments:listFilters.label')}
          className="space-y-3 border-b border-border p-4"
        >
          <SearchInput
            value={filters.search}
            onValueChange={(search) => update({ search })}
            labelKey="payments:academyOrders.searchLabel"
            className="w-full lg:max-w-md"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <FilterSelect
              id="academy-orders-status"
              label={t('payments:academyOrders.filters.status')}
              value={filters.status}
              onValueChange={(status) =>
                update({ status: status as OrdersFilterState['status'] })
              }
              options={[
                { value: 'all', label: all },
                ...COURSE_ORDER_STATUSES.map((status) => ({
                  value: status,
                  label: t(`payments:courseOrder.status.${status}`),
                })),
              ]}
            />
            <FilterSelect
              id="academy-orders-review"
              label={t('payments:academyOrders.filters.reviewStatus')}
              value={filters.reviewStatus}
              onValueChange={(reviewStatus) =>
                update({
                  reviewStatus:
                    reviewStatus as OrdersFilterState['reviewStatus'],
                })
              }
              options={[
                { value: 'all', label: all },
                ...REVIEW_FILTERS.map((status) => ({
                  value: status,
                  label: t(`payments:payment.reviewStatus.${status}`),
                })),
              ]}
            />
            <FilterSelect
              id="academy-orders-method"
              label={t('payments:academyOrders.filters.methodType')}
              value={filters.methodType}
              onValueChange={(methodType) =>
                update({
                  methodType: methodType as OrdersFilterState['methodType'],
                })
              }
              options={[
                { value: 'all', label: all },
                ...METHOD_FILTERS.map((method) => ({
                  value: method,
                  label: t(`payments:common.methodType.${method}`),
                })),
              ]}
            />
            <FilterSelect
              id="academy-orders-refund"
              label={t('payments:academyOrders.filters.refundStatus')}
              value={filters.refundStatus}
              onValueChange={(refundStatus) =>
                update({
                  refundStatus:
                    refundStatus as OrdersFilterState['refundStatus'],
                })
              }
              options={[
                { value: 'all', label: all },
                ...REFUND_FILTERS.map((status) => ({
                  value: status,
                  label: t(`payments:refund.status.${status}`),
                })),
              ]}
            />
            <div className="space-y-1">
              <Label
                htmlFor="academy-orders-from"
                className="text-xs text-muted-foreground"
              >
                {t('payments:academyOrders.filters.from')}
              </Label>
              <Input
                id="academy-orders-from"
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(event) => update({ from: event.target.value })}
                className="w-full sm:w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="academy-orders-to"
                className="text-xs text-muted-foreground"
              >
                {t('payments:academyOrders.filters.to')}
              </Label>
              <Input
                id="academy-orders-to"
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) => update({ to: event.target.value })}
                className="w-full sm:w-[160px]"
              />
            </div>
            <FilterSelect
              id="academy-orders-sort"
              label={t('payments:academyOrders.filters.sort')}
              value={filters.sort}
              onValueChange={(sort) => update({ sort: sort as SortOption })}
              options={SORT_OPTIONS.map((option) => ({
                value: option,
                label: t(`payments:academyOrders.sortOptions.${option}`),
              }))}
              className="w-full sm:w-[190px]"
            />
            {filtered ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  pagination.goToFirstPage();
                }}
                className="self-start sm:self-auto"
              >
                <X className="size-4" strokeWidth={2} aria-hidden />
                {t('payments:academyOrders.filters.clear')}
              </Button>
            ) : null}
          </div>
        </div>

        {orders.error ? (
          <div className="p-6">
            <ErrorState
              kind={orders.error.kind}
              titleKey="payments:academyOrders.error.title"
              descriptionKey="payments:academyOrders.error.description"
              requestId={orders.error.requestId}
              onRetry={() => void orders.refetch()}
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={orders.data?.items ?? []}
            isLoading={orders.isLoading}
            pagination={totalItems > 0 ? pagination : undefined}
            emptyTitleKey={
              filtered
                ? 'payments:academyOrders.emptyFiltered.title'
                : 'payments:academyOrders.empty.title'
            }
            emptyDescriptionKey={
              filtered
                ? 'payments:academyOrders.emptyFiltered.description'
                : 'payments:academyOrders.empty.description'
            }
            getRowId={(order) => order.id}
            onRowSelect={(order) =>
              navigate(
                buildPath(DASHBOARD_ROUTES.academyOrderDetail, {
                  academyId,
                  orderId: order.id,
                })
              )
            }
          />
        )}
      </SectionCard>
    </PageContainer>
  );
}
