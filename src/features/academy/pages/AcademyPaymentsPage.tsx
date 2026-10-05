/**
 * Academy Payments — the payments learners made to THIS academy with its own
 * manual methods, for its Organization Owner to review (Academy Manual
 * Payments). Waiting for review first; approved and rejected one tab away.
 *
 *   - ORGANIZATION OWNER ONLY, like Orders: a manager or instructor gets 403
 *     from the backend, rendered as one permission state.
 *   - SERVER-SIDE search (learner name, exact email, course, reference, id),
 *     method filter, sort and paging; the view lives in the URL, and
 *     `?payment=<id>` opens one payment (the "payment to review"
 *     notification links there).
 *   - Status is never colour alone: every badge carries its text.
 *   - The list refreshes itself while on screen: learners submit from their
 *     own browsers.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Inbox, ShieldOff, X } from 'lucide-react';
import { PageContainer, PageHeader, SectionCard } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { SearchInput, StatusBadge } from '@components/data-display';
import { DataTable } from '@components/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useDateFormatter,
  usePagination,
  useUrlListState,
  type UrlListStateConfig,
} from '@hooks';
import { formatMoney, getManualReviewStatusTone } from '@features/billing';
import { LANGUAGES } from '@localization';
import { formatNumber } from '@utils';
import {
  type ACADEMY_COURSE_PAYMENT_REVIEW_STATUSES,
  ACADEMY_PAYMENT_METHOD_TYPES,
  type AcademyCoursePayment,
  type AcademyCoursePaymentFilters,
  type AcademyCoursePaymentListQuery,
  type LanguageCode,
} from '@types';
import { useAcademyCoursePayments } from '../hooks';
import { AcademyPaymentReviewSheet } from '../components/AcademyPaymentReviewSheet';
import { academyPaymentMethodMeta } from '../components/academy-payment-method.meta';

const K = 'payments:academyReview';
const TABS = ['pending', 'approved', 'rejected', 'all'] as const;
type Tab = (typeof TABS)[number];
const SORT_OPTIONS = [
  'createdAt_desc',
  'createdAt_asc',
  'amount_desc',
  'amount_asc',
] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

interface PaymentsFilterState {
  readonly tab: Tab;
  readonly search: string;
  readonly methodType: string;
  readonly sort: SortOption;
}

const DEFAULT_FILTERS: PaymentsFilterState = {
  tab: 'pending',
  search: '',
  methodType: 'all',
  sort: 'createdAt_desc',
};

const URL_CONFIG: UrlListStateConfig<PaymentsFilterState> = {
  defaults: DEFAULT_FILTERS,
  allowed: {
    tab: TABS,
    methodType: ['all', ...ACADEMY_PAYMENT_METHOD_TYPES],
    sort: SORT_OPTIONS,
  },
};

function toQuery(
  state: PaymentsFilterState,
  pagination: { readonly page: number; readonly pageSize: number }
): AcademyCoursePaymentListQuery {
  const [field, direction] = state.sort.split('_') as [
    'createdAt' | 'amount',
    'asc' | 'desc',
  ];
  const filters: AcademyCoursePaymentFilters = {
    ...(state.tab !== 'all'
      ? {
          reviewStatus:
            state.tab as (typeof ACADEMY_COURSE_PAYMENT_REVIEW_STATUSES)[number],
        }
      : {}),
    ...(state.methodType !== 'all'
      ? {
          methodType:
            state.methodType as (typeof ACADEMY_PAYMENT_METHOD_TYPES)[number],
        }
      : {}),
  };
  return {
    pagination,
    sort: { field, direction },
    ...(state.search.trim() ? { search: state.search.trim() } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
  };
}

export default function AcademyPaymentsPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const fmt = useDateFormatter();
  const { academyId = '' } = useParams<{ academyId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const locale =
    LANGUAGES[i18n.language as LanguageCode]?.locale ?? i18n.language;

  const {
    state: filters,
    page,
    pageSize,
    setState: setFilters,
    setPage,
    setPageSize,
  } = useUrlListState(URL_CONFIG);
  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({
    totalItems,
    page,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  });
  const query = useMemo(
    () => toQuery(filters, { page, pageSize }),
    [filters, page, pageSize]
  );
  const payments = useAcademyCoursePayments(academyId, query);

  useEffect(() => {
    if (payments.data) setTotalItems(payments.data.pagination.totalItems);
  }, [payments.data]);

  const openPaymentId = searchParams.get('payment');
  const setOpenPayment = (paymentId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (paymentId) next.set('payment', paymentId);
    else next.delete('payment');
    setSearchParams(next, { replace: true });
  };

  const update = (patch: Partial<PaymentsFilterState>) =>
    setFilters({ ...filters, ...patch });
  const counts = payments.data?.counts;
  const countFor = (tab: Tab): number | undefined =>
    counts
      ? tab === 'all'
        ? counts.pending + counts.approved + counts.rejected
        : counts[tab]
      : undefined;
  const filtered =
    filters.search !== '' ||
    filters.methodType !== 'all' ||
    filters.sort !== DEFAULT_FILTERS.sort;

  const columns = useMemo<ColumnDef<AcademyCoursePayment, unknown>[]>(
    () => [
      {
        id: 'learner',
        enableSorting: false,
        header: t(`${K}.columns.learner`),
        cell: ({ row }) => (
          <div className="flex min-w-[10rem] flex-col">
            <span className="font-medium text-foreground" dir="auto">
              {row.original.learner.name}
            </span>
            <span className="text-xs text-muted-foreground" dir="ltr">
              {row.original.learner.maskedEmail}
            </span>
          </div>
        ),
      },
      {
        id: 'course',
        enableSorting: false,
        header: t(`${K}.columns.course`),
        cell: ({ row }) => (
          <span className="block min-w-[10rem] text-foreground" dir="auto">
            {row.original.course.title}
          </span>
        ),
      },
      {
        id: 'amount',
        enableSorting: false,
        header: t(`${K}.columns.amount`),
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
        id: 'method',
        enableSorting: false,
        header: t(`${K}.columns.method`),
        cell: ({ row }) => {
          const meta = academyPaymentMethodMeta(row.original.methodType);
          const Icon = meta?.icon;
          return (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              {Icon ? (
                <Icon className="size-4 text-muted-foreground" aria-hidden />
              ) : null}
              {t(`payments:common.methodType.${row.original.methodType}`)}
            </span>
          );
        },
      },
      {
        id: 'submitted',
        enableSorting: false,
        header: t(`${K}.columns.submitted`),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-sm text-muted-foreground">
            {fmt.dateTime(
              row.original.proof?.uploadedAt ?? row.original.createdAt
            )}
          </span>
        ),
      },
      {
        id: 'status',
        enableSorting: false,
        header: t(`${K}.columns.status`),
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`${K}.status.${row.original.reviewStatus}`}
            tone={getManualReviewStatusTone(row.original.reviewStatus)}
          />
        ),
      },
    ],
    [t, fmt, locale]
  );

  const header = (
    <PageHeader titleKey={`${K}.title`} descriptionKey={`${K}.description`} />
  );

  if (payments.error?.kind === 'forbidden') {
    return (
      <PageContainer>
        {header}
        <SectionCard>
          <EmptyState
            icon={ShieldOff}
            titleKey={`${K}.forbidden.title`}
            descriptionKey={`${K}.forbidden.description`}
          />
        </SectionCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {header}

      <SectionCard flushBody>
        <div
          role="search"
          aria-label={t('payments:listFilters.label')}
          className="space-y-3 border-b border-border p-4"
        >
          <div className="max-w-full overflow-x-auto">
            <ToggleGroup
              type="single"
              value={filters.tab}
              onValueChange={(value) => {
                if (value) update({ tab: value as Tab });
              }}
              aria-label={t(`${K}.tabsLabel`)}
              className="inline-flex w-max justify-start rounded-md bg-muted p-1 text-muted-foreground"
            >
              {TABS.map((tab) => {
                const count = countFor(tab);
                return (
                  <ToggleGroupItem
                    key={tab}
                    value={tab}
                    className="h-9 whitespace-nowrap rounded-sm px-3 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                    data-testid={`academy-payments-tab-${tab}`}
                  >
                    {t(`${K}.tabs.${tab}`)}
                    {count !== undefined ? (
                      <Badge
                        variant={
                          tab === 'pending' && count > 0
                            ? 'default'
                            : 'secondary'
                        }
                        className="ms-2"
                        data-atlas-numeric="true"
                      >
                        {formatNumber(count, i18n.language as LanguageCode)}
                      </Badge>
                    ) : null}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <SearchInput
              value={filters.search}
              onValueChange={(search) => update({ search })}
              labelKey={`${K}.searchLabel`}
              className="w-full lg:max-w-md lg:flex-1"
            />
            <div className="space-y-1">
              <Label
                htmlFor="academy-payments-method"
                className="text-xs text-muted-foreground"
              >
                {t(`${K}.filters.method`)}
              </Label>
              <Select
                value={filters.methodType}
                onValueChange={(methodType) => update({ methodType })}
              >
                <SelectTrigger
                  id="academy-payments-method"
                  className="w-full sm:w-[180px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t(`${K}.filters.all`)}</SelectItem>
                  {ACADEMY_PAYMENT_METHOD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`payments:common.methodType.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="academy-payments-sort"
                className="text-xs text-muted-foreground"
              >
                {t(`${K}.filters.sort`)}
              </Label>
              <Select
                value={filters.sort}
                onValueChange={(sort) => update({ sort: sort as SortOption })}
              >
                <SelectTrigger
                  id="academy-payments-sort"
                  className="w-full sm:w-[200px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`${K}.sortOptions.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filtered ? (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 self-start sm:min-h-9 sm:self-auto"
                onClick={() =>
                  setFilters({ ...DEFAULT_FILTERS, tab: filters.tab })
                }
              >
                <X className="size-4" aria-hidden />
                {t(`${K}.filters.clear`)}
              </Button>
            ) : null}
          </div>
        </div>

        {payments.error ? (
          <div className="p-6">
            <ErrorState
              kind={payments.error.kind}
              requestId={payments.error.requestId}
              onRetry={() => void payments.refetch()}
            />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={payments.data?.items ?? []}
            isLoading={payments.isLoading}
            isBusy={payments.isFetching && payments.isPlaceholderData}
            pagination={totalItems > 0 ? pagination : undefined}
            emptyTitleKey={
              filtered
                ? `${K}.emptyFiltered.title`
                : `${K}.empty.${filters.tab}.title`
            }
            emptyDescriptionKey={
              filtered
                ? `${K}.emptyFiltered.description`
                : `${K}.empty.${filters.tab}.description`
            }
            getRowId={(payment) => payment.id}
            onRowSelect={(payment) => setOpenPayment(payment.id)}
          />
        )}
      </SectionCard>

      {!academyId ? (
        <EmptyState
          icon={Inbox}
          titleKey="payments:academyOrders.noAcademy.title"
          descriptionKey="payments:academyOrders.noAcademy.description"
        />
      ) : null}

      <AcademyPaymentReviewSheet
        academyId={academyId}
        paymentId={openPaymentId}
        locale={locale}
        onOpenChange={(open) => {
          if (!open) setOpenPayment(null);
        }}
      />
    </PageContainer>
  );
}
