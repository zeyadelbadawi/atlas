/**
 * Platform Founding Academies — B2 (`/dashboard/platform/founding-academies`).
 *
 * The Platform Owner's view of the Founding Academies programme: the seat
 * meter (taken of 20, started this week of 5), the members table with
 * server-side search, status filter, sort and pagination (kept in the
 * URL), a detail sheet with edit / family change / revoke and the audit
 * timeline, "Add founding academy", bulk "Email founders" and CSV export.
 *
 * The route guard hides the page; `PlatformOwnerGuard` and RLS on the API
 * are the actual control. Prices shown here are what the server decided.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { Award, Download, Loader2, Mail, Plus, SearchX, X } from 'lucide-react';
import { PageContainer, PageHeader } from '@components/layout';
import { EmptyState, ErrorState } from '@components/feedback';
import { Pagination, SearchInput, StatusBadge } from '@components/data-display';
import { SkeletonTable } from '@components/loading';
import { DataTable } from '@components/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@app/providers';
import { useDateFormatter, useLanguage, usePagination } from '@hooks';
import { formatNumber, toErrorsNamespaceKey } from '@utils';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import {
  usePlatformFoundingList,
  usePlatformFoundingSummary,
  useRevokeFounding,
} from '../hooks/usePlatformFounding';
import {
  platformFoundingService,
  type FoundingListQuery,
  type FoundingMembership,
  type FoundingMembershipDetail,
  type FoundingSortField,
  type FoundingStatus,
} from '../services/PlatformFoundingService';
import {
  FOUNDING_K,
  FOUNDING_STATUSES,
  downloadCsv,
  foundingMoney,
  foundingPlanName,
  foundingStatusTone,
} from '../utils/founding.utils';
import { FoundingSeatMeter } from '../components/FoundingSeatMeter';
import { FoundingAcademySheet } from '../components/FoundingAcademySheet';
import { AddFoundingAcademyDialog } from '../components/AddFoundingAcademyDialog';
import { FoundingEmailDialog } from '../components/FoundingEmailDialog';

const K = FOUNDING_K;
const ALL = 'all';
const PAGE_SIZE_DEFAULT = 20;
const SORTS = [
  'seatNumber:asc',
  'createdAt:desc',
  'lockEndsAt:asc',
  'organizationName:asc',
] as const;
type SortOption = (typeof SORTS)[number];

function useFoundingFilters() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status');
  const sort = params.get('sort');
  const filters = {
    search: params.get('search') ?? '',
    status: (FOUNDING_STATUSES as readonly string[]).includes(status ?? '')
      ? (status as FoundingStatus)
      : undefined,
    sort: (SORTS as readonly string[]).includes(sort ?? '')
      ? (sort as SortOption)
      : SORTS[0],
    page: Math.max(1, Number(params.get('page')) || 1),
    pageSize: Math.min(
      100,
      Math.max(1, Number(params.get('pageSize')) || PAGE_SIZE_DEFAULT)
    ),
  };
  const update = (
    changes: Record<string, string | undefined>,
    resetPage = true
  ) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === undefined || value === '') next.delete(key);
          else next.set(key, value);
        }
        if (resetPage) next.delete('page');
        return next;
      },
      { replace: true }
    );
  return { filters, update };
}

export default function PlatformFoundingAcademiesPage(): JSX.Element {
  const { t, i18n } = useTranslation();
  const { language } = useLanguage();
  const fmt = useDateFormatter();
  const { notifySuccess, notifyError } = useToast();
  const { filters, update } = useFoundingFilters();
  const hasFilters = Boolean(filters.search || filters.status);

  const query = useMemo<FoundingListQuery>(() => {
    const [field, direction] = filters.sort.split(':') as [
      FoundingSortField,
      'asc' | 'desc',
    ];
    return {
      pagination: { page: filters.page, pageSize: filters.pageSize },
      sort: { field, direction },
      ...(filters.search ? { search: filters.search } : {}),
      filters: filters.status ? { status: filters.status } : {},
    };
  }, [
    filters.page,
    filters.pageSize,
    filters.search,
    filters.sort,
    filters.status,
  ]);

  const listQuery = usePlatformFoundingList(query);
  const summaryQuery = usePlatformFoundingSummary();
  const revoke = useRevokeFounding();

  const pagination = usePagination({
    totalItems: listQuery.data?.pagination.totalItems ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
    onPageChange: (page) => update({ page: String(page) }, false),
    onPageSizeChange: (pageSize) => update({ pageSize: String(pageSize) }),
  });

  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toRevoke, setToRevoke] = useState<FoundingMembershipDetail | null>(
    null
  );
  const [revokeReason, setRevokeReason] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  const rows = listQuery.data?.items ?? [];
  const lang = i18n.language;

  // Only active members can be emailed; drop anything that left the page's active set.
  useEffect(() => {
    const active = new Set(
      rows.filter((row) => row.status === 'active').map((row) => row.id)
    );
    setSelectedIds((current) => {
      const next = current.filter((id) => active.has(id));
      return next.length === current.length ? current : next;
    });
  }, [rows]);

  const openMembership = (membership: { id: string }) => {
    setOpenId(membership.id);
    setSheetOpen(true);
  };

  const toggle = (id: string, checked: boolean) =>
    setSelectedIds((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((value) => value !== id)
    );
  const selectableIds = rows
    .filter((row) => row.status === 'active')
    .map((row) => row.id);
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.includes(id));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const text = await platformFoundingService.exportCsv();
      downloadCsv(
        `founding-academies-${new Date().toISOString().slice(0, 10)}.csv`,
        text
      );
    } catch {
      notifyError(`${K}.toasts.exportFailed`);
    } finally {
      setExporting(false);
    }
  };

  const confirmRevoke = () => {
    if (!toRevoke || revokeReason.trim().length < 3) return;
    revoke.mutate(
      { id: toRevoke.id, reason: revokeReason.trim() },
      {
        onSuccess: (membership) => {
          notifySuccess(`${K}.toasts.revoked`, undefined, {
            name: membership.organization.name,
          });
          setToRevoke(null);
          setRevokeReason('');
        },
        onError: (error) =>
          notifyError(
            `${K}.toasts.failed`,
            toErrorsNamespaceKey(error.messageKey)
          ),
      }
    );
  };

  const n = (value: number) => formatNumber(value, language);

  const columns = useMemo<ColumnDef<FoundingMembership, unknown>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            checked={allSelected}
            disabled={selectableIds.length === 0}
            onCheckedChange={(value) =>
              setSelectedIds((current) =>
                value === true
                  ? [...new Set([...current, ...selectableIds])]
                  : current.filter((id) => !selectableIds.includes(id))
              )
            }
            aria-label={t(`${K}.table.selectAll`)}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Checkbox
              checked={selectedIds.includes(row.original.id)}
              disabled={row.original.status !== 'active'}
              onCheckedChange={(value) =>
                toggle(row.original.id, value === true)
              }
              aria-label={t(`${K}.table.selectRow`, {
                name: row.original.organization.name,
              })}
            />
          </span>
        ),
      },
      {
        id: 'academy',
        header: t(`${K}.table.academy`),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block max-w-[14rem]">
            <span
              className="block truncate font-medium text-foreground"
              dir="auto"
            >
              {row.original.organization.name}
            </span>
            <span
              className="block truncate text-xs text-muted-foreground"
              dir="auto"
            >
              {row.original.owner.name}
            </span>
          </span>
        ),
      },
      {
        id: 'plan',
        header: t(`${K}.table.plan`),
        enableSorting: false,
        cell: ({ row }) => foundingPlanName(row.original.plan, lang),
      },
      {
        id: 'lockedPrice',
        header: t(`${K}.table.lockedPrice`),
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className="whitespace-nowrap tabular-nums"
            dir="ltr"
            data-ltr-content
          >
            {foundingMoney(row.original.lockedPrice, lang)}
          </span>
        ),
      },
      {
        id: 'seat',
        header: t(`${K}.table.seat`),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{n(row.original.seatNumber)}</span>
        ),
      },
      {
        id: 'lockEnds',
        header: t(`${K}.table.lockEnds`),
        enableSorting: false,
        cell: ({ row }) => (
          <time
            dateTime={row.original.lockEndsAt}
            className="whitespace-nowrap"
          >
            {fmt.date(row.original.lockEndsAt)}
          </time>
        ),
      },
      {
        id: 'periodEnds',
        header: t(`${K}.table.periodEnds`),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.subscription?.currentPeriodEnd ? (
            <time
              dateTime={row.original.subscription.currentPeriodEnd}
              className="whitespace-nowrap"
            >
              {fmt.date(row.original.subscription.currentPeriodEnd)}
            </time>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'status',
        header: t(`${K}.table.status`),
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge
            labelKey={`${K}.status.${row.original.status}`}
            tone={foundingStatusTone(row.original.status)}
          />
        ),
      },
      {
        id: 'hours',
        header: t(`${K}.table.hours`),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {t(`${K}.hoursOf`, {
              used: n(row.original.conciergeHoursUsed),
              cap: n(row.original.conciergeHoursCap),
            })}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, lang, language, fmt, selectedIds, allSelected, selectableIds.join(',')]
  );

  const breadcrumbs: BreadcrumbItem[] = [
    {
      labelKey: 'navigation:items.platformDashboard',
      path: DASHBOARD_ROUTES.platform,
    },
    { labelKey: `${K}.title` },
  ];

  const renderBody = (): JSX.Element => {
    if (listQuery.error) {
      return (
        <div className="p-6">
          <ErrorState
            kind={listQuery.error.kind}
            onRetry={() => void listQuery.refetch()}
          />
        </div>
      );
    }
    if (listQuery.isLoading) {
      return (
        <div aria-busy="true" className="p-4">
          <SkeletonTable columns={8} />
        </div>
      );
    }
    if (rows.length === 0) {
      return (
        <div className="p-4">
          {hasFilters ? (
            <EmptyState
              icon={SearchX}
              titleKey={`${K}.noResults.title`}
              descriptionKey={`${K}.noResults.description`}
              primaryAction={{
                labelKey: `${K}.filters.clear`,
                onAction: () =>
                  update({ search: undefined, status: undefined }),
                icon: X,
              }}
            />
          ) : (
            <EmptyState
              icon={Award}
              titleKey={`${K}.empty.title`}
              descriptionKey={`${K}.empty.description`}
              primaryAction={{
                labelKey: `${K}.actions.add`,
                onAction: () => setAddOpen(true),
                icon: Plus,
              }}
            />
          )}
        </div>
      );
    }
    return (
      <>
        <section
          aria-label={t(`${K}.table.caption`)}
          className="hidden overflow-x-auto md:block"
        >
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            onRowSelect={openMembership}
          />
        </section>
        <ul
          aria-label={t(`${K}.table.caption`)}
          className="divide-y divide-border md:hidden"
        >
          {rows.map((row) => (
            <li key={row.id} className="flex items-start gap-3 p-4">
              <Checkbox
                className="mt-1"
                checked={selectedIds.includes(row.id)}
                disabled={row.status !== 'active'}
                onCheckedChange={(value) => toggle(row.id, value === true)}
                aria-label={t(`${K}.table.selectRow`, {
                  name: row.organization.name,
                })}
              />
              <button
                type="button"
                onClick={() => openMembership(row)}
                className="min-w-0 flex-1 space-y-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className="min-w-0 truncate font-medium text-foreground"
                    dir="auto"
                  >
                    {row.organization.name}
                  </span>
                  <StatusBadge
                    labelKey={`${K}.status.${row.status}`}
                    tone={foundingStatusTone(row.status)}
                    className="shrink-0"
                  />
                </span>
                <span className="block text-sm text-muted-foreground">
                  {t(`${K}.seatLabel`, { seat: n(row.seatNumber) })} ·{' '}
                  {foundingPlanName(row.plan, lang)} ·{' '}
                  <span dir="ltr" data-ltr-content>
                    {foundingMoney(row.lockedPrice, lang)}
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t(`${K}.mobileLockEnds`, { date: fmt.date(row.lockEndsAt) })}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Pagination
          pagination={pagination}
          summary={t(`${K}.resultRange`, {
            from: n(pagination.rangeStart),
            to: n(pagination.rangeEnd),
            total: n(pagination.totalItems),
          })}
        />
      </>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        titleKey={`${K}.title`}
        descriptionKey={`${K}.subtitle`}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void exportCsv()}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              {t(`${K}.actions.export`)}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEmailOpen(true)}
            >
              <Mail className="size-4" aria-hidden />
              {t(`${K}.actions.email`)}
            </Button>
            <Button type="button" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" aria-hidden />
              {t(`${K}.actions.add`)}
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <FoundingSeatMeter
          summary={summaryQuery.data}
          isLoading={summaryQuery.isLoading}
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <SearchInput
            value={filters.search}
            onValueChange={(value) => update({ search: value || undefined })}
            labelKey={`${K}.searchLabel`}
            className="w-full lg:max-w-sm lg:flex-1"
          />
          <Select
            value={filters.status ?? ALL}
            onValueChange={(value) =>
              update({ status: value === ALL ? undefined : value })
            }
          >
            <SelectTrigger
              className="w-full sm:w-[180px]"
              aria-label={t(`${K}.filters.status`)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {t(`${K}.filters.allStatuses`)}
              </SelectItem>
              {FOUNDING_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`${K}.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.sort}
            onValueChange={(value) =>
              update({ sort: value === SORTS[0] ? undefined : value })
            }
          >
            <SelectTrigger
              className="w-full sm:w-[220px]"
              aria-label={t(`${K}.sort.label`)}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {t(`${K}.sort.${sort.replace(':', '_')}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedIds.length > 0 ? (
          <div
            role="region"
            aria-label={t(`${K}.bulk.label`)}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2"
          >
            <span
              className="text-sm font-medium text-foreground"
              aria-live="polite"
            >
              {t(`${K}.bulk.selected`, {
                count: selectedIds.length,
                formatted: n(selectedIds.length),
              })}
            </span>
            <Button type="button" size="sm" onClick={() => setEmailOpen(true)}>
              <Mail className="size-4" aria-hidden />
              {t(`${K}.bulk.email`)}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              {t(`${K}.bulk.clear`)}
            </Button>
          </div>
        ) : null}

        <Card
          ref={resultsRef}
          tabIndex={-1}
          className="focus-visible:outline-none"
        >
          <CardContent className="p-0">{renderBody()}</CardContent>
        </Card>
      </div>

      <FoundingAcademySheet
        membershipId={openId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onRequestRevoke={(membership) => {
          setRevokeReason('');
          setToRevoke(membership);
        }}
      />

      <AddFoundingAcademyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(membership) => openMembership(membership)}
      />

      <FoundingEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        selectedIds={selectedIds}
        onSent={() => setSelectedIds([])}
      />

      <AlertDialog
        open={toRevoke !== null}
        onOpenChange={(open) => {
          if (!open && !revoke.isPending) setToRevoke(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(`${K}.revoke.title`)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(`${K}.revoke.description`, {
                name: toRevoke?.organization.name ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="founding-revoke-reason">
              {t(`${K}.revoke.reason`)}
            </Label>
            <Textarea
              id="founding-revoke-reason"
              rows={3}
              maxLength={500}
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              dir="auto"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoke.isPending}>
              {t(`${K}.cancel`)}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={revoke.isPending || revokeReason.trim().length < 3}
              onClick={(event) => {
                event.preventDefault();
                confirmRevoke();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t(`${K}.revoke.confirm`)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
